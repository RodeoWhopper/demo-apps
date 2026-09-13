using Helpdesk.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Helpdesk.Pages.Account;

[AllowAnonymous]
public class LogoutModel(SignInManager<AppUser> signInManager) : PageModel
{
    /// <summary>Logging out is a state change, so it only happens on POST (antiforgery protected).</summary>
    public IActionResult OnGet() => RedirectToPage("/Index");

    public async Task<IActionResult> OnPostAsync()
    {
        await signInManager.SignOutAsync();
        return RedirectToPage("/Index");
    }
}
