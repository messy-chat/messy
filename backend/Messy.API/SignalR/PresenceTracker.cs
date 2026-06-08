namespace Messy.API.SignalR;

public class PresenceTracker
{
    private static readonly Dictionary<string, List<string>> OnlineUsers = new();

    public Task<bool> UserConnected(string userId, string connectionId)
    {
        bool isOnline = false;

        lock (OnlineUsers)
        {
            if (OnlineUsers.ContainsKey(userId))
            {
                OnlineUsers[userId].Add(connectionId);
            }
            else
            {
                OnlineUsers.Add(userId, new List<string> { connectionId });
                isOnline = true;
            }
        }

        return Task.FromResult(isOnline);
    }
    
    public Task<bool> UserDisconnected(string userId, string connectionId)
    {
        bool isOffline = false;

        lock (OnlineUsers)
        {
            if (!OnlineUsers.ContainsKey(userId)) return Task.FromResult(isOffline);

            OnlineUsers[userId].Remove(connectionId);

            if (OnlineUsers[userId].Count == 0)
            {
                OnlineUsers.Remove(userId);
                isOffline = true;
            }
        }

        return Task.FromResult(isOffline);
    }

    public Task<string[]> GetOnlineUserIds()
    {
        string[] onlineUserIds;
        lock (OnlineUsers)
        {
            onlineUserIds = OnlineUsers.OrderBy(k => k.Key).Select(k => k.Key).ToArray();
        }

        return Task.FromResult(onlineUserIds);
    }
}