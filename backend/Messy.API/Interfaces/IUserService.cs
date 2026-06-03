using Messy.API.DTOs;
using Messy.API.Models;

namespace Messy.API.Interfaces;

public interface IUserService
{
    Task<ProfileDto?> GetProfileByIdAsync(string userId);
    Task<IEnumerable<ProfileDto>> SearchUsersAsync(string query, string currentUserId);
    Task<bool> UpdateProfileAsync(string userId, UpdateProfileDto updateDto);
    Task<bool> UpdateProfilePictureAsync(string userId, string photoUrl);
}
