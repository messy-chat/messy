using Messy.API.Models;

namespace Messy.API.Interfaces.Repositories;

public interface IConversationRepository
{
    Task<Conversation?> GetConversationWithMembersAsync(Guid id);
    Task<Conversation?> GetPrivateConversationAsync(string userId1, string userId2);
    Task<IEnumerable<Conversation>> GetUserConversationsWithLastMessageAsync(string userId);
    void Add(Conversation conversation);
    void AddMember(ConversationMember member);
}
