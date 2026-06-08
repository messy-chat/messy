using Messy.API.DTOs;
using Messy.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Messy.API.SignalR;

[Authorize]
public class ChatHub(
    PresenceTracker tracker, 
    IConversationService conversationService, 
    IMessageService messageService,
    IUserService userService) : Hub
{
    public async Task JoinConversation(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) throw new HubException("Unauthorized");

        var conversation = await conversationService.GetConversationDetailsAsync(conversationId, currentUserId);
        if (conversation == null)
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

    public async Task SendMessage(Guid conversationId, string? content, List<AttachmentDto>? attachments)
    {
        if (string.IsNullOrWhiteSpace(content) && (attachments == null || attachments.Count == 0)) return;

        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) throw new HubException("Unauthorized");

        try
        {
            var messageDto = await messageService.SaveMessageAsync(conversationId, currentUserId, content, attachments);

            var conversation = await conversationService.GetConversationDetailsAsync(conversationId, currentUserId);
            if (conversation == null) throw new HubException("Conversation not found");

            var memberIds = conversation.Members.Select(m => m.UserId.ToString()).ToList();
            await Clients.Users(memberIds).SendAsync("NewMessage", messageDto);
        }
        catch (UnauthorizedAccessException ex)
        {
            throw new HubException(ex.Message);
        }
        catch (Exception)
        {
            throw new HubException("Failed to send message");
        }
    }

    public async Task UserTyping(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        var userName = Context.User?.Identity?.Name;

        if (currentUserId == Guid.Empty || userName == null) return;

        var roomName = $"room-{conversationId.ToString().ToLower()}";
        await Clients.OthersInGroup(roomName).SendAsync("OnUserTyping", new { UserId = currentUserId, UserName = userName });
    }

    public async Task UserStoppedTyping(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return;

        var roomName = $"room-{conversationId.ToString().ToLower()}";
        await Clients.OthersInGroup(roomName).SendAsync("OnUserStoppedTyping", new { UserId = currentUserId });
    }

    public override async Task OnConnectedAsync()
    {
        var currentUserId = GetCurrentUserId();
        var username = Context.User?.Identity!.Name;
        
        if (currentUserId == Guid.Empty || username == null) return;

        var isOnline = await tracker.UserConnected(currentUserId.ToString(), Context.ConnectionId);

        if (isOnline)
        {
            await Clients.Others.SendAsync("UserIsOnline", currentUserId.ToString());
        }

        var userIds = await tracker.GetOnlineUserIds();
        await Clients.Caller.SendAsync("GetOnlineUsers", userIds);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var currentUserId = GetCurrentUserId();
        var username = Context.User?.Identity?.Name;
        if (currentUserId == Guid.Empty || username == null) return;

        var isOffline = await tracker.UserDisconnected(currentUserId.ToString(), Context.ConnectionId);

        if (isOffline)
        {
            await Clients.Others.SendAsync("UserIsOffline", currentUserId.ToString());
        }

        await base.OnDisconnectedAsync(exception);
    }

    private Guid GetCurrentUserId()
    {
        var userIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(userIdStr) ? Guid.Empty : Guid.Parse(userIdStr);
    }
}
