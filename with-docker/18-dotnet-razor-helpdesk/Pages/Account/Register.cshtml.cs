using System.ComponentModel.DataAnnotations;
using Helpdesk.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Helpdesk.Pages.Account;

[AllowAnonymous]
public class RegisterModel(UserManager<AppUser> userManager, SignInManager<AppUser> signInManager) : PageModel
{
    [BindProperty]
    public InputModel Input { get; set; } = new();

    public class InputModel
    {
        [Required(ErrorMessage = "Ad Soyad gerekli"), StringLength(80)]
        public string DisplayName { get; set; } = string.Empty;

        [Required(ErrorMessage = "E-posta gerekli"), EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Şifre gerekli"), StringLength(100, MinimumLength = 8), DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        [DataType(DataType.Password), Compare(nameof(Password), ErrorMessage = "Şifreler eşleşmiyor")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
            return Page();

        var user = new AppUser { UserName = Input.Email, Email = Input.Email, DisplayName = Input.DisplayName.Trim(), EmailConfirmed = true };
        var result = await userManager.CreateAsync(user, Input.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
                ModelState.AddModelError(string.Empty, error.Description);
            return Page();
        }

        // Self-registered accounts always start as Requester; an Admin can promote them later.
        await userManager.AddToRoleAsync(user, "Requester");
        await signInManager.SignInAsync(user, isPersistent: false);
        TempData["Message"] = $"Hoş geldiniz {user.DisplayName}, hesabınız oluşturuldu.";
        return RedirectToPage("/Tickets/Index");
    }
}
