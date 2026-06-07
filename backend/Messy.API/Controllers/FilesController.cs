using Messy.API.DTOs;
using Messy.API.Interfaces;
using Messy.API.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Messy.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FilesController(IFileService fileService) : ControllerBase
{
    [HttpPost("upload")]
    [RequestSizeLimit(10485760)]
    public async Task<ActionResult<ApiResponse<List<AttachmentDto>>>> UploadFiles(List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest(ApiResponse<List<AttachmentDto>>.Fail("Nie przesłano żadnych plików."));
        }

        const long maxFileSize = 10 * 1024 * 1024; // 10 MB
        var attachments = new List<AttachmentDto>();

        foreach (var file in files)
        {
            if (file.Length > maxFileSize)
            {
                return BadRequest(ApiResponse<List<AttachmentDto>>.Fail($"Plik {file.FileName} przekracza maksymalny dopuszczalny rozmiar 10 MB."));
            }

            var url = await fileService.SaveFileAsync(file);
            var type = GetFileType(file.ContentType);

            attachments.Add(new AttachmentDto
            {
                Url = url,
                Type = type,
                FileName = file.FileName
            });
        }

        return Ok(ApiResponse<List<AttachmentDto>>.Ok(attachments));
    }

    private string GetFileType(string contentType)
    {
        if (contentType.StartsWith("image/")) return "Image";
        if (contentType.StartsWith("video/")) return "Video";
        if (contentType.StartsWith("audio/")) return "Audio";
        return "Document";
    }
}
