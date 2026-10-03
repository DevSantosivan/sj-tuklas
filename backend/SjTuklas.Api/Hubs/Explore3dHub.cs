using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SjTuklas.Api.Models.Explore3d;

namespace SjTuklas.Api.Hubs;

[Authorize]
public sealed class Explore3dHub : Hub
{
    private static readonly ConcurrentDictionary<string, Explore3dPlayer>
        Players = new();

    private static readonly ConcurrentDictionary<string, string>
        ConnectionWorlds = new();

    private static readonly object SyncLock = new();

    private static readonly HashSet<string> AllowedCharacterModels =
    [
        "aj",
        "suit",
        "brian"
    ];

    public async Task JoinWorld(JoinExplore3dWorldRequest request)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(request.WorldId))
            throw new HubException("World ID is required.");

        var worldId = SanitizeWorldId(request.WorldId);

        if (string.IsNullOrWhiteSpace(worldId))
            throw new HubException("Invalid world ID.");

        var connectionId = Context.ConnectionId;
        var groupName = GetGroupName(worldId);

        // Remove the connection from any previously joined world.
        await LeaveCurrentWorld();

        var player = new Explore3dPlayer
        {
            UserId = userId,
            ConnectionId = connectionId,
            WorldId = worldId,
            DisplayName = SanitizeDisplayName(request.DisplayName),
            CharacterModel = AllowedCharacterModels.Contains(
                request.CharacterModel?.ToLowerInvariant() ?? "")
                ? request.CharacterModel!.ToLowerInvariant()
                : "aj",
            X = ClampPosition(request.Position?.X ?? 0),
            Y = ClampPosition(request.Position?.Y ?? 0),
            Z = ClampPosition(request.Position?.Z ?? 0),
            RotationY = ClampRotation(request.Position?.RotationY ?? 0)
        };

        List<Explore3dPlayer> existingPlayers;

        lock (SyncLock)
        {
            existingPlayers = Players.Values
                .Where(p => p.WorldId == worldId &&
                            p.ConnectionId != connectionId)
                .Select(ClonePlayer)
                .ToList();

            Players[connectionId] = player;
            ConnectionWorlds[connectionId] = worldId;
        }

        await Groups.AddToGroupAsync(connectionId, groupName);

        // Send current players to the joining player.
        await Clients.Caller.SendAsync("ExistingPlayers", existingPlayers);

        // Notify other players about the new player.
        await Clients.OthersInGroup(groupName)
            .SendAsync("PlayerJoined", ClonePlayer(player));
    }

    public async Task MovePlayer(Explore3dPlayerPosition position)
    {
        var connectionId = Context.ConnectionId;
        Explore3dPlayer updatedPlayer;

        lock (SyncLock)
        {
            if (!Players.TryGetValue(connectionId, out var player))
                throw new HubException("Join a world before moving.");

            player.X = ClampPosition(position.X);
            player.Y = ClampPosition(position.Y);
            player.Z = ClampPosition(position.Z);
            player.RotationY = ClampRotation(position.RotationY);

            updatedPlayer = ClonePlayer(player);
        }

        await Clients.OthersInGroup(GetGroupName(updatedPlayer.WorldId))
            .SendAsync("PlayerMoved", updatedPlayer);
    }

    public async Task LeaveWorld()
    {
        await LeaveCurrentWorld();
    }

    private async Task LeaveCurrentWorld()
    {
        var connectionId = Context.ConnectionId;
        Explore3dPlayer? player = null;

        lock (SyncLock)
        {
            if (Players.TryRemove(connectionId, out var removedPlayer))
                player = ClonePlayer(removedPlayer);

            ConnectionWorlds.TryRemove(connectionId, out _);
        }

        if (player is null)
            return;

        var groupName = GetGroupName(player.WorldId);

        await Groups.RemoveFromGroupAsync(connectionId, groupName);

        await Clients.OthersInGroup(groupName)
            .SendAsync("PlayerLeft", new
            {
                player.UserId,
                player.ConnectionId,
                player.WorldId
            });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await LeaveCurrentWorld();
        await base.OnDisconnectedAsync(exception);
    }

    private string GetUserId()
    {
        var userId =
            Context.UserIdentifier ??
            Context.User?.FindFirst("sub")?.Value ??
            Context.User?.FindFirst(
                System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(userId))
            throw new HubException("Authenticated user ID was not found.");

        return userId;
    }

    private static string GetGroupName(string worldId)
        => $"explore3d:{worldId}";

    private static string SanitizeWorldId(string value)
    {
        var sanitized = new string(value
            .Trim()
            .ToLowerInvariant()
            .Where(c => char.IsLetterOrDigit(c) || c is '-' or '_')
            .Take(64)
            .ToArray());

        return sanitized;
    }

    private static string SanitizeDisplayName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "Player";

        var sanitized = new string(value
            .Trim()
            .Where(c => !char.IsControl(c))
            .Take(32)
            .ToArray());

        return string.IsNullOrWhiteSpace(sanitized)
            ? "Player"
            : sanitized;
    }

    private static float ClampPosition(float value)
    {
        if (!float.IsFinite(value))
            return 0;

        return Math.Clamp(value, -10000f, 10000f);
    }

    private static float ClampRotation(float value)
    {
        if (!float.IsFinite(value))
            return 0;

        return Math.Clamp(value, -100000f, 100000f);
    }

    private static Explore3dPlayer ClonePlayer(Explore3dPlayer player)
    {
        return new Explore3dPlayer
        {
            UserId = player.UserId,
            ConnectionId = player.ConnectionId,
            WorldId = player.WorldId,
            DisplayName = player.DisplayName,
            CharacterModel = player.CharacterModel,
            X = player.X,
            Y = player.Y,
            Z = player.Z,
            RotationY = player.RotationY
        };
    }
}