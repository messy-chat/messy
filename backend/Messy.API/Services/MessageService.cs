using Messy.API.Data;
using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Messy.API.Services;

public class MessageService(
    IUnitOfWork unitOfWork, 
    MessyDbContext context, 
    UserManager<User> userManager) : IMessageService
{
    public async Task<MessageDto> SaveMessageAsync(Guid conversationId, Guid senderId, string? content, List<AttachmentDto>? attachments)
    {
        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null || conversation.Members.All(m => m.UserId != senderId))
        {
            throw new UnauthorizedAccessException("User is not a member of this conversation.");
        }

        var currentUser = await userManager.FindByIdAsync(senderId.ToString());
        if (currentUser == null) throw new UnauthorizedAccessException("User not found");

        var message = new Message
        {
            ConversationId = conversationId,
            SenderId = senderId,
            Content = content ?? string.Empty,
            TimeStamp = DateTime.UtcNow,
            IsRead = false
        };

        if (attachments != null && attachments.Count > 0)
        {
            foreach (var attachmentDto in attachments)
            {
                message.Attachments.Add(new Attachment
                {
                    Url = attachmentDto.Url,
                    Type = attachmentDto.Type,
                    FileName = attachmentDto.FileName
                });
            }
        }

        unitOfWork.Messages.Add(message);

        if (await unitOfWork.CompleteAsync())
        {
            return new MessageDto
            {
                Id = message.Id,
                ConversationId = conversationId,
                SenderId = message.SenderId.ToString(),
                SenderName = currentUser.DisplayName ?? currentUser.UserName ?? "Unknown",
                Content = message.Content,
                SentAt = message.TimeStamp,
                IsRead = message.IsRead,
                Attachments = message.Attachments.Select(a => new AttachmentDto
                {
                    Url = a.Url,
                    Type = a.Type,
                    FileName = a.FileName
                }).ToList()
            };
        }

        throw new Exception("Failed to save message.");
    }

    public async Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid conversationId, Guid userId, Guid? beforeMessageId = null, int pageSize = 50)
    {
        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null || conversation.Members.All(m => m.UserId != userId))
        {
            throw new UnauthorizedAccessException("User is not a member of this conversation.");
        }

        DateTime? before = null;
        if (beforeMessageId.HasValue && beforeMessageId.Value != Guid.Empty)
        {
            var cursorMessage = await context.Messages.FindAsync(beforeMessageId.Value);
            if (cursorMessage != null) before = cursorMessage.TimeStamp;
        }

        var messages = await unitOfWork.Messages.GetMessagesAsync(conversationId, before, pageSize);

        return messages.Select(m => new MessageDto
        {
            Id = m.Id,
            ConversationId = m.ConversationId,
            SenderId = m.SenderId.ToString(),
            SenderName = m.Sender.DisplayName ?? m.Sender.UserName ?? "Unknown",
            Content = m.Content,
            SentAt = m.TimeStamp,
            IsRead = m.IsRead,
            Attachments = m.Attachments.Select(a => new AttachmentDto
            {
                Url = a.Url,
                Type = a.Type,
                FileName = a.FileName
            }).ToList()
        }).Reverse();
    }
}
