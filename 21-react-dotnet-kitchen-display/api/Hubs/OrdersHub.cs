using Kds.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Kds.Api.Hubs;

// Public, read-only hub: the board and customer tracking pages connect anonymously.
// Server -> client events: orderCreated(OrderDto), orderUpdated(OrderDto), menuChanged(MenuChangedEvent).
[AllowAnonymous]
public sealed class OrdersHub(ILogger<OrdersHub> log) : Hub
{
    public override Task OnConnectedAsync()
    {
        log.LogInformation("Hub client connected {ConnectionId}", Context.ConnectionId);
        return base.OnConnectedAsync();
    }

    // Tiny client-callable diagnostic method.
    public string Ping() => "pong";
}

public sealed class OrderBroadcaster(IHubContext<OrdersHub> hub)
{
    public Task OrderCreated(OrderDto order) => hub.Clients.All.SendAsync("orderCreated", order);
    public Task OrderUpdated(OrderDto order) => hub.Clients.All.SendAsync("orderUpdated", order);
    public Task MenuChanged(string action, int itemId) => hub.Clients.All.SendAsync("menuChanged", new MenuChangedEvent(action, itemId));
}
