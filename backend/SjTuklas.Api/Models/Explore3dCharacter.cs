
using System.Text.Json.Serialization;

namespace SjTuklas.Api.Models.Explore3d;

public sealed class Explore3dCharacter
{
    [JsonPropertyName("user_id")]
    public Guid UserId { get; set; }

    [JsonPropertyName("username")]
    public string Username { get; set; } = "Explorer";

    [JsonPropertyName("character_model")]
    public string CharacterModel { get; set; } = "explorer";

    // =========================================================
    // GLOBAL CHAT MODERATION
    // =========================================================

    [JsonPropertyName("warning_count")]
    public int WarningCount { get; set; } = 0;

    [JsonPropertyName("restriction_count")]
    public int RestrictionCount { get; set; } = 0;

    [JsonPropertyName("restricted_until")]
    public DateTime? RestrictedUntil { get; set; }

    [JsonPropertyName("is_chat_blocked")]
    public bool IsChatBlocked { get; set; } = false;

    // =========================================================
    // TIMESTAMPS
    // =========================================================

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

