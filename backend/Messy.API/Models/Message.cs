namespace Messy.API.Models;

public enum MessageType
{
    Text,
    Image,
    File
}

public class Message
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime TimeStamp { get; set; } = DateTime.UtcNow;
    public MessageType Type { get; set; } = MessageType.Text;
    public string? MediaUrl { get; set; }
    public bool IsRead { get; set; } = false;

    public string SenderId { get; set; } = null!;
    public User Sender { get; set; } = null!;

    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;
}