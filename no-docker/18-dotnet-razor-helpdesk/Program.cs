using Helpdesk.Persistence;
using Helpdesk.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.WebEncoders;
using System.Text.Encodings.Web;
using System.Text.Unicode;

var builder = WebApplication.CreateBuilder(args);

// Listen on 8018 unless ASPNETCORE_URLS / --urls says otherwise.
if (string.IsNullOrWhiteSpace(builder.Configuration["urls"]))
{
    builder.WebHost.UseUrls("http://0.0.0.0:8018");
}

var connectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=data/helpdesk.db";
var dataSource = new SqliteConnectionStringBuilder(connectionString).DataSource;
var dataDir = Path.GetDirectoryName(dataSource) is { Length: > 0 } dir ? dir : ".";
Directory.CreateDirectory(dataDir);

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

// Keep the cookie-encryption keys next to the database so sign-ins survive restarts.
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(dataDir, "keys")))
    .SetApplicationName("masaustu-destek");

builder.Services
    .AddIdentity<AppUser, IdentityRole>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// Cookie authentication (issued by SignInManager) – no scaffolded Identity UI.
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Account/Login";
    options.LogoutPath = "/Account/Logout";
    options.AccessDeniedPath = "/AccessDenied";
    options.Cookie.Name = "masaustu.auth";
    options.Cookie.HttpOnly = true;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = true;
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("Staff", policy => policy.RequireRole("Admin", "Agent"));
});

builder.Services.AddRazorPages(options =>
{
    // Convention-based authorization: the whole /Admin folder needs the AdminOnly policy,
    // /Tickets needs a signed-in user. Individual pages additionally carry [Authorize] attributes.
    options.Conventions.AuthorizeFolder("/Admin", "AdminOnly");
    options.Conventions.AuthorizeFolder("/Tickets");
    options.Conventions.AllowAnonymousToFolder("/Account");
});

// Emit Turkish characters literally instead of &#x131;-style entities.
builder.Services.Configure<WebEncoderOptions>(o => o.TextEncoderSettings = new TextEncoderSettings(UnicodeRanges.All));

builder.Services.AddHealthChecks().AddCheck<DbHealthCheck>("sqlite");

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DbSeeder.SeedAsync(scope.ServiceProvider);
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}
app.UseStatusCodePagesWithReExecute("/Error", "?code={0}");

app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapRazorPages();
app.MapHealthChecks("/healthz");

app.Run();
