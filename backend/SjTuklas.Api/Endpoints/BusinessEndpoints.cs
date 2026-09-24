using System.Security.Claims;

using Microsoft.AspNetCore.SignalR;

using SjTuklas.Api.Dtos.Businesses;
using SjTuklas.Api.Hubs;
using SjTuklas.Api.Services;

namespace SjTuklas.Api.Endpoints;

public static class BusinessEndpoints
{
    public static IEndpointRouteBuilder MapBusinessEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/businesses")
            .WithTags("Businesses");


        // =====================================================
        // GET ALL APPROVED BUSINESSES
        // PUBLIC
        // =====================================================

        group.MapGet("/", async (
            BusinessService service) =>
        {
            var businesses =
                await service.GetApprovedBusinessesAsync();

            return Results.Ok(businesses);
        });


        // =====================================================
        // GET ALL BUSINESSES
        // ADMIN ONLY
        //
        // Returns:
        // pending
        // approved
        // rejected
        // =====================================================

        group.MapGet("/admin/all", async (
            ClaimsPrincipal user,
            BusinessService businessService,
            ProfileService profileService) =>
        {
            // -------------------------------------------------
            // GET ADMIN USER ID FROM JWT
            // -------------------------------------------------

            var userId =
                user.FindFirstValue("sub");

            if (!Guid.TryParse(
                    userId,
                    out var adminId))
            {
                return Results.Unauthorized();
            }


            // -------------------------------------------------
            // VERIFY ADMIN ROLE
            // -------------------------------------------------

            var isAdmin =
                await profileService.IsAdminAsync(
                    adminId
                );

            if (!isAdmin)
            {
                return Results.Forbid();
            }


            // -------------------------------------------------
            // GET ALL BUSINESSES
            // -------------------------------------------------

            var businesses =
                await businessService
                    .GetBusinessesAsync();

            return Results.Ok(businesses);
        })
        .RequireAuthorization();


        // =====================================================
        // GET BUSINESS BY ID
        // ADMIN ONLY
        //
        // Admin can view:
        // pending
        // approved
        // rejected
        // =====================================================

        group.MapGet("/admin/{id:guid}", async (
            Guid id,
            ClaimsPrincipal user,
            BusinessService businessService,
            ProfileService profileService) =>
        {
            // -------------------------------------------------
            // GET ADMIN USER ID FROM JWT
            // -------------------------------------------------

            var userId =
                user.FindFirstValue("sub");

            if (!Guid.TryParse(
                    userId,
                    out var adminId))
            {
                return Results.Unauthorized();
            }


            // -------------------------------------------------
            // VERIFY ADMIN ROLE
            // -------------------------------------------------

            var isAdmin =
                await profileService.IsAdminAsync(
                    adminId
                );

            if (!isAdmin)
            {
                return Results.Forbid();
            }


            // -------------------------------------------------
            // GET BUSINESS
            //
            // This does NOT filter by status.
            // -------------------------------------------------

            var business =
                await businessService
                    .GetBusinessByIdAsync(id);

            if (business is null)
            {
                return Results.NotFound(new
                {
                    message =
                        "Business not found."
                });
            }

            return Results.Ok(business);
        })
        .RequireAuthorization();


        // =====================================================
        // GET MY BUSINESS
        // PROTECTED
        //
        // Owner can see their business regardless of status.
        // =====================================================

        group.MapGet("/mine", async (
            ClaimsPrincipal user,
            BusinessService service) =>
        {
            // -------------------------------------------------
            // GET USER ID FROM JWT
            // -------------------------------------------------

            var userId =
                user.FindFirstValue("sub");

            if (!Guid.TryParse(
                    userId,
                    out var ownerId))
            {
                return Results.Unauthorized();
            }


            // -------------------------------------------------
            // GET BUSINESS OWNED BY CURRENT USER
            // -------------------------------------------------

            var business =
                await service
                    .GetBusinessByOwnerIdAsync(
                        ownerId
                    );

            if (business is null)
            {
                return Results.NotFound(new
                {
                    message =
                        "You do not have a business yet."
                });
            }

            return Results.Ok(business);
        })
        .RequireAuthorization();


        // =====================================================
        // GET BUSINESS BY ID
        // PUBLIC
        //
        // Only APPROVED businesses can be viewed publicly.
        //
        // pending  -> 404
        // rejected -> 404
        // approved -> returned
        // =====================================================

        group.MapGet("/{id:guid}", async (
            Guid id,
            BusinessService service) =>
        {
            var business =
                await service
                    .GetApprovedBusinessByIdAsync(id);

            if (business is null)
            {
                return Results.NotFound(new
                {
                    message =
                        "Business not found."
                });
            }

            return Results.Ok(business);
        });


        // =====================================================
        // CREATE BUSINESS
        // PROTECTED
        //
        // New business is automatically:
        //
        // status   = pending
        // verified = false
        // is_pro   = false
        //
        // IMAGE STRUCTURE:
        //
        // image        = gallery / feature image
        // coverImage   = business profile cover
        // profileImage = business profile logo
        // =====================================================

        group.MapPost("/", async (
            ClaimsPrincipal user,
            CreateBusinessDto dto,
            BusinessService service) =>
        {
            // -------------------------------------------------
            // GET AUTHENTICATED USER ID
            // -------------------------------------------------

            var userId =
                user.FindFirstValue("sub");

            if (!Guid.TryParse(
                    userId,
                    out var ownerId))
            {
                return Results.Unauthorized();
            }


            // -------------------------------------------------
            // CREATE BUSINESS
            // -------------------------------------------------

            var business =
                await service.CreateBusinessAsync(
                    dto,
                    ownerId
                );

            return Results.Created(
                $"/api/businesses/{business.Id}",
                business
            );
        })
        .RequireAuthorization();


        // =====================================================
        // UPDATE BUSINESS
        // PROTECTED
        // OWNER ONLY
        //
        // Supports:
        //
        // image        = gallery / feature image
        // coverImage   = business profile cover
        // profileImage = business profile logo
        // =====================================================

        group.MapPut("/{id:guid}", async (
            Guid id,
            UpdateBusinessDto dto,
            ClaimsPrincipal user,
            BusinessService service) =>
        {
            // -------------------------------------------------
            // GET AUTHENTICATED USER ID
            // -------------------------------------------------

            var userId =
                user.FindFirstValue("sub");

            if (!Guid.TryParse(
                    userId,
                    out var ownerId))
            {
                return Results.Unauthorized();
            }


            // -------------------------------------------------
            // UPDATE ONLY IF USER OWNS BUSINESS
            // -------------------------------------------------

            var business =
                await service.UpdateBusinessAsync(
                    id,
                    dto,
                    ownerId
                );

            if (business is null)
            {
                return Results.NotFound(new
                {
                    message =
                        "Business not found."
                });
            }

            return Results.Ok(business);
        })
        .RequireAuthorization();


        // =====================================================
        // DELETE BUSINESS
        // PROTECTED
        // OWNER ONLY
        // =====================================================

        group.MapDelete("/{id:guid}", async (
            Guid id,
            ClaimsPrincipal user,
            BusinessService service) =>
        {
            // -------------------------------------------------
            // GET AUTHENTICATED USER ID
            // -------------------------------------------------

            var userId =
                user.FindFirstValue("sub");

            if (!Guid.TryParse(
                    userId,
                    out var ownerId))
            {
                return Results.Unauthorized();
            }


            // -------------------------------------------------
            // DELETE ONLY IF USER OWNS BUSINESS
            // -------------------------------------------------

            var deleted =
                await service.DeleteBusinessAsync(
                    id,
                    ownerId
                );

            if (!deleted)
            {
                return Results.NotFound(new
                {
                    message =
                        "Business not found."
                });
            }

            return Results.NoContent();
        })
        .RequireAuthorization();


        // =====================================================
        // UPDATE BUSINESS STATUS
        // ADMIN ONLY
        // REALTIME
        //
        // pending
        // approved
        // rejected
        // =====================================================

        group.MapPatch(
            "/{id:guid}/status",
            async (
                Guid id,
                UpdateBusinessStatusDto dto,
                ClaimsPrincipal user,
                BusinessService businessService,
                ProfileService profileService,
                IHubContext<BusinessHub> hubContext) =>
            {
                // -------------------------------------------------
                // GET ADMIN USER ID FROM JWT
                // -------------------------------------------------

                var userId =
                    user.FindFirstValue("sub");

                if (!Guid.TryParse(
                        userId,
                        out var adminId))
                {
                    return Results.Unauthorized();
                }


                // -------------------------------------------------
                // VERIFY ADMIN ROLE
                // -------------------------------------------------

                var isAdmin =
                    await profileService
                        .IsAdminAsync(adminId);

                if (!isAdmin)
                {
                    return Results.Forbid();
                }


                // -------------------------------------------------
                // VALIDATE STATUS
                // -------------------------------------------------

                var status =
                    dto.Status
                        .Trim()
                        .ToLowerInvariant();

                if (
                    status != "pending" &&
                    status != "approved" &&
                    status != "rejected"
                )
                {
                    return Results.BadRequest(new
                    {
                        message =
                            "Status must be pending, approved, or rejected."
                    });
                }


                // -------------------------------------------------
                // UPDATE DATABASE
                // -------------------------------------------------

                var business =
                    await businessService
                        .UpdateBusinessStatusAsync(
                            id,
                            status
                        );

                if (business is null)
                {
                    return Results.NotFound(new
                    {
                        message =
                            "Business not found."
                    });
                }


                // -------------------------------------------------
                // SEND REALTIME EVENT TO BUSINESS OWNER
                // -------------------------------------------------

                await hubContext.Clients
                    .User(
                        business.OwnerId
                            .ToString()
                    )
                    .SendAsync(
                        "BusinessStatusChanged",
                        new
                        {
                            businessId =
                                business.Id,

                            status =
                                business.Status,

                            business =
                                business
                        }
                    );


                // -------------------------------------------------
                // RETURN UPDATED BUSINESS
                // -------------------------------------------------

                return Results.Ok(business);
            }
        )
        .RequireAuthorization();


        // =====================================================
        // UPLOAD BUSINESS IMAGE
        // PROTECTED
        // OWNER ONLY
        //
        // imageType:
        //
        // profile -> profile_image
        // cover   -> cover_image
        // gallery -> image
        //
        // POST:
        //
        // /api/businesses/{id}/images/profile
        // /api/businesses/{id}/images/cover
        // /api/businesses/{id}/images/gallery
        // =====================================================

        group.MapPost(
            "/{id:guid}/images/{imageType}",
            async (
                Guid id,
                string imageType,
                IFormFile file,
                ClaimsPrincipal user,
                BusinessService businessService,
                ISupabaseStorageService storageService,
                CancellationToken cancellationToken) =>
            {
                // -------------------------------------------------
                // GET AUTHENTICATED USER ID
                // -------------------------------------------------

                var userId =
                    user.FindFirstValue("sub");

                if (!Guid.TryParse(
                        userId,
                        out var ownerId))
                {
                    return Results.Unauthorized();
                }


                // -------------------------------------------------
                // NORMALIZE IMAGE TYPE
                // -------------------------------------------------

                imageType =
                    imageType
                        .Trim()
                        .ToLowerInvariant();


                // -------------------------------------------------
                // VALIDATE IMAGE TYPE
                // -------------------------------------------------

                if (
                    imageType != "profile" &&
                    imageType != "cover" &&
                    imageType != "gallery"
                )
                {
                    return Results.BadRequest(new
                    {
                        message =
                            "Invalid image type. Use profile, cover, or gallery."
                    });
                }


                // -------------------------------------------------
                // VALIDATE FILE
                // -------------------------------------------------

                if (
                    file is null ||
                    file.Length == 0
                )
                {
                    return Results.BadRequest(new
                    {
                        message =
                            "Image file is required."
                    });
                }


                // -------------------------------------------------
                // VALIDATE CONTENT TYPE
                // -------------------------------------------------

                var allowedContentTypes =
                    new[]
                    {
                        "image/jpeg",
                        "image/jpg",
                        "image/png",
                        "image/webp"
                    };

                var contentType =
                    file.ContentType
                        ?.Trim()
                        .ToLowerInvariant();

                if (
                    string.IsNullOrWhiteSpace(
                        contentType
                    )
                    ||
                    !allowedContentTypes.Contains(
                        contentType
                    )
                )
                {
                    return Results.BadRequest(new
                    {
                        message =
                            "Only JPG, PNG, and WEBP images are allowed."
                    });
                }


                // -------------------------------------------------
                // MAX FILE SIZE
                // 5 MB
                //
                // This matches SupabaseStorageService.
                // -------------------------------------------------

                const long maxFileSize =
                    5 * 1024 * 1024;

                if (file.Length > maxFileSize)
                {
                    return Results.BadRequest(new
                    {
                        message =
                            "Image file must not exceed 5 MB."
                    });
                }


                // -------------------------------------------------
                // VERIFY BUSINESS OWNERSHIP
                // -------------------------------------------------

                var business =
                    await businessService
                        .GetBusinessByOwnerIdAsync(
                            ownerId
                        );

                if (
                    business is null ||
                    business.Id != id
                )
                {
                    return Results.NotFound(new
                    {
                        message =
                            "Business not found."
                    });
                }


                // -------------------------------------------------
                // UPLOAD TO SUPABASE STORAGE
                // -------------------------------------------------

                try
                {
                    var imageUrl =
                        await storageService
                            .UploadBusinessImageAsync(
                                id,
                                imageType,
                                file,
                                cancellationToken
                            );


                    // -------------------------------------------------
                    // SAVE IMAGE URL TO DATABASE
                    // -------------------------------------------------

                    var updated =
                        await businessService
                            .UpdateBusinessImageAsync(
                                id,
                                ownerId,
                                imageType,
                                imageUrl
                            );

                    if (!updated)
                    {
                        return Results.NotFound(new
                        {
                            message =
                                "Business image could not be updated."
                        });
                    }


                    // -------------------------------------------------
                    // SUCCESS
                    // -------------------------------------------------

                    return Results.Ok(new
                    {
                        message =
                            "Business image uploaded successfully.",

                        imageType,

                        imageUrl
                    });
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new
                    {
                        message =
                            ex.Message
                    });
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new
                    {
                        message =
                            ex.Message
                    });
                }
            }
        )
        .RequireAuthorization()
        .DisableAntiforgery();


        // =====================================================
        // RETURN ENDPOINT ROUTES
        // =====================================================

        return app;
    }
}