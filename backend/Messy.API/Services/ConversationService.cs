using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Models;
using Messy.API.SignalR;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;

namespace Messy.API.Services;

public class ConversationService(
    IUnitOfWork unitOfWork,
    UserManager<User> userManager,
    IHubContext<ChatHub> hubContext) : IConversationService
{
    public async Task<IEnumerable<ConversationDto>> GetUserConversationsAsync(Guid userId)
    {
        var conversations = await unitOfWork.Conversations.GetUserConversationsWithLastMessageAsync(userId);

        return conversations.Select(c =>
            {
                var lastMessage = c.Messages.OrderByDescending(m => m.TimeStamp).FirstOrDefault();
                string name = c.Name ?? "Unknown";

                string? imageUrl = c.ImageUrl;
                
                if (!c.IsGroup)
                {
                    var otherMember = c.Members.FirstOrDefault(m => m.UserId != userId);
                    name = otherMember?.User.DisplayName ?? otherMember?.User.UserName ?? "Unknown";
                    imageUrl = otherMember?.User.ProfilePictureUrl;
                }

                return new ConversationDto
                {
                    Id = c.Id,
                    Name = name,
                    IsGroup = c.IsGroup,
                    LastMessage = lastMessage?.Content,
                    LastMessageSentAt = lastMessage?.TimeStamp,
                    ImageUrl = imageUrl
                };
            })
            .OrderByDescending(c => c.LastMessageSentAt ?? DateTime.MinValue);
    }

    public async Task<ConversationDetailsDto?> GetConversationDetailsAsync(Guid conversationId, Guid currentUserId)
    {
        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null || conversation.Members.All(m => m.UserId != currentUserId)) return null;

        var lastMessage = conversation.Messages.OrderByDescending(m => m.TimeStamp).FirstOrDefault();
        string name = conversation.Name ?? "Unknown";
        string? imageUrl = conversation.ImageUrl;

        if (!conversation.IsGroup)
        {
            var otherMember = conversation.Members.FirstOrDefault(m => m.UserId != currentUserId);
            name = otherMember?.User.DisplayName ?? otherMember?.User.UserName ?? "Unknown";
            imageUrl = otherMember?.User.ProfilePictureUrl;
        }

        return new ConversationDetailsDto
        {
            Id = conversation.Id,
            Name = name,
            IsGroup = conversation.IsGroup,
            LastMessage = lastMessage?.Content,
            LastMessageSentAt = lastMessage?.TimeStamp,
            ImageUrl = imageUrl,
            Members = conversation.Members.Select(m => new ConversationMemberDto
            {
                UserId = m.UserId,
                Username = m.User.UserName ?? string.Empty,
                DisplayName = m.User.DisplayName,
                AvatarUrl = m.User.ProfilePictureUrl,
                IsAdmin = m.IsAdmin
            }).ToList()
        };
    }

    public async Task<Guid> CreatePrivateConversationAsync(Guid currentUserId, Guid targetUserId)
    {
        var existing = await unitOfWork.Conversations.GetPrivateConversationAsync(currentUserId, targetUserId);
        if (existing != null) return existing.Id;

        var conversation = new Conversation
        {
            IsGroup = false,
            CreatedAt = DateTime.UtcNow
        };

        unitOfWork.Conversations.Add(conversation);
        unitOfWork.Conversations.AddMember(new ConversationMember
            { UserId = currentUserId, Conversation = conversation });
        unitOfWork.Conversations.AddMember(
            new ConversationMember { UserId = targetUserId, Conversation = conversation });

        if (await unitOfWork.CompleteAsync())
        {
            var summary = await GetUserConversationsAsync(currentUserId);
            var createdConversation = summary.First(c => c.Id == conversation.Id);

            // Notify target user about new conversation
            await hubContext.Clients.User(targetUserId.ToString())
                .SendAsync("ConversationCreated", createdConversation);

            return conversation.Id;
        }

        throw new Exception("Failed to create private conversation.");
    }

    public async Task<Guid> CreateGroupConversationAsync(Guid creatorId, string name, List<Guid> memberIds)
    {
        if (!memberIds.Contains(creatorId)) memberIds.Add(creatorId);

        var conversation = new Conversation
        {
            Name = name,
            IsGroup = true,
            CreatedAt = DateTime.UtcNow
        };

        unitOfWork.Conversations.Add(conversation);

        foreach (var userId in memberIds)
        {
            unitOfWork.Conversations.AddMember(new ConversationMember
            {
                UserId = userId,
                Conversation = conversation,
                JoinedAt = DateTime.UtcNow,
                IsAdmin = userId == creatorId
            });
        }

        if (await unitOfWork.CompleteAsync())
        {
            var summary = new ConversationDto
            {
                Id = conversation.Id,
                Name = conversation.Name,
                IsGroup = true,
                ImageUrl = conversation.ImageUrl,
                LastMessageSentAt = conversation.CreatedAt
            };

            await hubContext.Clients.Users(memberIds.Select(id => id.ToString()))
                .SendAsync("ConversationCreated", summary);
            return conversation.Id;
        }

        throw new Exception("Failed to create group conversation.");
    }

    public async Task<bool> AddMemberAsync(Guid conversationId, Guid adminId, Guid targetUserId)
    {
        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null || !conversation.IsGroup) return false;

        var adminMember = conversation.Members.FirstOrDefault(m => m.UserId == adminId);
        if (adminMember == null || !adminMember.IsAdmin)
        {
            throw new UnauthorizedAccessException("User is not an admin of this group.");
        }

        if (conversation.Members.Any(m => m.UserId == targetUserId)) return false;

        var targetUser = await userManager.FindByIdAsync(targetUserId.ToString());
        if (targetUser == null) return false;

        var newMember = new ConversationMember
        {
            UserId = targetUserId,
            ConversationId = conversationId,
            JoinedAt = DateTime.UtcNow,
            IsAdmin = false
        };

        unitOfWork.Conversations.AddMember(newMember);

        if (await unitOfWork.CompleteAsync())
        {
            var memberDto = new ConversationMemberDto
            {
                UserId = targetUserId,
                Username = targetUser.UserName ?? string.Empty,
                DisplayName = targetUser.DisplayName,
                AvatarUrl = targetUser.ProfilePictureUrl,
                IsAdmin = false
            };

            await hubContext.Clients.Group($"room-{conversationId.ToString().ToLower()}").SendAsync("MemberAdded",
                new { ConversationId = conversationId, Member = memberDto });

            var summary = await GetConversationSummaryForUser(conversation, targetUserId);
            await hubContext.Clients.User(targetUserId.ToString()).SendAsync("ConversationCreated", summary);

            return true;
        }

        return false;
    }

    public async Task<bool> RemoveMemberAsync(Guid conversationId, Guid adminId, Guid targetUserId)
    {
        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null) return false;

        var adminMember = conversation.Members.FirstOrDefault(m => m.UserId == adminId);
        if (adminMember == null || !adminMember.IsAdmin)
        {
            throw new UnauthorizedAccessException("User is not an admin of this group.");
        }

        var targetMember = conversation.Members.FirstOrDefault(m => m.UserId == targetUserId);
        if (targetMember == null) return false;

        conversation.Members.Remove(targetMember);

        if (await unitOfWork.CompleteAsync())
        {
            await hubContext.Clients.Group($"room-{conversationId.ToString().ToLower()}").SendAsync("MemberRemoved",
                new { ConversationId = conversationId, UserId = targetUserId });
            return true;
        }

        return false;
    }

    public async Task<bool> LeaveConversationAsync(Guid conversationId, Guid userId)
    {
        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null || !conversation.IsGroup) return false;

        var member = conversation.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null) return false;

        conversation.Members.Remove(member);

        if (await unitOfWork.CompleteAsync())
        {
            await hubContext.Clients.Group($"room-{conversationId.ToString().ToLower()}").SendAsync("MemberRemoved",
                new { ConversationId = conversationId, UserId = userId });
            return true;
        }

        return false;
    }

    public async Task<bool> ChangeConversationNameAsync(Guid conversationId, Guid currentUserId, string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;

        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null) return false;

        if (conversation.IsGroup)
        {
            var adminMember = conversation.Members.FirstOrDefault(m => m.UserId == currentUserId);
            if (adminMember == null || !adminMember.IsAdmin)
            {
                throw new UnauthorizedAccessException("User is not an admin of this group.");
            }
        }
        else if (conversation.Members.All(m => m.UserId != currentUserId))
        {
            throw new UnauthorizedAccessException("User is not a member of this conversation.");
        }

        conversation.Name = name;

        if (await unitOfWork.CompleteAsync())
        {
            await hubContext.Clients.Group($"room-{conversationId.ToString().ToLower()}")
                .SendAsync("ConversationUpdated", new { Id = conversationId, Name = name });
            return true;
        }

        return false;
    }

    public async Task<bool> ChangeConversationImageAsync(Guid conversationId, Guid adminId, string imageUrl)
    {
        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null || !conversation.IsGroup) return false;

        var adminMember = conversation.Members.FirstOrDefault(m => m.UserId == adminId);
        if (adminMember == null || !adminMember.IsAdmin)
        {
            throw new UnauthorizedAccessException("User is not an admin of this group.");
        }

        conversation.ImageUrl = imageUrl;

        if (await unitOfWork.CompleteAsync())
        {
            await hubContext.Clients.Group($"room-{conversationId.ToString().ToLower()}")
                .SendAsync("ConversationUpdated", new { Id = conversationId, ImageUrl = imageUrl });
            return true;
        }

        return false;
    }

    private async Task<ConversationDto> GetConversationSummaryForUser(Conversation c, Guid userId)
    {
        var lastMessage = c.Messages.OrderByDescending(m => m.TimeStamp).FirstOrDefault();
        string name = c.Name ?? "Unknown";

        if (!c.IsGroup)
        {
            var otherMember = c.Members.FirstOrDefault(m => m.UserId != userId);
            name = otherMember?.User.DisplayName ?? otherMember?.User.UserName ?? "Unknown";
        }

        return new ConversationDto
        {
            Id = c.Id,
            Name = name,
            IsGroup = c.IsGroup,
            LastMessage = lastMessage?.Content,
            LastMessageSentAt = lastMessage?.TimeStamp,
            ImageUrl = c.ImageUrl
        };
    }
}