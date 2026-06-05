using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Messy.API.Services;

public class UserService(UserManager<User> userManager) : IUserService
{
    public async Task<ProfileDto?> GetProfileByIdAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user == null) return null;

        return MapToProfileDto(user);
    }

    public async Task<IEnumerable<ProfileDto>> SearchUsersAsync(string query, string currentUserId)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Enumerable.Empty<ProfileDto>();
        }

        var searchTerm = query.ToLower();

        var users = await userManager.Users
            .Where(u => u.Id != currentUserId &&
                        ((u.UserName != null && u.UserName.ToLower().Contains(searchTerm)) ||
                         (u.DisplayName != null && u.DisplayName.ToLower().Contains(searchTerm))))
            .Take(10)
            .ToListAsync();

        return users.Select(MapToProfileDto);
    }

    public async Task<bool> UpdateProfileAsync(string userId, UpdateProfileDto updateDto)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user == null) return false;

        if (!string.IsNullOrWhiteSpace(updateDto.DisplayName))
        {
            user.DisplayName = updateDto.DisplayName;
        }

        if (updateDto.Bio != null)
        {
            user.Bio = updateDto.Bio;
        }

        if (!string.IsNullOrWhiteSpace(updateDto.Status))
        {
            user.Status = updateDto.Status;
        }

        var result = await userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    public async Task<bool> UpdateProfilePictureAsync(string userId, string photoUrl)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user == null) return false;

        user.ProfilePictureUrl = photoUrl;
        var result = await userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    private static ProfileDto MapToProfileDto(User user)
    {
        return new ProfileDto
        {
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName,
            ProfilePictureUrl = user.ProfilePictureUrl,
            Bio = user.Bio,
            Status = user.Status
        };
    }
}
