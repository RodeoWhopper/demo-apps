using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Kds.Api.Auth;

// Flat environment-variable style configuration (JWT_SECRET, JWT_ISSUER, ...).
public sealed class AuthOptions
{
    public const string RefreshCookieName = "kds_refresh";
    public const string RefreshCookiePath = "/api/auth";
    public const string DemoSecret = "change-me-demo-secret-ocakbasi-kds-32chars";

    public required string Secret { get; init; }
    public required string Issuer { get; init; }
    public int AccessTokenMinutes { get; init; } = 15;
    public int RefreshTokenDays { get; init; } = 7;
    public bool CookieSecure { get; init; }
    public bool UsingDemoSecret => Secret == DemoSecret;

    public SymmetricSecurityKey SigningKey => new(Encoding.UTF8.GetBytes(Secret));

    public static AuthOptions FromConfiguration(IConfiguration cfg)
    {
        var secret = cfg["JWT_SECRET"];
        if (string.IsNullOrWhiteSpace(secret)) secret = DemoSecret;
        if (secret.Length < 32)
            throw new InvalidOperationException("JWT_SECRET must be at least 32 characters long.");

        return new AuthOptions
        {
            Secret = secret,
            Issuer = cfg["JWT_ISSUER"] is { Length: > 0 } issuer ? issuer : "ocakbasi-kds",
            AccessTokenMinutes = ParseInt(cfg["ACCESS_TOKEN_MINUTES"], 15, 1, 24 * 60),
            RefreshTokenDays = ParseInt(cfg["REFRESH_TOKEN_DAYS"], 7, 1, 365),
            CookieSecure = ParseBool(cfg["COOKIE_SECURE"]),
        };
    }

    public static int ParseInt(string? raw, int fallback, int min, int max) =>
        int.TryParse(raw, out var v) && v >= min && v <= max ? v : fallback;

    public static bool ParseBool(string? raw) =>
        raw is not null && (raw.Equals("true", StringComparison.OrdinalIgnoreCase) || raw == "1");
}
