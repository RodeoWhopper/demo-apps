namespace Helpdesk.Models;

/// <summary>Turkish display labels for enums used across the pages.</summary>
public static class Labels
{
    public static string Status(TicketStatus s) => s switch
    {
        TicketStatus.Open => "Açık",
        TicketStatus.InProgress => "İşlemde",
        TicketStatus.Resolved => "Çözüldü",
        TicketStatus.Closed => "Kapalı",
        _ => s.ToString()
    };

    public static string Priority(TicketPriority p) => p switch
    {
        TicketPriority.Low => "Düşük",
        TicketPriority.Medium => "Orta",
        TicketPriority.High => "Yüksek",
        TicketPriority.Critical => "Kritik",
        _ => p.ToString()
    };

    public static string Role(string r) => r switch
    {
        "Admin" => "Yönetici",
        "Agent" => "Destek uzmanı",
        "Requester" => "Talep eden",
        _ => r
    };
}
