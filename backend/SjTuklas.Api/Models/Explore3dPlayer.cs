namespace SjTuklas.Api.Models.Explore3d;

public sealed class Explore3dPlayer
{
    public required string UserId { get; init; }
    public required string ConnectionId { get; set; }
    public required string WorldId { get; init; }

    public string DisplayName { get; set; } = "Player";
    public string CharacterModel { get; set; } = "aj";

    public float X { get; set; }
    public float Y { get; set; }
    public float Z { get; set; }

    public float RotationY { get; set; }
}