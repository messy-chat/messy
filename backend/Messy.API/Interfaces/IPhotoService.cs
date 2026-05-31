namespace Messy.API.Interfaces;

public interface IPhotoService
{
    Task<string> UploadPhotoAsync(IFormFile file);
}