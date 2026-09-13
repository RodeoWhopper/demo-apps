namespace Kds.Api.Models;

// ---- auth -----------------------------------------------------------------
public sealed record LoginRequest(string? Email, string? Password);
public sealed record UserDto(int Id, string Email, string Role, DateTime CreatedAt);
public sealed record AuthResponse(string AccessToken, DateTime ExpiresAt, UserDto User);
public sealed record CreateUserRequest(string? Email, string? Password, string? Role);

// ---- menu -----------------------------------------------------------------
public sealed record MenuItemDto(int Id, string Name, string Category, decimal Price, bool IsAvailable);
public sealed record MenuItemRequest(string? Name, string? Category, decimal? Price, bool? IsAvailable);
public sealed record MenuChangedEvent(string Action, int ItemId);

// ---- orders ---------------------------------------------------------------
public sealed record OrderLineRequest(int MenuItemId, int Qty);
public sealed record CreateOrderRequest(string? TableCode, string? Note, List<OrderLineRequest>? Lines);
public sealed record UpdateStatusRequest(string? Status);
public sealed record OrderLineDto(int MenuItemId, string Name, int Qty, decimal UnitPrice);
public sealed record OrderDto(
    int Id,
    string TableCode,
    OrderStatus Status,
    string? Note,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ReadyAt,
    DateTime? ServedAt,
    decimal Total,
    List<OrderLineDto> Lines);

public sealed record BoardOrderDto(int Id, string TableCode, OrderStatus Status, DateTime CreatedAt, DateTime UpdatedAt, int ItemCount);
public sealed record BoardDto(DateTime GeneratedAt, List<BoardOrderDto> Orders);

public sealed record StatsDto(DateTime GeneratedAt, Dictionary<string, int> Today, double? AvgPrepMinutes, decimal RevenueToday, int ActiveOrders);

public static class Mappers
{
    public static UserDto ToDto(this User u) => new(u.Id, u.Email, u.Role, u.CreatedAt);

    public static MenuItemDto ToDto(this MenuItem m) => new(m.Id, m.Name, m.Category, m.Price, m.IsAvailable);

    public static OrderDto ToDto(this Order o) => new(
        o.Id,
        o.TableCode,
        o.Status,
        o.Note,
        o.CreatedAt,
        o.UpdatedAt,
        o.ReadyAt,
        o.ServedAt,
        o.Lines.Sum(l => l.Qty * l.UnitPrice),
        o.Lines.Select(l => new OrderLineDto(l.MenuItemId, l.MenuItem.Name, l.Qty, l.UnitPrice)).ToList());

    public static BoardOrderDto ToBoardDto(this Order o) =>
        new(o.Id, o.TableCode, o.Status, o.CreatedAt, o.UpdatedAt, o.Lines.Sum(l => l.Qty));
}
