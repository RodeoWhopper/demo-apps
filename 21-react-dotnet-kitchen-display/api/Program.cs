using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Kds.Api.Auth;
using Kds.Api.Persistence;
using Kds.Api.Endpoints;
using Kds.Api.Hubs;
using Kds.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;

// The React build is served from the first existing folder: <cwd>/wwwroot (publish output / Docker),
// <dll dir>/wwwroot (running the published dll from another directory) or ../web/dist (local `dotnet run`).
var builder = WebApplication.CreateBuilder(new WebApplicationOptions { Args = args, WebRootPath = SpaRoot.Resolve() });
var cfg = builder.Configuration;

// Listen on 8021 unless ASPNETCORE_URLS or --urls says otherwise.
if (string.IsNullOrWhiteSpace(cfg["ASPNETCORE_URLS"]) && string.IsNullOrWhiteSpace(cfg["urls"]))
    builder.WebHost.UseUrls("http://0.0.0.0:8021");

var authOptions = AuthOptions.FromConfiguration(cfg);
var ordersPerMinute = AuthOptions.ParseInt(cfg["ORDERS_PER_MINUTE"], 10, 1, 10000);
var trustProxyHeaders = AuthOptions.ParseBool(cfg["TRUST_PROXY_HEADERS"]);
var corsOrigins = (cfg["CORS_ORIGINS"] ?? "http://localhost:5021")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

// ---- data -------------------------------------------------------------------
var connectionString = cfg.GetConnectionString("Default") ?? "Data Source=data/kds.db";
SpaRoot.EnsureSqliteDirectory(connectionString);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(connectionString));
builder.Services.AddScoped<DbSeeder>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

// ---- auth -------------------------------------------------------------------
builder.Services.AddSingleton(authOptions);
builder.Services.AddScoped<TokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false; // keep "sub", "email", "role" as-is
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = authOptions.Issuer,
        ValidateAudience = true,
        ValidAudience = authOptions.Issuer,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = authOptions.SigningKey,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        NameClaimType = "email",
        RoleClaimType = "role",
    };
    // Browsers cannot set headers on WebSocket upgrades; SignalR sends the token as ?access_token= instead.
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        },
    };
});
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", p => p.RequireRole(Roles.Admin))
    .AddPolicy("StaffOrAdmin", p => p.RequireRole(Roles.Staff, Roles.Admin));

// ---- web plumbing -----------------------------------------------------------
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi(o => o.AddDocumentTransformer<BearerSecuritySchemeTransformer>());
builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");
builder.Services.AddSignalR().AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSingleton<OrderBroadcaster>();
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // Public order creation: fixed window per client IP.
    o.AddPolicy("orders", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = ordersPerMinute, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    // Login brute-force brake.
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.Headers.RetryAfter = "60";
        await Results.Problem(
            statusCode: StatusCodes.Status429TooManyRequests,
            title: "Too Many Requests",
            detail: "Rate limit exceeded. Try again in a minute.").ExecuteAsync(ctx.HttpContext);
    };
});

var app = builder.Build();

app.Logger.LogInformation("Web root: {WebRoot}", app.Environment.WebRootPath is { Length: > 0 } wr && Directory.Exists(wr) ? wr : "(none - API only)");
if (authOptions.UsingDemoSecret)
    app.Logger.LogWarning("JWT_SECRET is the built-in demo value; set a private 32+ character secret in production.");

if (trustProxyHeaders)
{
    var fwd = new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto };
    fwd.KnownIPNetworks.Clear();
    fwd.KnownProxies.Clear();
    app.UseForwardedHeaders(fwd);
}

app.UseExceptionHandler();   // unhandled exception -> application/problem+json 500
app.UseStatusCodePages();    // body-less 401/403/404/405 -> application/problem+json
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/healthz", new HealthCheckOptions { ResponseWriter = WriteHealthJson });
app.MapOpenApi();                 // /openapi/v1.json
app.MapScalarApiReference();      // /scalar (interactive API reference, assets are embedded)
app.MapHub<OrdersHub>("/hubs/orders");
app.MapAuthEndpoints();
app.MapMenuEndpoints();
app.MapOrderEndpoints();
app.MapUserEndpoints();

// API and hub paths never fall back to the SPA: unknown ones answer with a JSON 404 problem.
app.MapFallback("/api/{**path}", (string path) => Problems.NotFound($"No API endpoint at /api/{path}."));
app.MapFallback("/hubs/{**path}", (string path) => Problems.NotFound($"No hub at /hubs/{path}."));
app.MapFallbackToFile("index.html");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
}

app.Run();

static Task WriteHealthJson(HttpContext ctx, HealthReport report)
{
    var payload = new
    {
        status = report.Status.ToString(),
        checks = report.Entries.Select(e => new { name = e.Key, status = e.Value.Status.ToString(), durationMs = Math.Round(e.Value.Duration.TotalMilliseconds, 1) }),
    };
    return ctx.Response.WriteAsJsonAsync(payload);
}

static class SpaRoot
{
    public static string? Resolve()
    {
        string[] candidates =
        [
            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
            Path.Combine(AppContext.BaseDirectory, "wwwroot"),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "web", "dist")),
        ];
        return candidates.FirstOrDefault(c => File.Exists(Path.Combine(c, "index.html")));
    }

    public static void EnsureSqliteDirectory(string connectionString)
    {
        var dataSource = new SqliteConnectionStringBuilder(connectionString).DataSource;
        if (string.IsNullOrEmpty(dataSource) || dataSource == ":memory:") return;
        var dir = Path.GetDirectoryName(Path.GetFullPath(dataSource));
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
    }
}

// Advertises the Bearer scheme in /openapi/v1.json so Scalar shows an "Authorize" option.
sealed class BearerSecuritySchemeTransformer(IAuthenticationSchemeProvider schemes) : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        if (!(await schemes.GetAllSchemesAsync()).Any(s => s.Name == JwtBearerDefaults.AuthenticationScheme)) return;
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            In = ParameterLocation.Header,
            BearerFormat = "JWT",
            Description = "Access token from POST /api/auth/login",
        };
    }
}
