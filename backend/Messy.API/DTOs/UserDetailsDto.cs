namespace Messy.API.DTOs;

public class UserDetailsDto
{
    public Guid Id { get; set; } = Guid.Empty;
    public string Username { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? Status { get; set; }
}