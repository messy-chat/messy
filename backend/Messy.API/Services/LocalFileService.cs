using Messy.API.Interfaces;

namespace Messy.API.Services;

public class LocalFileService(IWebHostEnvironment env) : IFileService
{
    public async Task<string> SaveFileAsync(IFormFile file)
    {
        if (file == null || file.Length == 0) throw new ArgumentException("Niepoprawny plik.");

        var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
        var webRootPath = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var uploadsFolder = Path.Combine(webRootPath, "uploads");

        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Return the relative URL
        return $"/uploads/{fileName}";
    }
}
