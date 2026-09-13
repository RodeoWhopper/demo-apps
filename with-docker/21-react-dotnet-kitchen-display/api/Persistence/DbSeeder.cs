using Kds.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Kds.Api.Persistence;

// Idempotent: each block only runs when its table is empty, so restarts never duplicate data.
public sealed class DbSeeder(AppDbContext db, IPasswordHasher<User> hasher, ILogger<DbSeeder> log)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        if (!await db.Users.AnyAsync(ct))
        {
            db.Users.AddRange(
                NewUser("admin@ocakbasi.dev", "Admin123!", Roles.Admin, now),
                NewUser("sef@ocakbasi.dev", "Sef123!", Roles.Staff, now));
            await db.SaveChangesAsync(ct);
            log.LogInformation("Seeded 2 users");
        }

        if (!await db.MenuItems.AnyAsync(ct))
        {
            db.MenuItems.AddRange(
                Item("Haydari", "Mezeler", 120m),
                Item("Acılı Ezme", "Mezeler", 110m),
                Item("Patlıcan Salatası", "Mezeler", 130m),
                Item("Adana Kebap", "Izgaralar", 380m),
                Item("Kuzu Şiş", "Izgaralar", 420m),
                Item("Tavuk Kanat", "Izgaralar", 290m),
                Item("Kıymalı Pide", "Pideler", 240m),
                Item("Kaşarlı Pide", "Pideler", 220m),
                Item("Kuşbaşılı Pide", "Pideler", 260m),
                Item("Ayran", "İçecekler", 40m),
                Item("Şalgam", "İçecekler", 45m),
                Item("Çay", "İçecekler", 20m));
            await db.SaveChangesAsync(ct);
            log.LogInformation("Seeded 12 menu items");
        }

        if (!await db.Orders.AnyAsync(ct))
        {
            var menu = await db.MenuItems.ToDictionaryAsync(m => m.Name, ct);
            OrderLine L(string name, int qty) => new() { MenuItemId = menu[name].Id, Qty = qty, UnitPrice = menu[name].Price };

            db.Orders.AddRange(
                new Order
                {
                    TableCode = "M1", Status = OrderStatus.Received, CreatedAt = now.AddMinutes(-2), UpdatedAt = now.AddMinutes(-2),
                    Lines = [L("Adana Kebap", 2), L("Ayran", 2)],
                },
                new Order
                {
                    TableCode = "M4", Status = OrderStatus.Received, Note = "Az acılı olsun", CreatedAt = now.AddMinutes(-5), UpdatedAt = now.AddMinutes(-5),
                    Lines = [L("Kıymalı Pide", 1), L("Haydari", 1), L("Çay", 2)],
                },
                new Order
                {
                    TableCode = "B2", Status = OrderStatus.Preparing, CreatedAt = now.AddMinutes(-12), UpdatedAt = now.AddMinutes(-9),
                    Lines = [L("Kuzu Şiş", 1), L("Acılı Ezme", 1), L("Şalgam", 1)],
                },
                new Order
                {
                    TableCode = "T7", Status = OrderStatus.Ready, CreatedAt = now.AddMinutes(-18), UpdatedAt = now.AddMinutes(-3), ReadyAt = now.AddMinutes(-3),
                    Lines = [L("Tavuk Kanat", 2), L("Ayran", 1)],
                },
                new Order
                {
                    TableCode = "M2", Status = OrderStatus.Served, CreatedAt = now.AddMinutes(-45), UpdatedAt = now.AddMinutes(-27),
                    ReadyAt = now.AddMinutes(-30), ServedAt = now.AddMinutes(-27),
                    Lines = [L("Kaşarlı Pide", 2), L("Çay", 2)],
                },
                new Order
                {
                    TableCode = "B5", Status = OrderStatus.Cancelled, Note = "Müşteri vazgeçti", CreatedAt = now.AddMinutes(-60), UpdatedAt = now.AddMinutes(-58),
                    Lines = [L("Kuşbaşılı Pide", 1)],
                });
            await db.SaveChangesAsync(ct);
            log.LogInformation("Seeded 6 orders");
        }
    }

    private User NewUser(string email, string password, string role, DateTime now)
    {
        var user = new User { Email = email, Role = role, CreatedAt = now };
        user.PasswordHash = hasher.HashPassword(user, password);
        return user;
    }

    private static MenuItem Item(string name, string category, decimal price) =>
        new() { Name = name, Category = category, Price = price, IsAvailable = true };
}
