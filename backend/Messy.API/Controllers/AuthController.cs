using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Models;
using Messy.API.Wrappers;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Messy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly ITokenService _tokenService;

    public AuthController(UserManager<User> userManager, ITokenService tokenService)
    {
        _userManager = userManager;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto registerDto)
    {
        if (await _userManager.Users.AnyAsync(u => u.Email == registerDto.Email.ToLower()))
        {
            return BadRequest(ApiResponse<object>.Fail(
                "Rejestracja nie powiodła się.",
                ["Ten adres email jest już zajęty."]));
        }

        var user = new User
        {
            UserName = registerDto.Username,
            Email = registerDto.Email,
            DisplayName = registerDto.Username,
            Status = "Offline"
        };

        var result = await _userManager.CreateAsync(user, registerDto.Password);

        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToList();
            return BadRequest(ApiResponse<object>.Fail(
                "Nie spełniono wymagań rejestracji.",
                errors));
        }

        return Ok(ApiResponse<object>.Ok(
            null,
            "Rejestracja przebiegła pomyślnie"
        ));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto loginDto)
    {
        var user = await _userManager.FindByEmailAsync(loginDto.Email);

        if (user == null)
        {
            return Unauthorized(ApiResponse<AuthResponseDto>
                .Fail("Niprawny adres email lub hasło"));
        }

        var result = await _userManager.CheckPasswordAsync(user, loginDto.Password);

        if (!result)
        {
            return Unauthorized("Niprawny adres email lub hasło");
        }

        user.Status = "Online";
        user.LastSeen = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var responseData = new AuthResponseDto
        {
            Username = user.UserName!,
            Token = _tokenService.CreateToken(user)
        };

        return Ok(ApiResponse<AuthResponseDto>.Ok(responseData, "Zalogowano pomyślnie"));
    }
}