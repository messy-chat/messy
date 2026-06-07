using Messy.API.Models;

namespace Messy.API.Interfaces.Repositories;

public interface IConversationRepository
{
    Task<Conversation?> GetConversationWithMembersAsync(Guid id);
    Task<Conversation?> GetPrivateConversationAsync(Guid userId1, Guid userId2);
    Task<IEnumerable<Conversation>> GetUserConversationsWithLastMessageAsync(Guid userId);
    void Add(Conversation conversation);
    void AddMember(ConversationMember member);
}
