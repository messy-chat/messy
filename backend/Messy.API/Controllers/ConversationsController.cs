using System.Security.Claims;
using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Messy.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConversationsController(IChatService chatService) : ControllerBase
{
    [HttpPost("private/{targetUserId}")]
    public async Task<ActionResult<ApiResponse<Guid>>> CreatePrivateConversation(string targetUserId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        if (currentUserId == targetUserId)
        {
            return BadRequest(ApiResponse<Guid>.Fail("You cannot start a chat with yourself."));
        }

        var conversationId = await chatService.GetOrCreatePrivateConversationAsync(currentUserId, targetUserId);
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
