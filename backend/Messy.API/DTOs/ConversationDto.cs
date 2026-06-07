namespace Messy.API.DTOs;

public class ConversationDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsGroup { get; set; }
    public string? LastMessage { get; set; }
    public DateTime? LastMessageSentAt { get; set; }
    public string? PictureUrl { get; set; }
    public List<ConversationMemberDto> Members { get; set; } = new();
}