using SjTuklas.Api.Models;

namespace SjTuklas.Api.Dtos.Businesses;

public class UpdateBusinessDto
{
    // =========================================================
    // BUSINESS INFO
    // =========================================================

    public string Name { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string BusinessType { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string Hours { get; set; } = string.Empty;

    // =========================================================
    // IMAGES
    // =========================================================

    // Existing image
    // Used for gallery / feature image
    public string Image { get; set; } = string.Empty;

    // Business Profile cover / background
    public string CoverImage { get; set; } = string.Empty;

    // Business Profile logo / profile picture
    public string ProfileImage { get; set; } = string.Empty;

    // =========================================================
    // LOCATION
    // =========================================================

    public string Barangay { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    // =========================================================
    // FEATURES
    // =========================================================

    public BusinessFeatures Features { get; set; } = new();
}