using Messy.API.DTOs;

namespace Messy.API.Interfaces;

public interface IMessageService
{
    Task<MessageDto> SaveMessageAsync(Guid conversationId, Guid senderId, string? content, List<AttachmentDto>? attachments);
    Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid conversationId, Guid userId, Guid? beforeMessageId = null, int pageSize = 50);
}
