namespace SjTuklas.Api.Models;

public sealed class GlobalChatMessage
{
    public string Id { get; init; } = Guid.NewGuid().ToString("N");

    public string UserName { get; init; } = string.Empty;

    public string Message { get; init; } = string.Empty;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}