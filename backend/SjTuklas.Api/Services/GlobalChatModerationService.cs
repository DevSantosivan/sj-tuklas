
using System.Text;
using System.Text.RegularExpressions;
using SjTuklas.Api.Models.Explore3d;
using SjTuklas.Api.Services.Explore3d;

namespace SjTuklas.Api.Services;

public sealed class GlobalChatModerationService
{
    private const int MaxMessageLength = 500;

    // =========================================================
    // MODERATION POLICY
    // =========================================================

    private const int MaxWarningsBeforeRestriction = 3;

    private const int MaxRestrictionsBeforePermanentBlock = 3;

    private const int RestrictionMonths = 3;

    /*
     * IMPORTANT:
     * These are normalized keywords/patterns.
     *
     * The message is normalized before checking so simple
     * obfuscation such as:
     *
     *   s h a b u
     *   sh4bu
     *   s.h.a.b.u
     *
     * can still be detected.
     *
     * Keep this list server-side.
     */
    private static readonly string[] BlockedTerms =
    [
        // Illegal drugs / substances
        "shabu",
        "meth",
        "methamphetamine",
        "crack",
        "cocaine",
        "heroin",
        "fentanyl",
        "ecstasy",
        "mdma",
        "lsd",
        "marijuana",
        "weed",
        "cannabis",

        // Common local slang / references
        "damo",

        // Drug transaction terminology
        "drugdealer",
        "drugdeal",
        "drugtransaction",
        "drugtrade",
        "buwisita",
        "tulakdroga",

        // Weapon transactions
        "bentahanbaril",
        "bentahanngbaril",
        "buyandcarry",
        "illegalweapon",

        // Fraud / scam transaction indicators
        "scam",
        "phishing",
        "stolenaccount",
        "hackaccount",
        "sellaccount",
        "buyaccount"
    ];

    private static readonly Regex NonAlphaNumericRegex =
        new(@"[^a-z0-9]", RegexOptions.Compiled);

    private static readonly Regex RepeatedCharacterRegex =
        new(@"(.)\1{3,}", RegexOptions.Compiled);

    private readonly IExplore3dCharacterService _characterService;

    public GlobalChatModerationService(
        IExplore3dCharacterService characterService)
    {
        _characterService = characterService;
    }

    // =========================================================
    // MESSAGE MODERATION
    // =========================================================

    public bool IsAllowed(string? message)
    {
        return GetBlockedReason(message) is null;
    }

    public string? GetBlockedReason(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return "Message cannot be empty.";
        }

        if (message.Length > MaxMessageLength)
        {
            return $"Message cannot exceed {MaxMessageLength} characters.";
        }

        var normalized = Normalize(message);

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return "Message cannot be empty.";
        }

        foreach (var blockedTerm in BlockedTerms)
        {
            if (ContainsBlockedTerm(normalized, blockedTerm))
            {
                return
                    "This message can't be sent because it may contain prohibited or unsafe content.";
            }
        }

        return null;
    }

    // =========================================================
    // APPLY VIOLATION
    // =========================================================

    public async Task<ModerationResult> ApplyViolationAsync(
        Explore3dCharacter character,
        CancellationToken cancellationToken = default)
    {
        var warningCount = character.WarningCount + 1;
        var restrictionCount = character.RestrictionCount;
        var restrictedUntil = character.RestrictedUntil;
        var isChatBlocked = character.IsChatBlocked;

        /*
         * Third warning:
         *
         * - Reset warnings
         * - Add one restriction
         * - Restrict for 3 months
         */
        if (warningCount >= MaxWarningsBeforeRestriction)
        {
            restrictionCount++;

            warningCount = 0;

            restrictedUntil = DateTime.UtcNow.AddMonths(
                RestrictionMonths
            );

            /*
             * Third restriction:
             *
             * Permanently block Global Chat.
             *
             * This does NOT block the entire account.
             * Explore3D access remains available.
             */
            if (restrictionCount >= MaxRestrictionsBeforePermanentBlock)
            {
                isChatBlocked = true;

                restrictedUntil = null;
            }
        }

        var updatedCharacter =
            await _characterService.UpdateModerationAsync(
                character.UserId,
                warningCount,
                restrictionCount,
                restrictedUntil,
                isChatBlocked,
                cancellationToken
            );

        if (updatedCharacter is null)
        {
            throw new InvalidOperationException(
                "Unable to update Global Chat moderation status."
            );
        }

        if (isChatBlocked)
        {
            return new ModerationResult(
                UpdatedCharacter: updatedCharacter,
                Action: ModerationAction.PermanentBlock,
                Message:
                    "You have reached the maximum number of Global Chat restrictions. Your Global Chat access is now permanently blocked."
            );
        }

        if (restrictedUntil.HasValue)
        {
            return new ModerationResult(
                UpdatedCharacter: updatedCharacter,
                Action: ModerationAction.Restriction,
                Message:
                    $"You have received warning 3/3. Your Global Chat access is restricted for {RestrictionMonths} months."
            );
        }

        return new ModerationResult(
            UpdatedCharacter: updatedCharacter,
            Action: ModerationAction.Warning,
            Message:
                $"Your message was blocked. Warning {warningCount}/{MaxWarningsBeforeRestriction}."
        );
    }

    // =========================================================
    // RESTRICTION CHECK
    // =========================================================

    public string? GetRestrictionReason(
        Explore3dCharacter character)
    {
        if (character.IsChatBlocked)
        {
            return
                "Your Global Chat access has been permanently blocked.";
        }

        if (character.RestrictedUntil.HasValue)
        {
            var restrictedUntil = character.RestrictedUntil.Value;

            if (restrictedUntil > DateTime.UtcNow)
            {
                return
                    $"Your Global Chat access is restricted until {restrictedUntil:yyyy-MM-dd HH:mm} UTC.";
            }
        }

        return null;
    }

    // =========================================================
    // NORMALIZATION
    // =========================================================

    private static bool ContainsBlockedTerm(
        string normalizedMessage,
        string blockedTerm)
    {
        return normalizedMessage.Contains(
            blockedTerm,
            StringComparison.OrdinalIgnoreCase);
    }

    private static string Normalize(string input)
    {
        var value = input
            .Normalize(NormalizationForm.FormKD)
            .ToLowerInvariant();

        /*
         * Convert common number substitutions.
         *
         * sh4bu -> shabu
         * w33d  -> weed
         */
        value = value
            .Replace('0', 'o')
            .Replace('1', 'i')
            .Replace('3', 'e')
            .Replace('4', 'a')
            .Replace('5', 's')
            .Replace('7', 't');

        /*
         * Remove whitespace and punctuation.
         *
         * "s h a b u"
         * "s.h.a.b.u"
         * "s-h-a-b-u"
         *
         * become:
         *
         * "shabu"
         */
        value = NonAlphaNumericRegex.Replace(
            value,
            string.Empty);

        /*
         * Compress excessive repeated characters.
         */
        value = RepeatedCharacterRegex.Replace(
            value,
            "$1$1");

        return value.Trim();
    }
}

// =============================================================
// MODERATION RESULT
// =============================================================

public sealed record ModerationResult(
    Explore3dCharacter UpdatedCharacter,
    ModerationAction Action,
    string Message
);

// =============================================================
// MODERATION ACTION
// =============================================================

public enum ModerationAction
{
    Warning,
    Restriction,
    PermanentBlock
}

