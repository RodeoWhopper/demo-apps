using System.Security.Claims;
using Kds.Api.Auth;
using Kds.Api.Persistence;
using Kds.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Kds.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/auth").WithTags("Auth");
        g.MapPost("/login", Login).RequireRateLimiting("auth");
        g.MapPost("/refresh", Refresh);
        g.MapPost("/logout", Logout);
        g.MapGet("/me", Me).RequireAuthorization();
    }

    private static async Task<IResult> Login(LoginRequest req, AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens, HttpContext http, ILoggerFactory lf)
    {
        var errors = new Problems.Errors();
        if (string.IsNullOrWhiteSpace(req.Email)) errors.Add("email", "Email is required.");
        if (string.IsNullOrEmpty(req.Password)) errors.Add("password", "Password is required.");
        if (errors.Any) return errors.ToResult();

        var email = req.Email!.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
        var verification = user is null
            ? PasswordVerificationResult.Failed
            : hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password!);
        if (user is null || verification == PasswordVerificationResult.Failed)
        {
            lf.CreateLogger("Auth").LogWarning("Failed login for {Email}", email);
            return Problems.Unauthorized("Invalid email or password.");
        }
        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = hasher.HashPassword(user, req.Password!);

        var (access, expires) = tokens.CreateAccessToken(user);
        tokens.IssueRefreshToken(user, http.Response);
        await db.SaveChangesAsync();
        return Results.Ok(new AuthResponse(access, expires, user.ToDto()));
    }

    private static async Task<IResult> Refresh(AppDbContext db, TokenService tokens, HttpContext http, ILoggerFactory lf)
    {
        var raw = http.Request.Cookies[AuthOptions.RefreshCookieName];
        if (string.IsNullOrEmpty(raw)) return Problems.Unauthorized("No refresh token cookie.");

        var now = DateTime.UtcNow;
        var hash = TokenService.Hash(raw);
        var stored = await db.RefreshTokens.Include(t => t.User).SingleOrDefaultAsync(t => t.TokenHash == hash);
        if (stored is null)
        {
            tokens.ClearRefreshCookie(http.Response);
            return Problems.Unauthorized("Unknown refresh token.");
        }
        if (stored.RevokedAt is not null)
        {
            // A rotated token was presented again: treat it as theft and revoke every session of this user.
            lf.CreateLogger("Auth").LogWarning("Refresh token reuse detected for user {UserId}", stored.UserId);
            await db.RefreshTokens
                .Where(t => t.UserId == stored.UserId && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now));
            tokens.ClearRefreshCookie(http.Response);
            return Problems.Unauthorized("Refresh token reuse detected; all sessions were revoked.");
        }
        if (stored.ExpiresAt <= now)
        {
            tokens.ClearRefreshCookie(http.Response);
            return Problems.Unauthorized("Refresh token expired.");
        }

        stored.RevokedAt = now; // rotation: the presented token is single-use
        var (access, expires) = tokens.CreateAccessToken(stored.User);
        tokens.IssueRefreshToken(stored.User, http.Response);
        await db.SaveChangesAsync();
        return Results.Ok(new AuthResponse(access, expires, stored.User.ToDto()));
    }

    private static async Task<IResult> Logout(AppDbContext db, TokenService tokens, HttpContext http)
    {
        var raw = http.Request.Cookies[AuthOptions.RefreshCookieName];
        if (!string.IsNullOrEmpty(raw))
        {
            var hash = TokenService.Hash(raw);
            await db.RefreshTokens
                .Where(t => t.TokenHash == hash && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
        }
        tokens.ClearRefreshCookie(http.Response);
        return Results.NoContent();
    }

    private static async Task<IResult> Me(ClaimsPrincipal principal, AppDbContext db)
    {
        var id = principal.UserId();
        var user = id is null ? null : await db.Users.FindAsync(id.Value);
        return user is null ? Problems.Unauthorized("User no longer exists.") : Results.Ok(user.ToDto());
    }

    public static int? UserId(this ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue("sub"), out var id) ? id : null;
}
