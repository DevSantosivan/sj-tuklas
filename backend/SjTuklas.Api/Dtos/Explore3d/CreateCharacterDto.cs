using System.ComponentModel.DataAnnotations;

namespace SjTuklas.Api.DTOs.Explore3d;

public sealed class CreateCharacterDto
{
    [StringLength(50, MinimumLength = 2)]
    public string? Username { get; set; }
}