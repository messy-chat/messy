using Messy.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;

namespace Messy.API.SignalR;

[Authorize]
public class ChatHub : Hub
{
    private readonly PresenceTracker _tracker;
    private readonly UserManager<User> _userManager;

    public ChatHub(PresenceTracker tracker, UserManager<User> userManager)
    {
        _tracker = tracker;
        _userManager = userManager;
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