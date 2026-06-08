using Messy.API.DTOs;
using Messy.API.Models;

namespace Messy.API.Interfaces;

public interface IUserService
{
    Task<UserDetailsDto?> GetUserByIdAsync(string userId);
    Task<IEnumerable<UserDto>> SearchUsersAsync(string query, string currentUserId);
    Task<bool> UpdateUserInfoAsync(string userId, UpdateProfileDto updateDto);
    Task<bool> UpdateProfilePictureAsync(string userId, string photoUrl);
    Task UpdateUserStatusAsync(string username, string status);
    Task<Guid?> GetUserIdByUsernameAsync(string username);
}
