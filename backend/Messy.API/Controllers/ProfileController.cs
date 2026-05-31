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
public class ProfileController(UserManager<User> userManager, IPhotoService photoService) : ControllerBase
{
        [HttpPost("photo")]
        public async Task<ActionResult<ApiResponse<string>>> UploadProfilePicture(IFormFile file)
        {
                if (file == null || file.Length == 0)
                {
                        return BadRequest(ApiResponse<string>.Fail("Nie przesłano pliku."));
                }

                var photoUrl = await photoService.UploadPhotoAsync(file);
                
                var user = await userManager.GetUserAsync(User);
                if (user == null)
                {
                        return Unauthorized(ApiResponse<object>.Fail("Nie znaleziono użytkownika lub sesja wygasła."));
                }
                
                user.ProfilePictureUrl = photoUrl;
                var result = await userManager.UpdateAsync(user);

                if (!result.Succeeded)
                {
                        return BadRequest(ApiResponse<string>.Fail("Nie udało się zmienić zdjęcia profilowego."));
                }

                return Ok(ApiResponse<string>.Ok(photoUrl, "Zdjęcie profilowe zostało zaktualizowane."));
        }
        
        [HttpPut("update")]
        public async Task<ActionResult<ApiResponse<object>>> UpdateProfile(UpdateProfileDto updateDto)
        {
                var user = await userManager.GetUserAsync(User);
        
                if (user == null) 
                {
                        return Unauthorized(ApiResponse<object>.Fail("Nie znaleziono użytkownika lub sesja wygasła."));
                }

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

                if (!result.Succeeded)
                {
                        var errors = result.Errors.Select(e => e.Description).ToList();
                        return BadRequest(ApiResponse<object>.Fail("Nie udało się zaktualizować profilu.", errors));
                }

                return Ok(ApiResponse<object>.Ok(null, "Twój profil został pomyślnie zaktualizowany."));
        }
        
        [HttpGet]
        public async Task<ActionResult<ApiResponse<ProfileDto>>> GetProfile()
        {
                var user = await userManager.GetUserAsync(User);
                if (user == null) return Unauthorized(ApiResponse<ProfileDto>.Fail("Nie znaleziono użytkownika."));

                var profile = new ProfileDto
                {
                        Username = user.UserName!,
                        Email = user.Email!,
                        DisplayName = user.DisplayName,
                        ProfilePictureUrl = user.ProfilePictureUrl,
                        Bio = user.Bio,
                        Status = user.Status
                };

                return Ok(ApiResponse<ProfileDto>.Ok(profile, "Pobrano profil."));
        }
}