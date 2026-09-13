using Kds.Api.Persistence;
using Kds.Api.Hubs;
using Kds.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kds.Api.Endpoints;

public static class MenuEndpoints
{
    public static void MapMenuEndpoints(this IEndpointRouteBuilder app)
    {
        var pub = app.MapGroup("/api/menu").WithTags("Menu");
        pub.MapGet("/", PublicMenu);

        var admin = app.MapGroup("/api/menu/admin").WithTags("Menu (admin)").RequireAuthorization("AdminOnly");
        admin.MapGet("/", AdminList);
        admin.MapPost("/", Create);
        admin.MapPut("/{id:int}", Update);
        admin.MapDelete("/{id:int}", Delete);
    }

    private static async Task<IResult> PublicMenu(AppDbContext db) =>
        Results.Ok(await db.MenuItems.Where(m => m.IsAvailable).OrderBy(m => m.Category).ThenBy(m => m.Name).Select(m => m.ToDto()).ToListAsync());

    private static async Task<IResult> AdminList(AppDbContext db) =>
        Results.Ok(await db.MenuItems.OrderBy(m => m.Category).ThenBy(m => m.Name).Select(m => m.ToDto()).ToListAsync());

    private static async Task<IResult> Create(MenuItemRequest req, AppDbContext db, OrderBroadcaster bus)
    {
        var errors = Validate(req);
        if (errors.Any) return errors.ToResult();

        var item = new MenuItem { Name = req.Name!.Trim(), Category = req.Category!.Trim(), Price = req.Price!.Value, IsAvailable = req.IsAvailable ?? true };
        db.MenuItems.Add(item);
        await db.SaveChangesAsync();
        await bus.MenuChanged("created", item.Id);
        return Results.Created($"/api/menu/admin/{item.Id}", item.ToDto());
    }

    private static async Task<IResult> Update(int id, MenuItemRequest req, AppDbContext db, OrderBroadcaster bus)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return Problems.NotFound($"Menu item {id} does not exist.");
        var errors = Validate(req);
        if (errors.Any) return errors.ToResult();

        item.Name = req.Name!.Trim();
        item.Category = req.Category!.Trim();
        item.Price = req.Price!.Value;
        item.IsAvailable = req.IsAvailable ?? item.IsAvailable;
        await db.SaveChangesAsync();
        await bus.MenuChanged("updated", item.Id);
        return Results.Ok(item.ToDto());
    }

    private static async Task<IResult> Delete(int id, AppDbContext db, OrderBroadcaster bus)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return Problems.NotFound($"Menu item {id} does not exist.");
        if (await db.OrderLines.AnyAsync(l => l.MenuItemId == id))
            return Problems.Conflict("This item appears on existing orders; mark it unavailable instead of deleting it.");

        db.MenuItems.Remove(item);
        await db.SaveChangesAsync();
        await bus.MenuChanged("deleted", id);
        return Results.NoContent();
    }

    private static Problems.Errors Validate(MenuItemRequest req)
    {
        var errors = new Problems.Errors();
        if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Trim().Length > 80) errors.Add("name", "Name is required (max 80 characters).");
        if (string.IsNullOrWhiteSpace(req.Category) || req.Category.Trim().Length > 40) errors.Add("category", "Category is required (max 40 characters).");
        if (req.Price is null || req.Price <= 0 || req.Price > 100000) errors.Add("price", "Price must be between 0.01 and 100000.");
        return errors;
    }
}
