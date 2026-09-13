using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Helpdesk.Pages;

[AllowAnonymous]
public class AccessDeniedModel : PageModel
{
    public string? ReturnUrl { get; private set; }

    public void OnGet(string? returnUrl)
    {
        ReturnUrl = returnUrl;
        Response.StatusCode = StatusCodes.Status403Forbidden;
    }
}
