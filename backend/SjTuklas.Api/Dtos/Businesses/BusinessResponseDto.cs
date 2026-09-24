using SjTuklas.Api.Models;

namespace SjTuklas.Api.Dtos.Businesses;

public class BusinessResponseDto
{
    public Guid Id { get; set; }

    public Guid OwnerId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string BusinessType { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string Hours { get; set; } = string.Empty;

    // Existing image — gagamitin para sa gallery / feature image
    public string Image { get; set; } = string.Empty;

    // Business Profile cover/background
    public string CoverImage { get; set; } = string.Empty;

    // Business Profile logo/profile picture
    public string ProfileImage { get; set; } = string.Empty;

    public string Barangay { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public string Status { get; set; } = string.Empty;

    public bool Verified { get; set; }

    public bool IsPro { get; set; }

    public double Rating { get; set; }

    public int Reviews { get; set; }

    public BusinessFeatures Features { get; set; } = new();

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}