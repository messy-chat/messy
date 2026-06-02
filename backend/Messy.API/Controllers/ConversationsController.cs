using System.Security.Claims;
using Messy.API.Data;
using Messy.API.DTOs;
using Messy.API.Models;
using Messy.API.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Messy.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConversationsController : ControllerBase
{
    private readonly MessyDbContext _context;

    public ConversationsController(MessyDbContext context)
    {
        _context = context;
    }

    [HttpPost("private/{targetUserId}")]
    public async Task<ActionResult<ApiResponse<Guid>>> CreatePrivateConversation(string targetUserId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        if (currentUserId == targetUserId)
        {
            return BadRequest(ApiResponse<Guid>.Fail("You cannot start a chat with yourself."));
        }

        var existingConversation = await _context.Conversations
            .Where(c => !c.IsGroup)
            .Where(c => c.Members.Any(m => m.UserId == currentUserId) && c.Members.Any(m => m.UserId == targetUserId))
            .FirstOrDefaultAsync();

        if (existingConversation != null)
        {
            return Ok(ApiResponse<Guid>.Ok(existingConversation.Id));
        }

        var conversation = new Conversation
        {
            IsGroup = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Conversations.Add(conversation);

        _context.ConversationMembers.AddRange(
            new ConversationMember { UserId = currentUserId, Conversation = conversation },
            new ConversationMember { UserId = targetUserId, Conversation = conversation }
        );

        await _context.SaveChangesAsync();

        return Ok(ApiResponse<Guid>.Ok(conversation.Id));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<ConversationDto>>>> GetMyConversations()
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var conversations = await _context.Conversations
            .Where(c => c.Members.Any(m => m.UserId == currentUserId))
            .Include(c => c.Members)
                .ThenInclude(m => m.User)
            .Include(c => c.Messages.OrderByDescending(m => m.TimeStamp).Take(1))
            .ToListAsync();

        var conversationDtos = conversations.Select(c =>
        {
            var lastMessage = c.Messages.OrderByDescending(m => m.TimeStamp).FirstOrDefault();
            
            string name = c.Title ?? "Unknown";
            if (!c.IsGroup)
            {
                var otherMember = c.Members.FirstOrDefault(m => m.UserId != currentUserId);
                name = otherMember?.User.DisplayName ?? otherMember?.User.UserName ?? "Unknown";
            }

            return new ConversationDto
            {
                Id = c.Id,
                Name = name,
                IsGroup = c.IsGroup,
                LastMessage = lastMessage?.Content,
                LastMessageSentAt = lastMessage?.TimeStamp
            };
        })
        .OrderByDescending(c => c.LastMessageSentAt ?? DateTime.MinValue)
        .ToList();

        return Ok(ApiResponse<IEnumerable<ConversationDto>>.Ok(conversationDtos));
    }

    [HttpGet("{conversationId}/messages")]
    public async Task<ActionResult<ApiResponse<IEnumerable<MessageDto>>>> GetMessages(Guid conversationId, [FromQuery] Guid? beforeMessageId = null, [FromQuery] int pageSize = 50)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        // Check membership
        var isMember = await _context.ConversationMembers
            .AnyAsync(m => m.ConversationId == conversationId && m.UserId == currentUserId);

        if (!isMember) return Forbid();

        var query = _context.Messages
            .Where(m => m.ConversationId == conversationId);

        if (beforeMessageId.HasValue && beforeMessageId.Value != Guid.Empty)
        {
            var cursorMessage = await _context.Messages
                .FirstOrDefaultAsync(m => m.Id == beforeMessageId.Value);

            if (cursorMessage == null)
            {
                return Ok(ApiResponse<IEnumerable<MessageDto>>.Ok(Enumerable.Empty<MessageDto>()));
            }

            query = query.Where(m => m.TimeStamp < cursorMessage.TimeStamp);
        }

        var messages = await query
            .Include(m => m.Sender)
            .OrderByDescending(m => m.TimeStamp)
            .Take(pageSize)
            .ToListAsync();

        var messageDtos = messages.Select(m => new MessageDto
        {
            Id = m.Id,
            SenderId = m.SenderId,
            SenderName = m.Sender.DisplayName ?? m.Sender.UserName ?? "Unknown",
            Content = m.Content,
            SentAt = m.TimeStamp,
            IsRead = false
        })
        .Reverse()
        .ToList();

        return Ok(ApiResponse<IEnumerable<MessageDto>>.Ok(messageDtos));
    }
}