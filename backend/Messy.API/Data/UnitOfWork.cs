using Messy.API.Data.Repositories;
using Messy.API.Interfaces;
using Messy.API.Interfaces.Repositories;

namespace Messy.API.Data;

public class UnitOfWork(MessyDbContext context) : IUnitOfWork
{
    private IConversationRepository? _conversations;
    private IMessageRepository? _messages;

    public IConversationRepository Conversations => _conversations ??= new ConversationRepository(context);
    public IMessageRepository Messages => _messages ??= new MessageRepository(context);

    public async Task<bool> CompleteAsync()
    {
        return await context.SaveChangesAsync() > 0;
    }

    public void Dispose()
    {
        context.Dispose();
    }
}
