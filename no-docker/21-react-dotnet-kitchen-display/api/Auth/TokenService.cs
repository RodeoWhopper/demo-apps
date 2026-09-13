using System.Security.Cryptography;
using System.Text;
using Kds.Api.Persistence;
using Kds.Api.Models;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Kds.Api.Auth;

public sealed class TokenService(AuthOptions options, AppDbContext db)
{
    public (string Token, DateTime ExpiresAt) CreateAccessToken(User user)
    {
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(options.AccessTokenMinutes);
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = options.Issuer,
            Audience = options.Issuer,
            IssuedAt = now,
            NotBefore = now,
            Expires = expires,
            SigningCredentials = new SigningCredentials(options.SigningKey, SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Sub] = user.Id.ToString(),
                [JwtRegisteredClaimNames.Email] = user.Email,
                ["role"] = user.Role,
                [JwtRegisteredClaimNames.Jti] = Guid.NewGuid().ToString("N"),
            },
        };
        var handler = new JsonWebTokenHandler { SetDefaultTimesOnTokenCreation = false };
        return (handler.CreateToken(descriptor), expires);
    }

    // Creates a new opaque refresh token for the user, stores its hash and writes the httpOnly cookie.
    public RefreshToken IssueRefreshToken(User user, HttpResponse response)
    {
        var raw = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        var now = DateTime.UtcNow;
        var token = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = Hash(raw),
            CreatedAt = now,
            ExpiresAt = now.AddDays(options.RefreshTokenDays),
        };
        db.RefreshTokens.Add(token);
        response.Cookies.Append(AuthOptions.RefreshCookieName, raw, CookieOptions(token.ExpiresAt));
        return token;
    }

    public void ClearRefreshCookie(HttpResponse response) =>
        response.Cookies.Delete(AuthOptions.RefreshCookieName, CookieOptions(null));

    public static string Hash(string raw) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

    private CookieOptions CookieOptions(DateTime? expires) => new()
    {
        HttpOnly = true,
        Secure = options.CookieSecure,
        SameSite = SameSiteMode.Strict,
        Path = AuthOptions.RefreshCookiePath,
        Expires = expires is null ? DateTimeOffset.UnixEpoch : new DateTimeOffset(expires.Value),
        IsEssential = true,
    };
}
