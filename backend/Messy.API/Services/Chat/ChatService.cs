using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Models;
using Microsoft.EntityFrameworkCore;
using Messy.API.Data;

namespace Messy.API.Services.Chat;

public class ChatService(IUnitOfWork unitOfWork, MessyDbContext context) : IChatService
{
    public async Task<Guid> GetOrCreatePrivateConversationAsync(string currentUserId, string targetUserId)
    {
        var existing = await unitOfWork.Conversations.GetPrivateConversationAsync(currentUserId, targetUserId);
        if (existing != null) return existing.Id;

        var conversation = new Conversation
        {
            IsGroup = false,
            CreatedAt = DateTime.UtcNow
        };

        unitOfWork.Conversations.Add(conversation);
        unitOfWork.Conversations.AddMember(new ConversationMember { UserId = currentUserId, Conversation = conversation });
        unitOfWork.Conversations.AddMember(new ConversationMember { UserId = targetUserId, Conversation = conversation });

        await unitOfWork.CompleteAsync();
        return conversation.Id;
    }

    public async Task<IEnumerable<ConversationDto>> GetUserConversationsAsync(string userId)
    {
        var conversations = await unitOfWork.Conversations.GetUserConversationsWithLastMessageAsync(userId);

        return conversations.Select(c =>
        {
            var lastMessage = c.Messages.OrderByDescending(m => m.TimeStamp).FirstOrDefault();
            
            string name = c.Title ?? "Unknown";
            if (!c.IsGroup)
            {
                var otherMember = c.Members.FirstOrDefault(m => m.UserId != userId);
                name = otherMember?.User.DisplayName ?? otherMember?.User.UserName ?? "Unknown";
            }

            string? pictureUrl = string.Empty;
            
            if (c.Members.Count >= 2)
            {
                 pictureUrl = c.Members.FirstOrDefault(m => m.UserId != userId)?.User.ProfilePictureUrl;    
            }

            
            return new ConversationDto
            {
                Id = c.Id,
                Name = name,
                IsGroup = c.IsGroup,
                LastMessage = lastMessage?.Content,
                LastMessageSentAt = lastMessage?.TimeStamp,
                PictureUrl = pictureUrl
            };
        })
        .OrderByDescending(c => c.LastMessageSentAt ?? DateTime.MinValue);
    }

    public async Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid conversationId, string userId, Guid? beforeMessageId = null, int pageSize = 50)
    {
        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null || !conversation.Members.Any(m => m.UserId == userId))
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
            SenderId = m.SenderId,
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
