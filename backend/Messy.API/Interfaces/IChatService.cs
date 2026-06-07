using Messy.API.DTOs;

namespace Messy.API.Interfaces;

public interface IChatService
{
    Task<Guid> GetOrCreatePrivateConversationAsync(string currentUserId, string targetUserId);
    Task<IEnumerable<ConversationDto>> GetUserConversationsAsync(string userId);
    Task<ConversationDto?> GetConversationAsync(Guid conversationId, string userId);
    Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid conversationId, string userId, Guid? beforeMessageId = null, int pageSize = 50);
}
