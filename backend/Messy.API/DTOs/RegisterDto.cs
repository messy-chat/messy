using System.ComponentModel.DataAnnotations;

namespace Messy.API.DTOs;

public class RegisterDto
{
    [Required]
    public string Username { get; set; } = string.Empty;
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required]
    [StringLength(30, MinimumLength = 8, ErrorMessage = "Hasło musi mieć od 8 do 30 znaków.")]
    public string Password { get; set; } = string.Empty;
}