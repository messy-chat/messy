using System.ComponentModel.DataAnnotations;

namespace Messy.API.Models;

public class Attachment
{
    public Guid Id { get; set; }
    
    [Required]
    public string Url { get; set; } = null!;
    
    [Required]
    public string Type { get; set; } = null!;
    
    [Required]
    public string FileName { get; set; } = null!;

    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;
}
