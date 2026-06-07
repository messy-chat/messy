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
public class ConversationsController(
    IConversationService conversationService, 
    IMessageService messageService,
    IPhotoService photoService, 
    IUserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<ConversationDto>>>> GetMyConversations()
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        var conversations = await conversationService.GetUserConversationsAsync(currentUserId);
        return Ok(ApiResponse<IEnumerable<ConversationDto>>.Ok(conversations));
    }

    [HttpPost("group")]
    public async Task<ActionResult<ApiResponse<Guid>>> CreateGroupConversation([FromBody] CreateGroupDto createGroupDto)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        try
        {
            var memberIds = createGroupDto.MemberUserIds.Select(Guid.Parse).ToList();
            var conversationId = await conversationService.CreateGroupConversationAsync(currentUserId, createGroupDto.Name, memberIds);
            return Ok(ApiResponse<Guid>.Ok(conversationId));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<Guid>.Fail(ex.Message));
        }
    }

    [HttpPost("{conversationId}/image")]
    [RequestSizeLimit(10485760)]
    public async Task<ActionResult<ApiResponse<string>>> UploadGroupImage(Guid conversationId, IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(ApiResponse<string>.Fail("No file uploaded."));

        const long maxFileSize = 10 * 1024 * 1024; // 10 MB
        if (file.Length > maxFileSize)
        {
            return BadRequest(ApiResponse<string>.Fail("File exceeds the maximum allowed size of 10 MB."));
        }

        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        try
        {
            var imageUrl = await photoService.UploadPhotoAsync(file);
            var success = await conversationService.ChangeConversationImageAsync(conversationId, currentUserId, imageUrl);
            
            if (success) return Ok(ApiResponse<string>.Ok(imageUrl));
            return BadRequest(ApiResponse<string>.Fail("Failed to update group image."));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.Fail(ex.Message));
        }
    }

    [HttpPut("{conversationId}/name")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateConversationName(Guid conversationId, [FromBody] UpdateConversationNameDto updateDto)
    {
        if (string.IsNullOrWhiteSpace(updateDto.Name)) return BadRequest(ApiResponse<object>.Fail("Name cannot be empty."));

        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        try
        {
            var success = await conversationService.ChangeConversationNameAsync(conversationId, currentUserId, updateDto.Name);
            if (success) return Ok(ApiResponse<object>.Ok(null, "Conversation name updated."));
            return BadRequest(ApiResponse<object>.Fail("Failed to update conversation name."));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPost("{conversationId}/members")]
    public async Task<ActionResult<ApiResponse<bool>>> AddMember(Guid conversationId, [FromBody] AddMemberDto addMemberDto)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        try
        {
            var targetUserId = Guid.Parse(addMemberDto.UserId);
            var success = await conversationService.AddMemberAsync(conversationId, currentUserId, targetUserId);
            if (success) return Ok(ApiResponse<bool>.Ok(true));
            return BadRequest(ApiResponse<bool>.Fail("Failed to add user to group."));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }

    [HttpDelete("{conversationId}/members/{targetUserId}")]
    public async Task<ActionResult<ApiResponse<object>>> RemoveMember(Guid conversationId, string targetUserId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        try
        {
            var targetId = Guid.Parse(targetUserId);
            var success = await conversationService.RemoveMemberAsync(conversationId, currentUserId, targetId);
            if (success) return Ok(ApiResponse<object>.Ok(null, "User removed from group."));
            return BadRequest(ApiResponse<object>.Fail("Failed to remove user."));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpDelete("{conversationId}/leave")]
    public async Task<ActionResult<ApiResponse<object>>> LeaveGroup(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        try
        {
            var success = await conversationService.LeaveConversationAsync(conversationId, currentUserId);
            if (success) return Ok(ApiResponse<object>.Ok(null, "You left the group."));
            return BadRequest(ApiResponse<object>.Fail("Failed to leave group."));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPost("private/{targetUsername}")]
    public async Task<ActionResult<ApiResponse<Guid>>> CreatePrivateConversation(string targetUsername)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        var targetUserId = await userService.GetUserIdByUsernameAsync(targetUsername);
        if (targetUserId == null)
        {
            return NotFound(ApiResponse<Guid>.Fail("User not found."));
        }

        if (currentUserId == targetUserId.Value)
        {
            return BadRequest(ApiResponse<Guid>.Fail("You cannot start a chat with yourself."));
        }

        var conversationId = await conversationService.CreatePrivateConversationAsync(currentUserId, targetUserId.Value);
        return Ok(ApiResponse<Guid>.Ok(conversationId));
    }

    [HttpGet("{conversationId}")]
    public async Task<ActionResult<ApiResponse<ConversationDetailsDto>>> GetConversation(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        var conversation = await conversationService.GetConversationDetailsAsync(conversationId, currentUserId);
        if (conversation == null) return NotFound(ApiResponse<ConversationDetailsDto>.Fail("Conversation not found or access denied."));

        return Ok(ApiResponse<ConversationDetailsDto>.Ok(conversation));
    }

    [HttpGet("{conversationId}/messages")]
    public async Task<ActionResult<ApiResponse<IEnumerable<MessageDto>>>> GetMessages(Guid conversationId, [FromQuery] Guid? beforeMessageId = null, [FromQuery] int pageSize = 50)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty) return Unauthorized();

        try
        {
            var messages = await messageService.GetConversationMessagesAsync(conversationId, currentUserId, beforeMessageId, pageSize);
            return Ok(ApiResponse<IEnumerable<MessageDto>>.Ok(messages));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    private Guid GetCurrentUserId()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(userIdStr) ? Guid.Empty : Guid.Parse(userIdStr);
    }
}
