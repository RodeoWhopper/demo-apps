using System.ComponentModel.DataAnnotations;

namespace Helpdesk.Models;

public class Category
{
    public int Id { get; set; }

    [Required, StringLength(60)]
    public string Name { get; set; } = string.Empty;

    [StringLength(200)]
    public string? Description { get; set; }

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}
