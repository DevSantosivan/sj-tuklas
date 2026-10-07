namespace SjTuklas.Api.DTOs.Explore3d;

public sealed record CharacterResponseDto(
    Guid UserId,
    string Username,
    string CharacterModel,

    // Global Chat moderation
    int WarningCount,
    int RestrictionCount,
    DateTime? RestrictedUntil,
    bool IsChatBlocked,

    DateTime CreatedAt,
    DateTime UpdatedAt
);