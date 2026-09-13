namespace Kds.Api.Models;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Staff = "Staff";
    public static readonly string[] All = [Admin, Staff];
}

public sealed class User
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = Roles.Staff;
    public DateTime CreatedAt { get; set; }
    public List<RefreshToken> RefreshTokens { get; set; } = [];
}
