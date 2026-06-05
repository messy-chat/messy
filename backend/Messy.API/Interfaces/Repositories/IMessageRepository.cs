using Messy.API.Models;

namespace Messy.API.Interfaces.Repositories;

public interface IMessageRepository
{
    Task<IEnumerable<Message>> GetMessagesAsync(Guid conversationId, DateTime? before = null, int pageSize = 50);
    void Add(Message message);
}
