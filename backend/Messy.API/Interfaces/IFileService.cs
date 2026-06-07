namespace Messy.API.Interfaces;

public interface IFileService
{
    Task<string> SaveFileAsync(IFormFile file);
}
