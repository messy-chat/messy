namespace Messy.API.Models;

public class ConversationMember
{
    public Guid UserId { get; set; } = Guid.Empty;
    public User User { get; set; } = null!;

    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;

    public bool IsAdmin { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}