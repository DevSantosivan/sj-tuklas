namespace SjTuklas.Api.DTOs.Explore3d;

public sealed record CharacterResponseDto(
    Guid UserId,
    string Username,
    string CharacterModel,
    DateTime CreatedAt,
    DateTime UpdatedAt
);