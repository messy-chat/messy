using Messy.API.Data;
using Messy.API.Interfaces.Repositories;
using Messy.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Messy.API.Data.Repositories;

public class ConversationRepository(MessyDbContext context) : IConversationRepository
{
    public async Task<Conversation?> GetConversationWithMembersAsync(Guid id)
    {
        return await context.Conversations
            .Include(c => c.Members)
            .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<Conversation?> GetPrivateConversationAsync(string userId1, string userId2)
    {
        return await context.Conversations
            .Where(c => !c.IsGroup)
            .Where(c => c.Members.Any(m => m.UserId == userId1) && c.Members.Any(m => m.UserId == userId2))
            .FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<Conversation>> GetUserConversationsWithLastMessageAsync(string userId)
    {
        return await context.Conversations
            .Where(c => c.Members.Any(m => m.UserId == userId))
            .Include(c => c.Members)
                .ThenInclude(m => m.User)
            .Include(c => c.Messages.OrderByDescending(m => m.TimeStamp).Take(1))
            .ToListAsync();
    }

    public void Add(Conversation conversation)
    {
        context.Conversations.Add(conversation);
    }

    public void AddMember(ConversationMember member)
    {
        context.ConversationMembers.Add(member);
    }
}
