using Messy.API.Data;
using Messy.API.Interfaces.Repositories;
using Messy.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Messy.API.Data.Repositories;

public class MessageRepository(MessyDbContext context) : IMessageRepository
{
    public async Task<IEnumerable<Message>> GetMessagesAsync(Guid conversationId, DateTime? before = null, int pageSize = 50)
    {
        var query = context.Messages
            .Where(m => m.ConversationId == conversationId);

        if (before.HasValue)
        {
            query = query.Where(m => m.TimeStamp < before.Value);
        }

        return await query
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .OrderByDescending(m => m.TimeStamp)
            .Take(pageSize)
            .ToListAsync();
    }

    public void Add(Message message)
    {
        context.Messages.AddAsync(message);
    }
}
