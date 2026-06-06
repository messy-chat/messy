using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Messy.API.SignalR;

[Authorize]
public class ChatHub : Hub
{
    private readonly PresenceTracker _tracker;
    private readonly UserManager<User> _userManager;
    private readonly IUnitOfWork _unitOfWork;

    public ChatHub(PresenceTracker tracker, UserManager<User> userManager, IUnitOfWork unitOfWork)
    {
        _tracker = tracker;
        _userManager = userManager;
        _unitOfWork = unitOfWork;
    }

    public async Task JoinConversation(Guid conversationId)
    {
        var currentUserId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null) throw new HubException("Unauthorized");

        var conversation = await _unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null || !conversation.Members.Any(m => m.UserId == currentUserId))
        {
            throw new HubException("User is not a member of this conversation.");
        }

        var roomName = $"room-{conversationId.ToString().ToLower()}";
        await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
    }

    public async Task LeaveConversation(Guid conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"room-{conversationId.ToString().ToLower()}");
    }

    public async Task SendMessage(Guid conversationId, string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return;

        var currentUserId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null) throw new HubException("Unauthorized");

        var conversation = await _unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null || !conversation.Members.Any(m => m.UserId == currentUserId))
        {
            throw new HubException("User is not a member of this conversation.");
        }

        var currentUser = await _userManager.FindByIdAsync(currentUserId);
        if (currentUser == null) throw new HubException("User not found");

        var message = new Message
        {
            ConversationId = conversationId,
            SenderId = currentUserId,
            Content = content,
            TimeStamp = DateTime.UtcNow,
            IsRead = false
        };

        _unitOfWork.Messages.Add(message);

        if (await _unitOfWork.CompleteAsync())
        {
            var messageDto = new MessageDto
            {
                Id = message.Id,
                SenderId = message.SenderId,
                SenderName = currentUser.DisplayName ?? currentUser.UserName ?? "Unknown",
                Content = message.Content,
                SentAt = message.TimeStamp,
                IsRead = message.IsRead
            };

            await Clients.Group($"room-{conversationId.ToString().ToLower()}").SendAsync("NewMessage", messageDto);
        }
    }

    public override async Task OnConnectedAsync()
    {
        var username = Context.User?.Identity?.Name;
        if (username == null) return;

        var isOnline = await _tracker.UserConnected(username, Context.ConnectionId);

        if (isOnline)
        {
            await UpdateUserStatusInDb(username, "Online");
            
            await Clients.Others.SendAsync("UserIsOnline", username);
        }

        var currentUsers = await _tracker.GetOnlineUsers();
        await Clients.Caller.SendAsync("GetOnlineUsers", currentUsers);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var username = Context.User?.Identity?.Name;
        if (username == null) return;

        var isOffline = await _tracker.UserDisconnected(username, Context.ConnectionId);

        if (isOffline)
        {
            await UpdateUserStatusInDb(username, "Offline");
            
            await Clients.Others.SendAsync("UserIsOffline", username);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task UpdateUserStatusInDb(string username, string status)
    {
        var user = await _userManager.FindByNameAsync(username);
        if (user != null)
        {
            user.Status = status;
            user.LastSeen = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);
        }
    }
}