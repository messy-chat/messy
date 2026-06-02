namespace Messy.API.DTOs;

public class ConversationDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsGroup { get; set; }
    public string? LastMessage { get; set; }
    public DateTime? LastMessageSentAt { get; set; }
}