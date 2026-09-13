using System.ComponentModel.DataAnnotations;
using Helpdesk.Persistence;
using Helpdesk.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Helpdesk.Pages.Admin;

/// <summary>
/// No [Authorize] attribute here on purpose: access is enforced solely by the
/// AuthorizeFolder("/Admin", "AdminOnly") convention registered in Program.cs.
/// </summary>
public class CategoriesModel(AppDbContext db) : PageModel
{
    public record Row(Category Category, int TicketCount);

    public List<Row> Rows { get; private set; } = new();

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public class InputModel
    {
        public int? Id { get; set; }

        [Required(ErrorMessage = "Ad gerekli"), StringLength(60)]
        public string Name { get; set; } = string.Empty;

        [StringLength(200)]
        public string? Description { get; set; }
    }

    public async Task OnGetAsync(int? edit)
    {
        await LoadAsync();
        if (edit is not null && Rows.FirstOrDefault(r => r.Category.Id == edit) is { } row)
            Input = new InputModel { Id = row.Category.Id, Name = row.Category.Name, Description = row.Category.Description };
    }

    public async Task<IActionResult> OnPostSaveAsync()
    {
        var name = Input.Name.Trim();
        if (ModelState.IsValid && await db.Categories.AnyAsync(c => c.Name == name && c.Id != Input.Id))
            ModelState.AddModelError("Input.Name", "Bu adda bir kategori zaten var.");
        if (!ModelState.IsValid)
        {
            await LoadAsync();
            return Page();
        }

        if (Input.Id is null)
        {
            db.Categories.Add(new Category { Name = name, Description = Input.Description?.Trim() });
            TempData["Message"] = $"\"{name}\" kategorisi eklendi.";
        }
        else
        {
            var category = await db.Categories.FindAsync(Input.Id);
            if (category is null) return NotFound();
            category.Name = name;
            category.Description = Input.Description?.Trim();
            TempData["Message"] = $"\"{name}\" güncellendi.";
        }
        await db.SaveChangesAsync();
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostDeleteAsync(int id)
    {
        var category = await db.Categories.Include(c => c.Tickets).FirstOrDefaultAsync(c => c.Id == id);
        if (category is null) return NotFound();
        if (category.Tickets.Count > 0)
        {
            TempData["Error"] = $"\"{category.Name}\" kategorisinde {category.Tickets.Count} bilet var; önce onları taşıyın.";
            return RedirectToPage();
        }
        db.Categories.Remove(category);
        await db.SaveChangesAsync();
        TempData["Message"] = $"\"{category.Name}\" silindi.";
        return RedirectToPage();
    }

    private async Task LoadAsync()
    {
        Rows = (await db.Categories
                .Select(c => new { c, Count = c.Tickets.Count })
                .OrderBy(x => x.c.Name)
                .ToListAsync())
            .Select(x => new Row(x.c, x.Count)).ToList();
    }
}
