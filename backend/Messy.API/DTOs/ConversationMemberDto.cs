namespace Messy.API.DTOs;

public class ConversationMemberDto
{
    public Guid UserId { get; set; } = Guid.Empty;
    public string Username { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsAdmin { get; set; }
}
