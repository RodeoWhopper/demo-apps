using Helpdesk.Persistence;
using Helpdesk.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Helpdesk.Pages.Tickets;

[Authorize]
public class IndexModel(AppDbContext db, UserManager<AppUser> userManager) : PageModel
{
    [BindProperty(SupportsGet = true)] public TicketStatus? Status { get; set; }
    [BindProperty(SupportsGet = true)] public TicketPriority? Priority { get; set; }
    [BindProperty(SupportsGet = true)] public string? Q { get; set; }

    public List<Ticket> Tickets { get; private set; } = new();
    public bool IsStaff { get; private set; }

    public async Task OnGetAsync()
    {
        IsStaff = User.IsInRole("Admin") || User.IsInRole("Agent");
        var userId = userManager.GetUserId(User)!;

        IQueryable<Ticket> query = db.Tickets
            .Include(t => t.Category)
            .Include(t => t.Requester)
            .Include(t => t.Assignee)
            .AsNoTracking();

        // Requesters only ever see their own tickets; staff see everything.
        if (!IsStaff)
            query = query.Where(t => t.RequesterId == userId);
        if (Status is not null)
            query = query.Where(t => t.Status == Status);
        if (Priority is not null)
            query = query.Where(t => t.Priority == Priority);
        if (!string.IsNullOrWhiteSpace(Q))
        {
            var q = Q.Trim();
            query = query.Where(t => EF.Functions.Like(t.Title, $"%{q}%") || EF.Functions.Like(t.Description, $"%{q}%"));
        }

        Tickets = await query
            .OrderBy(t => t.Status == TicketStatus.Closed)
            .ThenByDescending(t => t.Priority)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();
    }
}
