namespace Messy.API.DTOs;

public class ConversationMemberDto
{
    public string UserId { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public bool IsAdmin { get; set; }
}
