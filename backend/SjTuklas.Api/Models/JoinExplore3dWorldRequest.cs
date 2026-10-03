namespace SjTuklas.Api.Models.Explore3d;

public sealed class JoinExplore3dWorldRequest
{
    public string WorldId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = "Player";
    public string CharacterModel { get; set; } = "aj";
    public Explore3dPlayerPosition Position { get; set; } = new();
}