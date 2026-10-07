
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SjTuklas.Api.Models;
using SjTuklas.Api.Services;
using SjTuklas.Api.Services.Explore3d;

namespace SjTuklas.Api.Hubs;

[Authorize]
public sealed class GlobalChatHub : Hub
{
    private readonly GlobalChatModerationService _moderation;
    private readonly IExplore3dCharacterService _characterService;

    public GlobalChatHub(
        GlobalChatModerationService moderation,
        IExplore3dCharacterService characterService)
    {
        _moderation = moderation;
        _characterService = characterService;
    }

    public async Task SendMessage(string message)
    {
        message = message?.Trim() ?? string.Empty;

        // =========================================================
        // GET AUTHENTICATED USER ID
        // =========================================================

        var userIdValue =
            Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value;

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            throw new HubException(
                "You must be logged in to use Global Chat.");
        }

        // =========================================================
        // GET CHARACTER
        // =========================================================

        var character = await _characterService.GetByUserIdAsync(
            userId,
            Context.ConnectionAborted);

        if (character is null)
        {
            throw new HubException(
                "You need to create your Explore3D character first.");
        }

        // =========================================================
        // CHECK PERMANENT GLOBAL CHAT BLOCK
        // =========================================================

        if (character.IsChatBlocked)
        {
            throw new HubException(
                "Your Global Chat access has been permanently blocked.");
        }

        // =========================================================
        // CHECK TEMPORARY GLOBAL CHAT RESTRICTION
        // =========================================================

        if (character.RestrictedUntil.HasValue)
        {
            var restrictedUntil = character.RestrictedUntil.Value;

            if (restrictedUntil > DateTime.UtcNow)
            {
                throw new HubException(
                    $"Your Global Chat access is restricted until " +
                    $"{restrictedUntil:yyyy-MM-dd HH:mm} UTC.");
            }

            /*
             * Restriction has expired.
             *
             * We don't reset RestrictionCount here.
             * The user has already completed that restriction.
             *
             * Clear only RestrictedUntil so they can chat again.
             */
            var clearedCharacter =
                await _characterService.UpdateModerationAsync(
                    character.UserId,
                    character.WarningCount,
                    character.RestrictionCount,
                    null,
                    character.IsChatBlocked,
                    Context.ConnectionAborted);

            if (clearedCharacter is not null)
            {
                character = clearedCharacter;
            }
        }

        // =========================================================
        // BASIC VALIDATION
        // =========================================================

        if (string.IsNullOrWhiteSpace(message))
        {
            throw new HubException(
                "Message cannot be empty.");
        }

        // =========================================================
        // SERVER-SIDE CONTENT MODERATION
        // =========================================================

        var blockedReason =
            _moderation.GetBlockedReason(message);

        if (blockedReason is not null)
        {
            /*
             * Message is NOT broadcast.
             *
             * Instead, persistent moderation state is updated
             * inside explore3d_characters.
             */
            var moderationResult =
                await _moderation.ApplyViolationAsync(
                    character,
                    Context.ConnectionAborted);

            /*
             * Send the moderation result ONLY to the user
             * who violated the rule.
             *
             * The actual prohibited message is never broadcast.
             */
            await Clients.Caller.SendAsync(
                "GlobalChatModeration",
                new
                {
                    action = moderationResult.Action.ToString(),
                    message = moderationResult.Message,
                    warningCount =
                        moderationResult.UpdatedCharacter.WarningCount,
                    restrictionCount =
                        moderationResult.UpdatedCharacter.RestrictionCount,
                    restrictedUntil =
                        moderationResult.UpdatedCharacter.RestrictedUntil,
                    isChatBlocked =
                        moderationResult.UpdatedCharacter.IsChatBlocked
                },
                Context.ConnectionAborted);

            return;
        }

        // =========================================================
        // CREATE IN-MEMORY CHAT MESSAGE
        // =========================================================

        var chatMessage = new GlobalChatMessage
        {
            Id = Guid.NewGuid().ToString("N"),

            /*
             * IMPORTANT:
             * Username comes from the character record.
             * It does NOT come from the client or JWT claims.
             */
            UserName = character.Username,

            Message = message,

            CreatedAt = DateTime.UtcNow
        };

        // =========================================================
        // BROADCAST
        // =========================================================

        await Clients.All.SendAsync(
            "GlobalChatMessage",
            chatMessage,
            Context.ConnectionAborted);
    }
}

