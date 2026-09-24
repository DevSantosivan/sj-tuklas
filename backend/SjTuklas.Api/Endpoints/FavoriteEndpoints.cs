using System.Security.Claims;

using SjTuklas.Api.Dtos.Favorites;
using SjTuklas.Api.Services;

namespace SjTuklas.Api.Endpoints;

public static class FavoriteEndpoints
{
    public static IEndpointRouteBuilder MapFavoriteEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/favorites")
            .WithTags("Favorites")
            .RequireAuthorization();

        // ========================================================
        // GET ALL FAVORITES OF CURRENT USER
        // ========================================================

        group.MapGet(
            "",
            async (
                ClaimsPrincipal user,
                FavoriteService favoriteService) =>
            {
                var userIdClaim =
                    user.FindFirstValue("sub");

                if (
                    !Guid.TryParse(
                        userIdClaim,
                        out var userId
                    )
                )
                {
                    return Results.Unauthorized();
                }

                var favorites =
                    await favoriteService
                        .GetUserFavoritesAsync(userId);

                return Results.Ok(favorites);
            }
        );

        // ========================================================
        // CHECK IF BUSINESS IS FAVORITED
        // ========================================================

        group.MapGet(
            "/{businessId:guid}",
            async (
                Guid businessId,
                ClaimsPrincipal user,
                FavoriteService favoriteService) =>
            {
                var userIdClaim =
                    user.FindFirstValue("sub");

                if (
                    !Guid.TryParse(
                        userIdClaim,
                        out var userId
                    )
                )
                {
                    return Results.Unauthorized();
                }

                var isFavorite =
                    await favoriteService
                        .IsFavoriteAsync(
                            userId,
                            businessId
                        );

                return Results.Ok(
                    new FavoriteActionResponseDto
                    {
                        Success = true,

                        IsFavorite =
                            isFavorite,

                        BusinessId =
                            businessId,

                        Message =
                            isFavorite
                                ? "Business is in your favorites."
                                : "Business is not in your favorites."
                    }
                );
            }
        );

        // ========================================================
        // ADD FAVORITE
        // ========================================================

        group.MapPost(
            "/{businessId:guid}",
            async (
                Guid businessId,
                ClaimsPrincipal user,
                FavoriteService favoriteService) =>
            {
                var userIdClaim =
                    user.FindFirstValue("sub");

                if (
                    !Guid.TryParse(
                        userIdClaim,
                        out var userId
                    )
                )
                {
                    return Results.Unauthorized();
                }

                // ------------------------------------------------
                // CHECK IF ALREADY FAVORITED
                // ------------------------------------------------

                var alreadyFavorite =
                    await favoriteService
                        .IsFavoriteAsync(
                            userId,
                            businessId
                        );

                if (alreadyFavorite)
                {
                    return Results.Ok(
                        new FavoriteActionResponseDto
                        {
                            Success = true,

                            IsFavorite = true,

                            BusinessId =
                                businessId,

                            Message =
                                "Business is already in your favorites."
                        }
                    );
                }

                // ------------------------------------------------
                // ADD
                // ------------------------------------------------

                await favoriteService
                    .AddFavoriteAsync(
                        userId,
                        businessId
                    );

                return Results.Ok(
                    new FavoriteActionResponseDto
                    {
                        Success = true,

                        IsFavorite = true,

                        BusinessId =
                            businessId,

                        Message =
                            "Business added to favorites."
                    }
                );
            }
        );

        // ========================================================
        // REMOVE FAVORITE
        // ========================================================

        group.MapDelete(
            "/{businessId:guid}",
            async (
                Guid businessId,
                ClaimsPrincipal user,
                FavoriteService favoriteService) =>
            {
                var userIdClaim =
                    user.FindFirstValue("sub");

                if (
                    !Guid.TryParse(
                        userIdClaim,
                        out var userId
                    )
                )
                {
                    return Results.Unauthorized();
                }

                var removed =
                    await favoriteService
                        .RemoveFavoriteAsync(
                            userId,
                            businessId
                        );

                if (!removed)
                {
                    return Results.NotFound(
                        new
                        {
                            message =
                                "Favorite not found."
                        }
                    );
                }

                return Results.Ok(
                    new FavoriteActionResponseDto
                    {
                        Success = true,

                        IsFavorite = false,

                        BusinessId =
                            businessId,

                        Message =
                            "Business removed from favorites."
                    }
                );
            }
        );

        return app;
    }
}