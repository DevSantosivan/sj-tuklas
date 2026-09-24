using System.Text.Json.Serialization;

namespace SjTuklas.Api.Dtos.Auth;

public class SupabaseUserDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("user_metadata")]
    public Dictionary<string, object>? UserMetadata { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime? CreatedAt { get; set; }
}