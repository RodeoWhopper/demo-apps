using System.ComponentModel.DataAnnotations;
using Helpdesk.Persistence;
using Helpdesk.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Helpdesk.Pages.Tickets;

[Authorize]
public class DetailsModel(AppDbContext db, UserManager<AppUser> userManager) : PageModel
{
    public Ticket Ticket { get; private set; } = default!;
    public bool IsStaff { get; private set; }
    public string CurrentUserId { get; private set; } = string.Empty;

    [BindProperty]
    [Required(ErrorMessage = "Yorum boş olamaz"), StringLength(2000)]
    public string? CommentBody { get; set; }

    public async Task<IActionResult> OnGetAsync(int id)
    {
        var result = await LoadAsync(id);
        return result ?? Page();
    }

    public async Task<IActionResult> OnPostCommentAsync(int id)
    {
        var result = await LoadAsync(id);
        if (result is not null) return result;

        if (string.IsNullOrWhiteSpace(CommentBody))
        {
            ModelState.AddModelError(nameof(CommentBody), "Yorum boş olamaz");
            return Page();
        }

        db.TicketComments.Add(new TicketComment { TicketId = id, AuthorId = CurrentUserId, Body = CommentBody.Trim() });
        Ticket.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        TempData["Message"] = "Yorum eklendi.";
        return RedirectToPage(new { id });
    }

    /// <summary>Only Agent/Admin may change status; requesters get 403.</summary>
    public async Task<IActionResult> OnPostStatusAsync(int id, TicketStatus status)
    {
        var result = await LoadAsync(id);
        if (result is not null) return result;
        if (!IsStaff) return Forbid();

        Ticket.Status = status;
        Ticket.UpdatedAt = DateTime.UtcNow;
        if (status == TicketStatus.InProgress && Ticket.AssigneeId is null)
            Ticket.AssigneeId = CurrentUserId;
        await db.SaveChangesAsync();
        TempData["Message"] = $"Durum \"{Labels.Status(status)}\" olarak güncellendi.";
        return RedirectToPage(new { id });
    }

    public async Task<IActionResult> OnPostAssignAsync(int id, bool clear = false)
    {
        var result = await LoadAsync(id);
        if (result is not null) return result;
        if (!IsStaff) return Forbid();

        Ticket.AssigneeId = clear ? null : CurrentUserId;
        Ticket.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        TempData["Message"] = clear ? "Atama kaldırıldı." : "Bilet size atandı.";
        return RedirectToPage(new { id });
    }

    private async Task<IActionResult?> LoadAsync(int id)
    {
        IsStaff = User.IsInRole("Admin") || User.IsInRole("Agent");
        CurrentUserId = userManager.GetUserId(User)!;

        var ticket = await db.Tickets
            .Include(t => t.Category)
            .Include(t => t.Requester)
            .Include(t => t.Assignee)
            .Include(t => t.Comments.OrderBy(c => c.CreatedAt)).ThenInclude(c => c.Author)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();
        if (!IsStaff && ticket.RequesterId != CurrentUserId) return Forbid();

        Ticket = ticket;
        return null;
    }
}
