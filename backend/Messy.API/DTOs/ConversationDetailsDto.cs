namespace Messy.API.DTOs;

public class ConversationDetailsDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsGroup { get; set; }
    public string? LastMessage { get; set; }
    public DateTime? LastMessageSentAt { get; set; }
    public string? ImageUrl { get; set; }
    public ICollection<ConversationMemberDto> Members { get; set; } = new List<ConversationMemberDto>();
}