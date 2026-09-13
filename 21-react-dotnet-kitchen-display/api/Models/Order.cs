namespace Kds.Api.Models;

public enum OrderStatus
{
    Received,
    Preparing,
    Ready,
    Served,
    Cancelled,
}

public static class OrderTransitions
{
    private static readonly Dictionary<OrderStatus, OrderStatus[]> Allowed = new()
    {
        [OrderStatus.Received] = [OrderStatus.Preparing, OrderStatus.Cancelled],
        [OrderStatus.Preparing] = [OrderStatus.Ready, OrderStatus.Cancelled],
        [OrderStatus.Ready] = [OrderStatus.Served],
        [OrderStatus.Served] = [],
        [OrderStatus.Cancelled] = [],
    };

    public static bool CanTransition(OrderStatus from, OrderStatus to) => Allowed[from].Contains(to);
    public static IReadOnlyList<OrderStatus> Next(OrderStatus from) => Allowed[from];
    public static bool IsActive(OrderStatus s) => s is OrderStatus.Received or OrderStatus.Preparing or OrderStatus.Ready;
}

public sealed class Order
{
    public int Id { get; set; }
    public string TableCode { get; set; } = "";
    public OrderStatus Status { get; set; } = OrderStatus.Received;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ReadyAt { get; set; }
    public DateTime? ServedAt { get; set; }
    public List<OrderLine> Lines { get; set; } = [];
}

public sealed class OrderLine
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int MenuItemId { get; set; }
    public MenuItem MenuItem { get; set; } = null!;
    public int Qty { get; set; }
    // Price snapshot at ordering time so later menu edits do not rewrite history.
    public decimal UnitPrice { get; set; }
}
