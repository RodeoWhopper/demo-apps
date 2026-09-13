using System.Security.Claims;
using Kds.Api.Persistence;
using Kds.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Kds.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/users").WithTags("Users (admin)").RequireAuthorization("AdminOnly");
        g.MapGet("/", List);
        g.MapPost("/", Create);
        g.MapDelete("/{id:int}", Delete);
    }

    private static async Task<IResult> List(AppDbContext db) =>
        Results.Ok(await db.Users.OrderBy(u => u.Id).Select(u => u.ToDto()).ToListAsync());

    private static async Task<IResult> Create(CreateUserRequest req, AppDbContext db, IPasswordHasher<User> hasher)
    {
        var errors = new Problems.Errors();
        var email = req.Email?.Trim().ToLowerInvariant() ?? "";
        if (email.Length is < 3 or > 120 || !email.Contains('@')) errors.Add("email", "A valid email address is required.");
        if (req.Password is null || req.Password.Length < 8) errors.Add("password", "Password must be at least 8 characters.");
        if (req.Role is null || !Roles.All.Contains(req.Role)) errors.Add("role", $"Role must be one of: {string.Join(", ", Roles.All)}.");
        if (errors.Any) return errors.ToResult();

        if (await db.Users.AnyAsync(u => u.Email == email))
            return Problems.Conflict($"A user with email '{email}' already exists.");

        var user = new User { Email = email, Role = req.Role!, CreatedAt = DateTime.UtcNow };
        user.PasswordHash = hasher.HashPassword(user, req.Password!);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return Results.Created($"/api/users/{user.Id}", user.ToDto());
    }

    private static async Task<IResult> Delete(int id, ClaimsPrincipal principal, AppDbContext db)
    {
        if (principal.UserId() == id) return Problems.BadRequest("You cannot delete your own account.");
        var user = await db.Users.FindAsync(id);
        if (user is null) return Problems.NotFound($"User {id} does not exist.");
        db.Users.Remove(user); // refresh tokens cascade
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
