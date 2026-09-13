using System.Text.RegularExpressions;
using Kds.Api.Persistence;
using Kds.Api.Hubs;
using Kds.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kds.Api.Endpoints;

public static partial class OrderEndpoints
{
    [GeneratedRegex("^[A-Za-z0-9-]{1,12}$")]
    private static partial Regex TableCodeRegex();

    public static void MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").WithTags("Orders");

        // public / customer
        g.MapPost("/orders", Create).RequireRateLimiting("orders");
        g.MapGet("/orders/{id:int}", GetOne);
        g.MapGet("/board", Board);

        // kitchen staff
        g.MapGet("/orders", List).RequireAuthorization("StaffOrAdmin");
        g.MapPatch("/orders/{id:int}/status", UpdateStatus).RequireAuthorization("StaffOrAdmin");
        g.MapGet("/stats", Stats).RequireAuthorization("StaffOrAdmin");
    }

    private static IQueryable<Order> WithLines(AppDbContext db) =>
        db.Orders.Include(o => o.Lines).ThenInclude(l => l.MenuItem).AsSplitQuery();

    private static async Task<IResult> Create(CreateOrderRequest req, AppDbContext db, OrderBroadcaster bus)
    {
        var errors = new Problems.Errors();
        var tableCode = req.TableCode?.Trim().ToUpperInvariant() ?? "";
        if (!TableCodeRegex().IsMatch(tableCode)) errors.Add("tableCode", "Table code must be 1-12 letters, digits or dashes.");
        if (req.Note is { Length: > 200 }) errors.Add("note", "Note must be at most 200 characters.");
        var lines = req.Lines ?? [];
        if (lines.Count == 0) errors.Add("lines", "At least one line is required.");
        if (lines.Count > 20) errors.Add("lines", "At most 20 lines per order.");
        if (lines.Any(l => l.Qty < 1 || l.Qty > 20)) errors.Add("lines", "Each quantity must be between 1 and 20.");
        if (lines.Select(l => l.MenuItemId).Distinct().Count() != lines.Count) errors.Add("lines", "Duplicate menu items; merge quantities instead.");
        if (errors.Any) return errors.ToResult();

        var ids = lines.Select(l => l.MenuItemId).ToList();
        var items = await db.MenuItems.Where(m => ids.Contains(m.Id)).ToDictionaryAsync(m => m.Id);
        foreach (var id in ids)
        {
            if (!items.TryGetValue(id, out var item)) errors.Add("lines", $"Menu item {id} does not exist.");
            else if (!item.IsAvailable) errors.Add("lines", $"'{item.Name}' is currently unavailable.");
        }
        if (errors.Any) return errors.ToResult();

        var now = DateTime.UtcNow;
        var order = new Order
        {
            TableCode = tableCode,
            Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
            Status = OrderStatus.Received,
            CreatedAt = now,
            UpdatedAt = now,
            Lines = lines.Select(l => new OrderLine { MenuItemId = l.MenuItemId, MenuItem = items[l.MenuItemId], Qty = l.Qty, UnitPrice = items[l.MenuItemId].Price }).ToList(),
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var dto = order.ToDto();
        await bus.OrderCreated(dto);
        return Results.Created($"/api/orders/{order.Id}", dto);
    }

    private static async Task<IResult> GetOne(int id, AppDbContext db)
    {
        var order = await WithLines(db).SingleOrDefaultAsync(o => o.Id == id);
        return order is null ? Problems.NotFound($"Order {id} does not exist.") : Results.Ok(order.ToDto());
    }

    // Big-screen board: active orders always, finished ones only from today. No notes or other free text.
    private static async Task<IResult> Board(AppDbContext db)
    {
        var today = DateTime.UtcNow.Date;
        var orders = await db.Orders
            .Include(o => o.Lines)
            .Where(o => o.CreatedAt >= today || o.Status == OrderStatus.Received || o.Status == OrderStatus.Preparing || o.Status == OrderStatus.Ready)
            .OrderBy(o => o.CreatedAt)
            .ToListAsync();
        return Results.Ok(new BoardDto(DateTime.UtcNow, orders.Select(o => o.ToBoardDto()).ToList()));
    }

    private static async Task<IResult> List(string? status, AppDbContext db)
    {
        var query = WithLines(db);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<OrderStatus>(status, true, out var parsed))
                return Problems.BadRequest($"Unknown status '{status}'. Allowed: {string.Join(", ", Enum.GetNames<OrderStatus>())}.");
            query = query.Where(o => o.Status == parsed);
        }
        var orders = await query.OrderByDescending(o => o.CreatedAt).Take(200).ToListAsync();
        return Results.Ok(orders.Select(o => o.ToDto()).ToList());
    }

    private static async Task<IResult> UpdateStatus(int id, UpdateStatusRequest req, AppDbContext db, OrderBroadcaster bus)
    {
        if (!Enum.TryParse<OrderStatus>(req.Status, true, out var target))
            return Problems.BadRequest($"Unknown status '{req.Status}'. Allowed: {string.Join(", ", Enum.GetNames<OrderStatus>())}.");

        var order = await WithLines(db).SingleOrDefaultAsync(o => o.Id == id);
        if (order is null) return Problems.NotFound($"Order {id} does not exist.");
        if (!OrderTransitions.CanTransition(order.Status, target))
        {
            var next = OrderTransitions.Next(order.Status);
            return Problems.Conflict(next.Count == 0
                ? $"Order {id} is {order.Status}, which is final."
                : $"Order {id} is {order.Status}; allowed next statuses: {string.Join(", ", next)}.");
        }

        var now = DateTime.UtcNow;
        order.Status = target;
        order.UpdatedAt = now;
        if (target == OrderStatus.Ready) order.ReadyAt = now;
        if (target == OrderStatus.Served) order.ServedAt = now;
        await db.SaveChangesAsync();

        var dto = order.ToDto();
        await bus.OrderUpdated(dto);
        return Results.Ok(dto);
    }

    private static async Task<IResult> Stats(AppDbContext db)
    {
        var today = DateTime.UtcNow.Date;
        var orders = await db.Orders.Include(o => o.Lines).Where(o => o.CreatedAt >= today).ToListAsync();

        var counts = Enum.GetValues<OrderStatus>().ToDictionary(s => s.ToString().ToLowerInvariant(), s => orders.Count(o => o.Status == s));
        counts["total"] = orders.Count;

        var prepTimes = orders.Where(o => o.ReadyAt is not null).Select(o => (o.ReadyAt!.Value - o.CreatedAt).TotalMinutes).ToList();
        double? avgPrep = prepTimes.Count == 0 ? null : Math.Round(prepTimes.Average(), 1);
        var revenue = orders.Where(o => o.Status == OrderStatus.Served).Sum(o => o.Lines.Sum(l => l.Qty * l.UnitPrice));
        var active = await db.Orders.CountAsync(o => o.Status == OrderStatus.Received || o.Status == OrderStatus.Preparing || o.Status == OrderStatus.Ready);

        return Results.Ok(new StatsDto(DateTime.UtcNow, counts, avgPrep, revenue, active));
    }
}
