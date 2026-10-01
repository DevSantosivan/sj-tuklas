namespace SjTuklas.Api.Dtos.Reviews;

public class ReviewResponse
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string? UserAvatar { get; set; }

    public int Rating { get; set; }

    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}