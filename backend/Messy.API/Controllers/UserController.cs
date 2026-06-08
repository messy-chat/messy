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
public class UserController(IUserService userService, IPhotoService photoService) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<UserDetailsDto>>> GetMyProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail("Session expired."));

        var profile = await userService.GetUserByIdAsync(userId);
        if (profile == null) return NotFound(ApiResponse<object>.Fail("User not found."));

        return Ok(ApiResponse<UserDetailsDto>.Ok(profile, "Profile retrieved."));
    }

    [HttpPut("update")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateProfile(UpdateProfileDto updateDto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail("Session expired."));

        var success = await userService.UpdateUserInfoAsync(userId, updateDto);
        if (!success) return BadRequest(ApiResponse<object>.Fail("Failed to update profile."));

        return Ok(ApiResponse<object>.Ok(null, "Your profile has been successfully updated."));
    }

    [HttpPost("photo")]
    [RequestSizeLimit(10485760)]
    public async Task<ActionResult<ApiResponse<string>>> UploadProfilePicture(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<string>.Fail("No file uploaded."));
        }

        const long maxFileSize = 10 * 1024 * 1024; // 10 MB
        if (file.Length > maxFileSize)
        {
            return BadRequest(ApiResponse<string>.Fail("The file exceeds the maximum allowed size of 10 MB."));
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponse<string>.Fail("Session expired."));

        var photoUrl = await photoService.UploadPhotoAsync(file);
        var success = await userService.UpdateProfilePictureAsync(userId, photoUrl);

        if (!success)
        {
            return BadRequest(ApiResponse<string>.Fail("Failed to update profile picture."));
        }

        return Ok(ApiResponse<string>.Ok(photoUrl, "Profile picture updated."));
    }

    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<IEnumerable<UserDto>>>> SearchUsers([FromQuery] string query)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var users = await userService.SearchUsersAsync(query, userId);
        return Ok(ApiResponse<IEnumerable<UserDto>>.Ok(users));
    }
}
