using System.ComponentModel.DataAnnotations;

namespace Helpdesk.Models;

public enum TicketStatus { Open, InProgress, Resolved, Closed }

public enum TicketPriority { Low, Medium, High, Critical }

public class Ticket
{
    public int Id { get; set; }

    [Required, StringLength(120)]
    public string Title { get; set; } = string.Empty;

    [Required, StringLength(4000)]
    public string Description { get; set; } = string.Empty;

    public TicketStatus Status { get; set; } = TicketStatus.Open;

    public TicketPriority Priority { get; set; } = TicketPriority.Medium;

    public int CategoryId { get; set; }
    public Category? Category { get; set; }

    public string RequesterId { get; set; } = string.Empty;
    public AppUser? Requester { get; set; }

    public string? AssigneeId { get; set; }
    public AppUser? Assignee { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<TicketComment> Comments { get; set; } = new();
}

public class TicketComment
{
    public int Id { get; set; }

    public int TicketId { get; set; }
    public Ticket? Ticket { get; set; }

    public string AuthorId { get; set; } = string.Empty;
    public AppUser? Author { get; set; }

    [Required, StringLength(2000)]
    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
