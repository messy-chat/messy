using System.Security.Claims;
using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Models;
using Messy.API.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Messy.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConversationsController(IChatService chatService, UserManager<User> userManager, IUnitOfWork unitOfWork) : ControllerBase
{
    [HttpPost("group")]
    public async Task<ActionResult<ApiResponse<Guid>>> CreateGroupConversation([FromBody] CreateGroupDto createGroupDto)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        if (!createGroupDto.MemberUserIds.Contains(currentUserId))
        {
            createGroupDto.MemberUserIds.Add(currentUserId);
        }

        var conversation = new Conversation
        {
            Title = createGroupDto.Name,
            IsGroup = true,
            CreatedAt = DateTime.UtcNow
        };

        unitOfWork.Conversations.Add(conversation);

        foreach (var userId in createGroupDto.MemberUserIds)
        {
            unitOfWork.Conversations.AddMember(new ConversationMember
            {
                UserId = userId,
                Conversation = conversation,
                JoinedAt = DateTime.UtcNow,
                IsAdmin = userId == currentUserId
            });
        }

        if (await unitOfWork.CompleteAsync())
        {
            return Ok(ApiResponse<Guid>.Ok(conversation.Id));
        }

        return BadRequest(ApiResponse<Guid>.Fail("Wystąpił błąd podczas tworzenia grupy."));
    }

    [HttpPost("{conversationId}/members")]
    public async Task<ActionResult<ApiResponse<object>>> AddMember(Guid conversationId, [FromBody] AddMemberDto addMemberDto)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null) return NotFound(ApiResponse<object>.Fail("Konwersacja nie została znaleziona."));
        if (!conversation.IsGroup) return BadRequest(ApiResponse<object>.Fail("Ta konwersacja nie jest grupą."));

        var currentUserMember = conversation.Members.FirstOrDefault(m => m.UserId == currentUserId);
        if (currentUserMember == null || !currentUserMember.IsAdmin)
        {
            return Forbid();
        }

        if (conversation.Members.Any(m => m.UserId == addMemberDto.UserId))
        {
            return BadRequest(ApiResponse<object>.Fail("Użytkownik jest już członkiem tej grupy."));
        }

        unitOfWork.Conversations.AddMember(new ConversationMember
        {
            UserId = addMemberDto.UserId,
            ConversationId = conversationId,
            JoinedAt = DateTime.UtcNow,
            IsAdmin = false
        });

        if (await unitOfWork.CompleteAsync()) return Ok(ApiResponse<object>.Ok(null, "Użytkownik został dodany do grupy."));

        return BadRequest(ApiResponse<object>.Fail("Nie udało się dodać użytkownika."));
    }

    [HttpDelete("{conversationId}/members/{targetUserId}")]
    public async Task<ActionResult<ApiResponse<object>>> RemoveMember(Guid conversationId, string targetUserId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null) return NotFound(ApiResponse<object>.Fail("Konwersacja nie została znaleziona."));
        
        var currentUserMember = conversation.Members.FirstOrDefault(m => m.UserId == currentUserId);
        if (currentUserMember == null || !currentUserMember.IsAdmin)
        {
            return Forbid();
        }

        var targetMember = conversation.Members.FirstOrDefault(m => m.UserId == targetUserId);
        if (targetMember == null) return NotFound(ApiResponse<object>.Fail("Użytkownik nie jest członkiem tej grupy."));

        conversation.Members.Remove(targetMember);

        if (await unitOfWork.CompleteAsync()) return Ok(ApiResponse<object>.Ok(null, "Użytkownik został usunięty z grupy."));

        return BadRequest(ApiResponse<object>.Fail("Nie udało się usunąć użytkownika."));
    }

    [HttpDelete("{conversationId}/leave")]
    public async Task<ActionResult<ApiResponse<object>>> LeaveGroup(Guid conversationId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var conversation = await unitOfWork.Conversations.GetConversationWithMembersAsync(conversationId);
        if (conversation == null) return NotFound(ApiResponse<object>.Fail("Konwersacja nie została znaleziona."));
        if (!conversation.IsGroup) return BadRequest(ApiResponse<object>.Fail("Możesz opuścić tylko grupy."));

        var member = conversation.Members.FirstOrDefault(m => m.UserId == currentUserId);
        if (member == null) return BadRequest(ApiResponse<object>.Fail("Nie jesteś członkiem tej grupy."));

        conversation.Members.Remove(member);

        if (await unitOfWork.CompleteAsync()) return Ok(ApiResponse<object>.Ok(null, "Opuściłeś grupę."));

        return BadRequest(ApiResponse<object>.Fail("Nie udało się opuścić grupy."));
    }

    [HttpPost("private/{targetUsername}")]
    public async Task<ActionResult<ApiResponse<Guid>>> CreatePrivateConversation(string targetUsername)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var targetUser = await userManager.FindByNameAsync(targetUsername);
        if (targetUser == null)
        {
            return NotFound(ApiResponse<Guid>.Fail("Użytkownik nie został znaleziony."));
        }

        if (currentUserId == targetUser.Id)
        {
            return BadRequest(ApiResponse<Guid>.Fail("Nie możesz rozpocząć czatu ze samym sobą."));
        }

        var conversationId = await chatService.GetOrCreatePrivateConversationAsync(currentUserId, targetUser.Id);
        return Ok(ApiResponse<Guid>.Ok(conversationId));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<ConversationDto>>>> GetMyConversations()
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var conversations = await chatService.GetUserConversationsAsync(currentUserId);
        return Ok(ApiResponse<IEnumerable<ConversationDto>>.Ok(conversations));
    }

    [HttpGet("{conversationId}")]
    public async Task<ActionResult<ApiResponse<ConversationDto>>> GetConversation(Guid conversationId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var conversation = await chatService.GetConversationAsync(conversationId, currentUserId);
        if (conversation == null) return NotFound(ApiResponse<ConversationDto>.Fail("Konwersacja nie została znaleziona lub nie masz do niej dostępu."));

        return Ok(ApiResponse<ConversationDto>.Ok(conversation));
    }

    [HttpGet("{conversationId}/messages")]
    public async Task<ActionResult<ApiResponse<IEnumerable<MessageDto>>>> GetMessages(Guid conversationId, [FromQuery] Guid? beforeMessageId = null, [FromQuery] int pageSize = 50)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        try
        {
            var messages = await chatService.GetConversationMessagesAsync(conversationId, currentUserId, beforeMessageId, pageSize);
            return Ok(ApiResponse<IEnumerable<MessageDto>>.Ok(messages));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
