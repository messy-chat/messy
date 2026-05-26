using Messy.API.Models;

namespace Messy.API.Interfaces;

public interface ITokenService
{
    string CreateToken(User user);
}