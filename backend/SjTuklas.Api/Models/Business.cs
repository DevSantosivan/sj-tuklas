namespace SjTuklas.Api.Models;

public class Business
{
    // =========================================================
    // OWNER
    // =========================================================

    public Guid Id { get; set; }

    public Guid OwnerId { get; set; }

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

    // Business Profile cover / background image
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
    // BUSINESS STATUS
    // =========================================================

    public string Status { get; set; } = "pending";

    public bool Verified { get; set; }

    public bool IsPro { get; set; }

    // =========================================================
    // RATING
    // =========================================================

    public double Rating { get; set; }

    public int Reviews { get; set; }

    // =========================================================
    // FEATURES
    // =========================================================

    public BusinessFeatures Features { get; set; } = new();

    // =========================================================
    // TIMESTAMPS
    // =========================================================

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}

public class BusinessFeatures
{
    public bool Menu { get; set; }

    public bool Products { get; set; }

    public bool Services { get; set; }

    public bool Ordering { get; set; }

    public bool Booking { get; set; }

    public bool Reservations { get; set; }

    public bool Inquiries { get; set; }

    public bool Promotions { get; set; }

    public bool Rooms { get; set; }

    public bool Analytics { get; set; }

    public bool RequestQuote { get; set; }

    public bool Events { get; set; }
}