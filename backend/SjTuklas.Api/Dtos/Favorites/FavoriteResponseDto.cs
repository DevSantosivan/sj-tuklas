namespace SjTuklas.Api.Dtos.Favorites;

public class FavoriteResponseDto
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid BusinessId { get; set; }

    public DateTime CreatedAt { get; set; }
}