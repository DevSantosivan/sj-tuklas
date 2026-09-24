namespace SjTuklas.Api.Dtos.Favorites;

public class FavoriteActionResponseDto
{
    public bool Success { get; set; }

    public bool IsFavorite { get; set; }

    public Guid BusinessId { get; set; }

    public string Message { get; set; } = string.Empty;
}