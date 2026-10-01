namespace SjTuklas.Api.Models;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid BusinessId { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string? UserAvatar { get; set; }

    public int Rating { get; set; }

    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}