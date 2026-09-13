using Helpdesk.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Helpdesk.Persistence;

/// <summary>Creates roles, demo accounts, categories and tickets when the database is empty.</summary>
public static class DbSeeder
{
    public static readonly string[] Roles = ["Admin", "Agent", "Requester"];

    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeeder");

        foreach (var role in Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        var admin = await EnsureUser(userManager, "admin@masaustu.dev", "Admin123!", "Elif Yönetici", "Admin");
        var agent = await EnsureUser(userManager, "agent@masaustu.dev", "Agent123!", "Can Teknisyen", "Agent");
        var user = await EnsureUser(userManager, "user@masaustu.dev", "User123!", "Zeynep Kullanıcı", "Requester");

        if (await db.Categories.AnyAsync())
            return;

        var hardware = new Category { Name = "Donanım", Description = "Bilgisayar, monitör, yazıcı ve çevre birimleri" };
        var software = new Category { Name = "Yazılım", Description = "Kurulum, lisans ve uygulama hataları" };
        var network = new Category { Name = "Ağ", Description = "VPN, Wi-Fi, kablolu ağ ve erişim sorunları" };
        var account = new Category { Name = "Hesap & Erişim", Description = "Parola sıfırlama, yetki ve hesap açma" };
        db.Categories.AddRange(hardware, software, network, account);
        await db.SaveChangesAsync();

        var now = DateTime.UtcNow;
        Ticket T(string title, string desc, Category cat, TicketPriority pri, TicketStatus st, AppUser requester, AppUser? assignee, int daysAgo) => new()
        {
            Title = title, Description = desc, Category = cat, Priority = pri, Status = st,
            RequesterId = requester.Id, AssigneeId = assignee?.Id,
            CreatedAt = now.AddDays(-daysAgo), UpdatedAt = now.AddDays(-daysAgo).AddHours(3)
        };

        var tickets = new[]
        {
            T("Dizüstü bilgisayar açılmıyor", "Güç düğmesine bastığımda ışık yanıyor ama ekran siyah kalıyor.", hardware, TicketPriority.High, TicketStatus.InProgress, user, agent, 1),
            T("VPN bağlantısı sürekli kopuyor", "Evden çalışırken VPN 10 dakikada bir düşüyor, yeniden bağlanmam gerekiyor.", network, TicketPriority.Medium, TicketStatus.Open, user, null, 2),
            T("Excel eklentisi yüklenmiyor", "Raporlama eklentisi 'lisans bulunamadı' hatası veriyor.", software, TicketPriority.Low, TicketStatus.Resolved, user, agent, 5),
            T("Parola sıfırlama talebi", "Domain parolamın süresi doldu, sıfırlanmasını rica ediyorum.", account, TicketPriority.Critical, TicketStatus.Closed, user, admin, 9),
            T("Yazıcı kağıt sıkıştırıyor", "3. kat yazıcısı her çift taraflı baskıda kağıt sıkıştırıyor.", hardware, TicketPriority.Medium, TicketStatus.Open, agent, null, 3),
            T("Yeni personel için hesap açılışı", "Pazartesi başlayacak iki yeni çalışan için e-posta ve ERP hesabı gerekiyor.", account, TicketPriority.High, TicketStatus.InProgress, admin, agent, 1),
            T("Toplantı odası Wi-Fi zayıf", "B blok toplantı odasında sinyal tek çubuk, görüntülü görüşme donuyor.", network, TicketPriority.Low, TicketStatus.Open, user, null, 6),
            T("Antivirüs güncellenmiyor", "Güncelleme %40'ta takılı kalıyor ve hata kodu 0x80070005 veriyor.", software, TicketPriority.High, TicketStatus.Open, user, null, 0),
            T("İkinci monitör algılanmıyor", "Docking station'a bağlı ikinci monitör sinyal almıyor.", hardware, TicketPriority.Medium, TicketStatus.Resolved, agent, agent, 12),
            T("ERP raporu yetki hatası", "Satış raporunu açmaya çalışınca 'yetkiniz yok' uyarısı alıyorum.", account, TicketPriority.Medium, TicketStatus.Open, user, null, 4),
        };
        db.Tickets.AddRange(tickets);
        await db.SaveChangesAsync();

        db.TicketComments.AddRange(
            new TicketComment { TicketId = tickets[0].Id, AuthorId = agent.Id, Body = "Cihazı teslim aldım, ekran kablosunu kontrol ediyorum.", CreatedAt = now.AddHours(-20) },
            new TicketComment { TicketId = tickets[0].Id, AuthorId = user.Id, Body = "Teşekkürler, yedek cihaz kullanıyorum şu an.", CreatedAt = now.AddHours(-18) },
            new TicketComment { TicketId = tickets[2].Id, AuthorId = agent.Id, Body = "Lisans anahtarı yenilendi, eklenti yüklendi. Kapatabilir miyiz?", CreatedAt = now.AddDays(-4) },
            new TicketComment { TicketId = tickets[3].Id, AuthorId = admin.Id, Body = "Parola sıfırlandı, ilk girişte değiştirmeniz istenecek.", CreatedAt = now.AddDays(-9).AddHours(1) },
            new TicketComment { TicketId = tickets[5].Id, AuthorId = agent.Id, Body = "E-posta hesapları açıldı, ERP için yetki onayı bekleniyor.", CreatedAt = now.AddHours(-5) });
        await db.SaveChangesAsync();

        logger.LogInformation("Seeded {Categories} categories and {Tickets} tickets", 4, tickets.Length);
    }

    private static async Task<AppUser> EnsureUser(UserManager<AppUser> users, string email, string password, string displayName, string role)
    {
        var existing = await users.FindByEmailAsync(email);
        if (existing is not null)
            return existing;

        var user = new AppUser { UserName = email, Email = email, EmailConfirmed = true, DisplayName = displayName };
        var result = await users.CreateAsync(user, password);
        if (!result.Succeeded)
            throw new InvalidOperationException($"Could not create {email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        await users.AddToRoleAsync(user, role);
        return user;
    }
}
