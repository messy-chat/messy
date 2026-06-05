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
public class ConversationsController(IChatService chatService, UserManager<User> userManager) : ControllerBase
{
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
