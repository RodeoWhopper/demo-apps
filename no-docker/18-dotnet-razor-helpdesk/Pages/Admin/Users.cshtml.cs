using Helpdesk.Persistence;
using Helpdesk.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Helpdesk.Pages.Admin;

/// <summary>
/// Protected twice on purpose: the /Admin folder convention in Program.cs (AdminOnly policy)
/// and this attribute – either one alone is enough.
/// </summary>
[Authorize(Roles = "Admin")]
public class UsersModel(UserManager<AppUser> userManager, AppDbContext db) : PageModel
{
    public record Row(AppUser User, string Role, int Tickets);

    public List<Row> Rows { get; private set; } = new();
    public string CurrentUserId { get; private set; } = string.Empty;

    public async Task OnGetAsync()
    {
        CurrentUserId = userManager.GetUserId(User)!;
        var users = await userManager.Users.OrderBy(u => u.DisplayName).ToListAsync();
        var ticketCounts = await db.Tickets.GroupBy(t => t.RequesterId)
            .Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count);

        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            Rows.Add(new Row(user, roles.FirstOrDefault() ?? "–", ticketCounts.GetValueOrDefault(user.Id)));
        }
    }

    public async Task<IActionResult> OnPostSetRoleAsync(string userId, string role)
    {
        if (!DbSeeder.Roles.Contains(role))
        {
            TempData["Error"] = "Geçersiz rol.";
            return RedirectToPage();
        }
        if (userId == userManager.GetUserId(User))
        {
            TempData["Error"] = "Kendi rolünüzü değiştiremezsiniz.";
            return RedirectToPage();
        }

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();

        var current = await userManager.GetRolesAsync(user);
        await userManager.RemoveFromRolesAsync(user, current);
        await userManager.AddToRoleAsync(user, role);
        // Bump the security stamp so the user's existing cookie picks up the new role on next request validation.
        await userManager.UpdateSecurityStampAsync(user);

        TempData["Message"] = $"{user.DisplayName} artık {Labels.Role(role)}.";
        return RedirectToPage();
    }
}
