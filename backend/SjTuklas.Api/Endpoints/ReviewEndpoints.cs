using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SjTuklas.Api.Dtos.Reviews;
using SjTuklas.Api.Services;

namespace SjTuklas.Api.Endpoints;

public static class ReviewEndpoints
{
    public static IEndpointRouteBuilder MapReviewEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api")
            .WithTags("Reviews");

        // GET /api/businesses/{businessId}/reviews
        group.MapGet(
            "/businesses/{businessId:guid}/reviews",
            async (
                Guid businessId,
                ReviewService reviewService) =>
            {
                var reviews = await reviewService.GetReviewsAsync(
                    businessId
                );

                return Results.Ok(reviews);
            })
            .AllowAnonymous();

        // GET /api/businesses/{businessId}/reviews/summary
        group.MapGet(
            "/businesses/{businessId:guid}/reviews/summary",
            async (
                Guid businessId,
                ReviewService reviewService) =>
            {
                var summary = await reviewService.GetSummaryAsync(
                    businessId
                );

                return Results.Ok(summary);
            })
            .AllowAnonymous();

        // GET /api/businesses/{businessId}/reviews/me
        group.MapGet(
            "/businesses/{businessId:guid}/reviews/me",
            async (
                Guid businessId,
                ClaimsPrincipal user,
                ReviewService reviewService) =>
            {
                var userId = GetUserId(user);

                if (string.IsNullOrWhiteSpace(userId))
                {
                    return Results.Unauthorized();
                }

                var review = await reviewService.GetMyReviewAsync(
                    businessId,
                    userId
                );

                return Results.Ok(review);
            })
            .RequireAuthorization();

        // POST /api/businesses/{businessId}/reviews
        group.MapPost(
            "/businesses/{businessId:guid}/reviews",
            async (
                Guid businessId,
                [FromBody] CreateReviewRequest request,
                ClaimsPrincipal user,
                ReviewService reviewService) =>
            {
                var userId = GetUserId(user);

                if (string.IsNullOrWhiteSpace(userId))
                {
                    return Results.Unauthorized();
                }

                if (request is null)
                {
                    return Results.BadRequest(new
                    {
                        message = "Review request is required."
                    });
                }

                if (request.Rating < 1 || request.Rating > 5)
                {
                    return Results.BadRequest(new
                    {
                        message = "Rating must be from 1 to 5."
                    });
                }

                var comment = request.Comment?.Trim();

                if (string.IsNullOrWhiteSpace(comment))
                {
                    return Results.BadRequest(new
                    {
                        message = "Review comment is required."
                    });
                }

                if (comment.Length > 2000)
                {
                    return Results.BadRequest(new
                    {
                        message = "Review must not exceed 2000 characters."
                    });
                }

                var userName =
                    user.FindFirst(ClaimTypes.Name)?.Value
                    ?? user.FindFirst("name")?.Value
                    ?? user.FindFirst("preferred_username")?.Value
                    ?? "SJ Tuklas User";

                try
                {
                    var review = await reviewService.CreateReviewAsync(
                        businessId,
                        userId,
                        userName,
                        new CreateReviewRequest
                        {
                            Rating = request.Rating,
                            Comment = comment
                        }
                    );

                    return Results.Created(
                        $"/api/businesses/{businessId}/reviews",
                        review
                    );
                }
                catch (ReviewAlreadyExistsException)
                {
                    return Results.Conflict(new
                    {
                        message = "You have already reviewed this business."
                    });
                }
                catch (ArgumentException)
                {
                    return Results.Unauthorized();
                }
            })
            .RequireAuthorization();

        // DELETE /api/reviews/{reviewId}
        group.MapDelete(
            "/reviews/{reviewId:guid}",
            async (
                Guid reviewId,
                ClaimsPrincipal user,
                ReviewService reviewService) =>
            {
                var userId = GetUserId(user);

                if (string.IsNullOrWhiteSpace(userId))
                {
                    return Results.Unauthorized();
                }

                var deleted = await reviewService.DeleteReviewAsync(
                    reviewId,
                    userId
                );

                if (!deleted)
                {
                    return Results.NotFound(new
                    {
                        message = "Review not found."
                    });
                }

                return Results.NoContent();
            })
            .RequireAuthorization();

        return app;
    }

    private static string? GetUserId(ClaimsPrincipal user)
    {
        return user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("sub")?.Value;
    }
}