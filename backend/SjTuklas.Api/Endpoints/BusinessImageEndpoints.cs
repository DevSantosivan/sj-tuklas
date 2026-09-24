using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;

using SjTuklas.Api.Services;

namespace SjTuklas.Api.Endpoints;

public static class BusinessImageEndpoints
{
    public static void MapBusinessImageEndpoints(
        this WebApplication app
    )
    {
        var group =
            app.MapGroup("/api/businesses")
               .RequireAuthorization();

        group.MapPost(
            "/{businessId:guid}/images/{imageType}",
            UploadBusinessImageAsync
        );
    }

    private static async Task<IResult>
        UploadBusinessImageAsync(
            Guid businessId,
            string imageType,
            IFormFile file,
            HttpContext httpContext,
            BusinessService businessService,
            ISupabaseStorageService storageService
        )
    {
        try
        {
            // =================================================
            // VALIDATE IMAGE TYPE
            // =================================================

            imageType =
                imageType.Trim().ToLowerInvariant();

            if (
                imageType != "profile" &&
                imageType != "cover" &&
                imageType != "gallery"
            )
            {
                return Results.BadRequest(
                    new
                    {
                        message =
                            "Invalid image type. Use profile, cover, or gallery."
                    }
                );
            }

            // =================================================
            // VALIDATE FILE
            // =================================================

            if (file == null || file.Length == 0)
            {
                return Results.BadRequest(
                    new
                    {
                        message =
                            "Please select an image."
                    }
                );
            }

            // =================================================
            // GET CURRENT USER
            // =================================================

            var userIdClaim =
                httpContext.User.FindFirstValue("sub");

            if (!Guid.TryParse(
                    userIdClaim,
                    out var userId))
            {
                return Results.Unauthorized();
            }

            // =================================================
            // GET BUSINESS
            // =================================================

            var business =
                await businessService
                    .GetBusinessByIdAsync(
                        businessId
                    );

            if (business == null)
            {
                return Results.NotFound(
                    new
                    {
                        message =
                            "Business not found."
                    }
                );
            }

            // =================================================
            // OWNER CHECK
            // =================================================

            if (business.OwnerId != userId)
            {
                return Results.Forbid();
            }

            // =================================================
            // UPLOAD TO SUPABASE STORAGE
            // =================================================

            var imageUrl =
                await storageService
                    .UploadBusinessImageAsync(
                        businessId,
                        imageType,
                        file
                    );

            // =================================================
            // SAVE URL TO DATABASE
            // =================================================

            var updated =
                await businessService
                    .UpdateBusinessImageAsync(
                        businessId,
                        userId,
                        imageType,
                        imageUrl
                    );

            if (!updated)
            {
                return Results.BadRequest(
                    new
                    {
                        message =
                            "Image uploaded but business record was not updated."
                    }
                );
            }

            // =================================================
            // SUCCESS
            // =================================================

            return Results.Ok(
                new
                {
                    message =
                        "Business image uploaded successfully.",

                    imageType,

                    imageUrl
                }
            );
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(
                new
                {
                    message = ex.Message
                }
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"BUSINESS IMAGE UPLOAD ERROR: {ex}"
            );

            return Results.Problem(
                detail: ex.Message,
                statusCode:
                    StatusCodes.Status500InternalServerError
            );
        }
    }
}