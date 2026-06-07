using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Messy.API.Services;

public class UserService(UserManager<User> userManager) : IUserService
{
    public async Task<UserDetailsDto?> GetUserByIdAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user == null) return null;

        return MapToUserDetailsDto(user);
    }

    public async Task<IEnumerable<UserDto>> SearchUsersAsync(string query, string currentUserId)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Enumerable.Empty<UserDto>();
        }

        var searchTerm = query.ToLower();

        var users = await userManager.Users
            .Where(u => u.Id.Equals(currentUserId) &&
                        ((u.UserName != null && u.UserName.ToLower().Contains(searchTerm)) ||
                         (u.DisplayName != null && u.DisplayName.ToLower().Contains(searchTerm))))
            .Take(10)
            .ToListAsync();

        return users.Select(MapToUserDto);
    }

    public async Task<bool> UpdateUserInfoAsync(string userId, UpdateProfileDto updateDto)
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

    public async Task UpdateUserStatusAsync(string username, string status)
    {
        var user = await userManager.FindByNameAsync(username);
        if (user != null)
        {
            user.Status = status;
            user.LastSeen = DateTime.UtcNow;
            await userManager.UpdateAsync(user);
        }
    }

    public async Task<Guid?> GetUserIdByUsernameAsync(string username)
    {
        var user = await userManager.FindByNameAsync(username);
        return user?.Id;
    }

    private static UserDetailsDto MapToUserDetailsDto(User user)
    {
        return new UserDetailsDto
        {
            Id = user.Id,
            Username = user.UserName ?? string.Empty,
            DisplayName = user.DisplayName,
            AvatarUrl = user.ProfilePictureUrl,
            Bio = user.Bio,
            Status = user.Status
        };
    }
    
    private static UserDto MapToUserDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Username = user.UserName ?? string.Empty,
            DisplayName = user.DisplayName,
            AvatarUrl = user.ProfilePictureUrl,
        };
    }
}
