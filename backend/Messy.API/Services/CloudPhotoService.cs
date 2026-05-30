using Messy.API.Interfaces;

namespace Messy.API.Services;

public class CloudPhotoService(IConfiguration configuration) : IPhotoService
{
    private readonly IConfiguration _configuration = configuration;

    public async Task<string> UploadPhotoAsync(IFormFile file)
    {
        // TODO: Implementacja AWS S3 lub Azure Blob Storage
        // 1. Inicjalizacja klienta chmurowego z użyciem kluczy z _config
        // 2. Przesłanie strumienia file.OpenReadStream() do bucketa/kontenera
        // 3. Pobranie i zwrócenie publicznego adresu URL ze storage'u
        
        await Task.Delay(100); // Symulacja zapytania
        return "https://messy-prod-storage.s3.amazonaws.com/jakis-unikalny-id.jpg";
    }
}