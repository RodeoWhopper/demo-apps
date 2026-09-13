using System.ComponentModel.DataAnnotations;
using Helpdesk.Persistence;
using Helpdesk.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace Helpdesk.Pages.Tickets;

[Authorize]
public class CreateModel(AppDbContext db, UserManager<AppUser> userManager) : PageModel
{
    [BindProperty]
    public InputModel Input { get; set; } = new();

    public SelectList CategoryOptions { get; private set; } = default!;

    public class InputModel
    {
        [Required(ErrorMessage = "Başlık gerekli"), StringLength(120)]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Açıklama gerekli"), StringLength(4000, MinimumLength = 10, ErrorMessage = "Açıklama en az 10 karakter olmalı")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Kategori seçin")]
        public int? CategoryId { get; set; }

        public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    }

    public async Task OnGetAsync() => await LoadOptionsAsync();

    public async Task<IActionResult> OnPostAsync()
    {
        if (Input.CategoryId is not null && !await db.Categories.AnyAsync(c => c.Id == Input.CategoryId))
            ModelState.AddModelError("Input.CategoryId", "Geçersiz kategori");

        if (!ModelState.IsValid)
        {
            await LoadOptionsAsync();
            return Page();
        }

        var ticket = new Ticket
        {
            Title = Input.Title.Trim(),
            Description = Input.Description.Trim(),
            CategoryId = Input.CategoryId!.Value,
            Priority = Input.Priority,
            RequesterId = userManager.GetUserId(User)!,
        };
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync();

        TempData["Message"] = $"#{ticket.Id} numaralı bilet açıldı.";
        return RedirectToPage("/Tickets/Details", new { id = ticket.Id });
    }

    private async Task LoadOptionsAsync()
    {
        var categories = await db.Categories.OrderBy(c => c.Name).ToListAsync();
        CategoryOptions = new SelectList(categories, nameof(Category.Id), nameof(Category.Name), Input.CategoryId);
    }
}
