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

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}