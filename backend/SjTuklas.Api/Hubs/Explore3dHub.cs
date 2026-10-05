using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SjTuklas.Api.Models.Explore3d;

namespace SjTuklas.Api.Hubs;

[Authorize]
public sealed class Explore3dHub : Hub
{
    // =========================================================
    // PLAYER STORAGE
    // =========================================================

    private static readonly ConcurrentDictionary<
        string,
        Explore3dPlayer
    > Players = new();

    private static readonly ConcurrentDictionary<
        string,
        string
    > ConnectionWorlds = new();

    private static readonly object SyncLock = new();


    // =========================================================
    // CHARACTER MODELS
    // =========================================================

    private static readonly HashSet<string> AllowedCharacterModels =
    [
        "aj",
        "suit",
        "brian"
    ];


    // =========================================================
    // HUB SPAWN POINTS
    // =========================================================

    /*
     * Server-authoritative spawn positions.
     *
     * The client is NOT allowed to choose the initial spawn.
     *
     * This prevents:
     *
     *     0, 0, 0
     *
     * from becoming the default spawn.
     */

    private static readonly (float X, float Y, float Z)[] HubSpawnPoints =
    [
        (-24f, 1.2f, -24f),
        (24f, 1.2f, -24f),
        (-24f, 1.2f, 24f),
        (24f, 1.2f, 24f),

        (-28f, 1.2f, -18f),
        (28f, 1.2f, -18f),
        (-28f, 1.2f, 18f),
        (28f, 1.2f, 18f)
    ];


    private static (
        float X,
        float Y,
        float Z
    ) GetRandomHubSpawn()
    {
        return HubSpawnPoints[
            Random.Shared.Next(
                HubSpawnPoints.Length
            )
        ];
    }


    // =========================================================
    // CONNECTION
    // =========================================================

    public override async Task OnConnectedAsync()
    {
        Console.WriteLine(
            $"[Explore3D] Connected: " +
            $"{Context.ConnectionId}"
        );

        await base.OnConnectedAsync();
    }


    // =========================================================
    // JOIN WORLD
    // =========================================================

    public async Task JoinWorld(
        JoinExplore3dWorldRequest request
    )
    {
        try
        {
            // =====================================================
            // VALIDATE REQUEST
            // =====================================================

            if (request is null)
            {
                throw new HubException(
                    "Join request is required."
                );
            }


            // =====================================================
            // USER
            // =====================================================

            var userId =
                GetUserId();


            // =====================================================
            // WORLD
            // =====================================================

            if (
                string.IsNullOrWhiteSpace(
                    request.WorldId
                )
            )
            {
                throw new HubException(
                    "World ID is required."
                );
            }


            var worldId =
                SanitizeWorldId(
                    request.WorldId
                );


            if (
                string.IsNullOrWhiteSpace(
                    worldId
                )
            )
            {
                throw new HubException(
                    "Invalid world ID."
                );
            }


            var connectionId =
                Context.ConnectionId;


            var groupName =
                GetGroupName(
                    worldId
                );


            // =====================================================
            // CHARACTER
            // =====================================================

            var characterModel =
                request.CharacterModel?
                    .Trim()
                    .ToLowerInvariant();


            if (
                !AllowedCharacterModels.Contains(
                    characterModel ?? string.Empty
                )
            )
            {
                characterModel = "aj";
            }


            // =====================================================
            // LEAVE PREVIOUS WORLD
            // =====================================================

            /*
             * If this connection already has a player,
             * remove it first.
             *
             * We do this BEFORE creating the new player.
             */

            await RemoveCurrentPlayer(
                connectionId,
                notifyOthers: true
            );


            // =====================================================
            // SERVER-AUTHORITATIVE SPAWN
            // =====================================================

            var spawn =
                GetRandomHubSpawn();


            // =====================================================
            // CREATE PLAYER
            // =====================================================

            var player =
                new Explore3dPlayer
                {
                    UserId =
                        userId,

                    ConnectionId =
                        connectionId,

                    WorldId =
                        worldId,

                    DisplayName =
                        SanitizeDisplayName(
                            request.DisplayName
                        ),

                    CharacterModel =
                        characterModel,

                    // =============================================
                    // SERVER SPAWN
                    // =============================================

                    X =
                        spawn.X,

                    Y =
                        spawn.Y,

                    Z =
                        spawn.Z,

                    RotationY =
                        0f
                };


            // =====================================================
            // GET EXISTING PLAYERS + REGISTER PLAYER
            // =====================================================

            List<Explore3dPlayer> existingPlayers;

            lock (SyncLock)
            {
                existingPlayers =
                    Players.Values
                        .Where(
                            p =>
                                p.WorldId ==
                                    worldId &&
                                p.ConnectionId !=
                                    connectionId
                        )
                        .Select(
                            ClonePlayer
                        )
                        .ToList();


                Players[
                    connectionId
                ] =
                    player;


                ConnectionWorlds[
                    connectionId
                ] =
                    worldId;
            }


            // =====================================================
            // DEBUG
            // =====================================================

            Console.WriteLine(
                $"[Explore3D] SPAWN " +
                $"{player.DisplayName} " +
                $"({connectionId}) " +
                $"World={player.WorldId} " +
                $"Character={player.CharacterModel} " +
                $"X={player.X} " +
                $"Y={player.Y} " +
                $"Z={player.Z}"
            );


            // =====================================================
            // JOIN SIGNALR GROUP
            // =====================================================

            await Groups.AddToGroupAsync(
                connectionId,
                groupName
            );


            // =====================================================
            // SEND EXISTING PLAYERS
            // =====================================================

            await Clients.Caller.SendAsync(
                "ExistingPlayers",
                existingPlayers
            );


            // =====================================================
            // NOTIFY OTHER PLAYERS
            // =====================================================

            await Clients.OthersInGroup(
                groupName
            )
            .SendAsync(
                "PlayerJoined",
                ClonePlayer(player)
            );


            // =====================================================
            // PLAYER COUNT
            // =====================================================

            var playerCount =
                GetWorldPlayerCount(
                    worldId
                );


            await Clients.Group(
                groupName
            )
            .SendAsync(
                "WorldPlayerCount",
                playerCount
            );


            // =====================================================
            // SUCCESS
            // =====================================================

            Console.WriteLine(
                $"[Explore3D] JOIN SUCCESS " +
                $"{player.DisplayName} " +
                $"({connectionId}) " +
                $"World={worldId} " +
                $"Players={playerCount}"
            );
        }
        catch (HubException)
        {
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                "[Explore3D] JOIN WORLD FAILED"
            );

            Console.WriteLine(
                $"Type: {ex.GetType().FullName}"
            );

            Console.WriteLine(
                $"Message: {ex.Message}"
            );

            Console.WriteLine(
                $"StackTrace: {ex.StackTrace}"
            );


            if (
                ex.InnerException is not null
            )
            {
                Console.WriteLine(
                    $"InnerException: " +
                    $"{ex.InnerException.GetType().FullName}"
                );

                Console.WriteLine(
                    $"InnerMessage: " +
                    $"{ex.InnerException.Message}"
                );

                Console.WriteLine(
                    $"InnerStackTrace: " +
                    $"{ex.InnerException.StackTrace}"
                );
            }


            throw new HubException(
                "Failed to join Explore3D world."
            );
        }
    }


    // =========================================================
    // MOVE PLAYER
    // =========================================================

    public async Task MovePlayer(
        Explore3dPlayerPosition position
    )
    {
        if (position is null)
        {
            return;
        }


        var connectionId =
            Context.ConnectionId;


        Explore3dPlayer updatedPlayer;


        lock (SyncLock)
        {
            if (
                !Players.TryGetValue(
                    connectionId,
                    out var player
                )
            )
            {
                throw new HubException(
                    "Join a world before moving."
                );
            }


            player.X =
                ClampPosition(
                    position.X
                );


            player.Y =
                ClampPosition(
                    position.Y
                );


            player.Z =
                ClampPosition(
                    position.Z
                );


            player.RotationY =
                ClampRotation(
                    position.RotationY
                );


            updatedPlayer =
                ClonePlayer(
                    player
                );
        }


        // =====================================================
        // BROADCAST MOVEMENT
        // =====================================================

        await Clients.OthersInGroup(
            GetGroupName(
                updatedPlayer.WorldId
            )
        )
        .SendAsync(
            "PlayerMoved",
            updatedPlayer
        );
    }


    // =========================================================
    // LEAVE WORLD
    // =========================================================

    public async Task LeaveWorld()
    {
        await RemoveCurrentPlayer(
            Context.ConnectionId,
            notifyOthers: true
        );
    }


    // =========================================================
    // DISCONNECTED
    // =========================================================

    public override async Task OnDisconnectedAsync(
        Exception? exception
    )
    {
        try
        {
            await RemoveCurrentPlayer(
                Context.ConnectionId,
                notifyOthers: true
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"[Explore3D] Disconnect cleanup error: " +
                $"{ex.Message}"
            );
        }


        if (exception is not null)
        {
            Console.WriteLine(
                $"[Explore3D] Disconnected with error: " +
                $"{exception.Message}"
            );
        }


        await base.OnDisconnectedAsync(
            exception
        );
    }


    // =========================================================
    // REMOVE CURRENT PLAYER
    // =========================================================

    private async Task RemoveCurrentPlayer(
        string connectionId,
        bool notifyOthers
    )
    {
        Explore3dPlayer? player =
            null;


        // =====================================================
        // REMOVE FROM STORAGE
        // =====================================================

        lock (SyncLock)
        {
            if (
                Players.TryRemove(
                    connectionId,
                    out var removedPlayer
                )
            )
            {
                player =
                    ClonePlayer(
                        removedPlayer
                    );
            }


            ConnectionWorlds.TryRemove(
                connectionId,
                out _
            );
        }


        // No player = nothing to clean.
        if (player is null)
        {
            return;
        }


        // =====================================================
        // GROUP
        // =====================================================

        var groupName =
            GetGroupName(
                player.WorldId
            );


        // =====================================================
        // REMOVE FROM SIGNALR GROUP
        // =====================================================

        await Groups.RemoveFromGroupAsync(
            connectionId,
            groupName
        );


        // =====================================================
        // NOTIFY OTHER PLAYERS
        // =====================================================

        if (notifyOthers)
        {
            await Clients.OthersInGroup(
                groupName
            )
            .SendAsync(
                "PlayerLeft",
                new
                {
                    player.UserId,
                    player.ConnectionId,
                    player.WorldId
                }
            );
        }


        // =====================================================
        // DEBUG
        // =====================================================

        Console.WriteLine(
            $"[Explore3D] LEFT WORLD " +
            $"{player.DisplayName} " +
            $"({connectionId}) " +
            $"World={player.WorldId}"
        );
    }


    // =========================================================
    // GET WORLD PLAYERS
    // =========================================================

    public Task<Explore3dPlayer[]> GetWorldPlayers(
        string worldId
    )
    {
        worldId =
            string.IsNullOrWhiteSpace(
                worldId
            )
                ? "hub"
                : SanitizeWorldId(
                    worldId
                );


        Explore3dPlayer[] players;


        lock (SyncLock)
        {
            players =
                Players.Values
                    .Where(
                        p =>
                            p.WorldId ==
                            worldId
                    )
                    .Select(
                        ClonePlayer
                    )
                    .ToArray();
        }


        return Task.FromResult(
            players
        );
    }


    // =========================================================
    // GET WORLD PLAYER COUNT
    // =========================================================

    private static int GetWorldPlayerCount(
        string worldId
    )
    {
        lock (SyncLock)
        {
            return Players.Values.Count(
                p =>
                    p.WorldId ==
                    worldId
            );
        }
    }


    // =========================================================
    // USER ID
    // =========================================================

    private string GetUserId()
    {
        var userId =
            Context.UserIdentifier ??
            Context.User?.FindFirst(
                "sub"
            )?.Value ??
            Context.User?.FindFirst(
                System.Security.Claims.ClaimTypes.NameIdentifier
            )?.Value;


        if (
            string.IsNullOrWhiteSpace(
                userId
            )
        )
        {
            throw new HubException(
                "Authenticated user ID was not found."
            );
        }


        return userId;
    }


    // =========================================================
    // GROUP NAME
    // =========================================================

    private static string GetGroupName(
        string worldId
    )
    {
        return $"explore3d:{worldId}";
    }


    // =========================================================
    // SANITIZE WORLD ID
    // =========================================================

    private static string SanitizeWorldId(
        string value
    )
    {
        var sanitized =
            new string(
                value
                    .Trim()
                    .ToLowerInvariant()
                    .Where(
                        c =>
                            char.IsLetterOrDigit(c) ||
                            c is '-' or '_'
                    )
                    .Take(64)
                    .ToArray()
            );


        return sanitized;
    }


    // =========================================================
    // SANITIZE DISPLAY NAME
    // =========================================================

    private static string SanitizeDisplayName(
        string? value
    )
    {
        if (
            string.IsNullOrWhiteSpace(
                value
            )
        )
        {
            return "Player";
        }


        var sanitized =
            new string(
                value
                    .Trim()
                    .Where(
                        c =>
                            !char.IsControl(c)
                    )
                    .Take(32)
                    .ToArray()
            );


        return string.IsNullOrWhiteSpace(
            sanitized
        )
            ? "Player"
            : sanitized;
    }


    // =========================================================
    // CLAMP POSITION
    // =========================================================

    private static float ClampPosition(
        float value
    )
    {
        if (
            !float.IsFinite(value)
        )
        {
            return 0f;
        }


        return Math.Clamp(
            value,
            -10000f,
            10000f
        );
    }


    // =========================================================
    // CLAMP ROTATION
    // =========================================================

    private static float ClampRotation(
        float value
    )
    {
        if (
            !float.IsFinite(value)
        )
        {
            return 0f;
        }


        return Math.Clamp(
            value,
            -100000f,
            100000f
        );
    }


    // =========================================================
    // CLONE PLAYER
    // =========================================================

    private static Explore3dPlayer ClonePlayer(
        Explore3dPlayer player
    )
    {
        return new Explore3dPlayer
        {
            UserId =
                player.UserId,

            ConnectionId =
                player.ConnectionId,

            WorldId =
                player.WorldId,

            DisplayName =
                player.DisplayName,

            CharacterModel =
                player.CharacterModel,

            X =
                player.X,

            Y =
                player.Y,

            Z =
                player.Z,

            RotationY =
                player.RotationY
        };
    }
}