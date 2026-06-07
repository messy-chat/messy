namespace Messy.API.DTOs;

public class CreateGroupDto
{
    public string Name { get; set; } = null!;
    public List<string> MemberUserIds { get; set; } = new();
}
