using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SjTuklas.Api.DTOs.Explore3d;
using SjTuklas.Api.Services.Explore3d;

namespace SjTuklas.Api.Endpoints;

public static class Explore3dCharacterEndpoints
{
    public static IEndpointRouteBuilder MapExplore3dCharacterEndpoints(
        this IEndpointRouteBuilder app
    )
    {
        var group = app
            .MapGroup("/api/explore3d/character")
            .WithTags("Explore3D Character")
            .RequireAuthorization();

        group.MapGet("/me", GetMyCharacter)
            .WithName("GetMyExplore3dCharacter");

        group.MapPost("/me", CreateMyCharacter)
            .WithName("CreateMyExplore3dCharacter");

        group.MapPatch("/me", UpdateMyCharacter)
            .WithName("UpdateMyExplore3dCharacter");

        return app;
    }

    private static async Task<IResult> GetMyCharacter(
        ClaimsPrincipal user,
        IExplore3dCharacterService characterService,
        CancellationToken cancellationToken
    )
    {
        var userId = GetUserId(user);

        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var character = await characterService.GetByUserIdAsync(
            userId.Value,
            cancellationToken
        );

        if (character is null)
        {
            return Results.NotFound(new
            {
                message = "3D character not found."
            });
        }

        return Results.Ok(ToResponse(character));
    }

    private static async Task<IResult> CreateMyCharacter(
        ClaimsPrincipal user,
        [FromBody] CreateCharacterDto request,
        IExplore3dCharacterService characterService,
        CancellationToken cancellationToken
    )
    {
        var userId = GetUserId(user);

        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var existing = await characterService.GetByUserIdAsync(
            userId.Value,
            cancellationToken
        );

        if (existing is not null)
        {
            return Results.Conflict(new
            {
                message = "Your 3D character already exists.",
                character = ToResponse(existing)
            });
        }

        var username = string.IsNullOrWhiteSpace(request.Username)
            ? GetUsername(user)
            : request.Username.Trim();

        var character = await characterService.GetOrCreateAsync(
            userId.Value,
            username,
            cancellationToken
        );

        return Results.Created(
            "/api/explore3d/character/me",
            ToResponse(character)
        );
    }

    private static async Task<IResult> UpdateMyCharacter(
        ClaimsPrincipal user,
        [FromBody] UpdateCharacterDto request,
        IExplore3dCharacterService characterService,
        CancellationToken cancellationToken
    )
    {
        var userId = GetUserId(user);

        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var character = await characterService.UpdateAsync(
            userId.Value,
            request,
            cancellationToken
        );

        if (character is null)
        {
            return Results.NotFound(new
            {
                message = "3D character not found."
            });
        }

        return Results.Ok(ToResponse(character));
    }

    private static Guid? GetUserId(ClaimsPrincipal user)
    {
        var value =
            user.FindFirstValue(ClaimTypes.NameIdentifier) ??
            user.FindFirstValue("sub");

        return Guid.TryParse(value, out var userId)
            ? userId
            : null;
    }

    private static string GetUsername(ClaimsPrincipal user)
    {
        return
            user.FindFirstValue("name") ??
            user.FindFirstValue(ClaimTypes.Name) ??
            user.FindFirstValue(ClaimTypes.Email) ??
            "Explorer";
    }

    private static CharacterResponseDto ToResponse(
        Models.Explore3d.Explore3dCharacter character
    )
    {
        return new CharacterResponseDto(
            character.UserId,
            character.Username,
            character.CharacterModel,
            character.CreatedAt,
            character.UpdatedAt
        );
    }
}