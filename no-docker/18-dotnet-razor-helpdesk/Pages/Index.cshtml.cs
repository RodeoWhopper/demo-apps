using Helpdesk.Persistence;
using Helpdesk.Models;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Helpdesk.Pages;

public class IndexModel(AppDbContext db) : PageModel
{
    public int OpenCount { get; private set; }
    public int InProgressCount { get; private set; }
    public int ResolvedThisWeek { get; private set; }
    public List<(Category Category, int Count)> Categories { get; private set; } = new();

    public async Task OnGetAsync()
    {
        OpenCount = await db.Tickets.CountAsync(t => t.Status == TicketStatus.Open);
        InProgressCount = await db.Tickets.CountAsync(t => t.Status == TicketStatus.InProgress);
        var weekAgo = DateTime.UtcNow.AddDays(-7);
        ResolvedThisWeek = await db.Tickets.CountAsync(t =>
            (t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed) && t.UpdatedAt >= weekAgo);
        Categories = (await db.Categories
                .Select(c => new { c, Count = c.Tickets.Count(t => t.Status != TicketStatus.Closed) })
                .OrderBy(x => x.c.Name)
                .ToListAsync())
            .Select(x => (x.c, x.Count)).ToList();
    }
}
