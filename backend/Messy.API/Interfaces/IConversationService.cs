using Messy.API.DTOs;

namespace Messy.API.Interfaces;

public interface IConversationService
{
    Task<IEnumerable<ConversationDto>> GetUserConversationsAsync(Guid userId);
    Task<ConversationDetailsDto?> GetConversationDetailsAsync(Guid conversationId, Guid currentUserId);
    Task<Guid> CreatePrivateConversationAsync(Guid currentUserId, Guid targetUserId);
    Task<Guid> CreateGroupConversationAsync(Guid creatorId, string name, List<Guid> memberIds);
    Task<bool> AddMemberAsync(Guid conversationId, Guid adminId, Guid targetUserId);
    Task<bool> RemoveMemberAsync(Guid conversationId, Guid adminId, Guid targetUserId);
    Task<bool> LeaveConversationAsync(Guid conversationId, Guid userId);
    Task<bool> ChangeConversationNameAsync(Guid conversationId, Guid currentUserId, string name);
    Task<bool> ChangeConversationImageAsync(Guid conversationId, Guid adminId, string imageUrl);
}
