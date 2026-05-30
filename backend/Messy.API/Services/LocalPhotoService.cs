using Messy.API.Interfaces;

namespace Messy.API.Services;

public class LocalPhotoService(IWebHostEnvironment env) : IPhotoService
{
    public async Task<string> UploadPhotoAsync(IFormFile file)
    {
        if (file.Length == 0) throw new ArgumentException("Pusty plik");

        var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
        
        var webRootPath = env.WebRootPath;
        
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(env.ContentRootPath, "wwwroot");
        }
        
        var uploadsFolder = Path.Combine(webRootPath, "images");
        
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return $"/images/{fileName}";
    }
}