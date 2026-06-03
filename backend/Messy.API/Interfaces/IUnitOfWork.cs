using Messy.API.Interfaces.Repositories;

namespace Messy.API.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IConversationRepository Conversations { get; }
    IMessageRepository Messages { get; }
    Task<bool> CompleteAsync();
}
