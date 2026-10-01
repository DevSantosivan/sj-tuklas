
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SjTuklas.Api.Dtos.Inquiries;
using SjTuklas.Api.Services;

namespace SjTuklas.Api.Endpoints;

public static class InquiryEndpoints
{
    public static IEndpointRouteBuilder MapInquiryEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/inquiries")
            .WithTags("Inquiries")
            .RequireAuthorization();

        // GET: /api/inquiries
        group.MapGet("/", async (
            ClaimsPrincipal user,
            IInquiryService inquiryService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var inquiries = await inquiryService.GetMyInquiriesAsync(
                userId,
                cancellationToken);

            return Results.Ok(inquiries);
        });

        // GET: /api/inquiries/{id}
        group.MapGet("/{id:guid}", async (
            Guid id,
            ClaimsPrincipal user,
            IInquiryService inquiryService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var inquiry = await inquiryService.GetInquiryByIdAsync(
                id,
                userId,
                cancellationToken);

            return inquiry is null
                ? Results.NotFound()
                : Results.Ok(inquiry);
        });

        // GET: /api/inquiries/{id}/messages
        group.MapGet("/{id:guid}/messages", async (
            Guid id,
            ClaimsPrincipal user,
            IInquiryService inquiryService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var messages = await inquiryService.GetMessagesAsync(
                id,
                userId,
                cancellationToken);

            return messages is null
                ? Results.NotFound()
                : Results.Ok(messages);
        });

        // POST: /api/inquiries
        group.MapPost("/", async (
            [FromBody] CreateInquiryRequest request,
            ClaimsPrincipal user,
            IInquiryService inquiryService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            try
            {
                var inquiry = await inquiryService.CreateInquiryAsync(
                    request,
                    userId,
                    cancellationToken);

                return Results.Ok(inquiry);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { message = ex.Message });
            }
        });


        // GET: /api/inquiries/business
// BUSINESS OWNER: Get inquiries received by owned businesses
group.MapGet("/business", async (
    ClaimsPrincipal user,
    IInquiryService inquiryService,
    CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId))
        return Results.Unauthorized();

    var inquiries = await inquiryService.GetBusinessInquiriesAsync(
        userId,
        cancellationToken);

    return Results.Ok(inquiries);
});

        // POST: /api/inquiries/business/{businessId}
        group.MapPost("/business/{businessId:guid}", async (
            Guid businessId,
            ClaimsPrincipal user,
            IInquiryService inquiryService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            try
            {
                var inquiry = await inquiryService.FindOrCreateForBusinessAsync(
                    businessId,
                    userId,
                    cancellationToken);

                return Results.Ok(inquiry);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { message = ex.Message });
            }
        });

        // POST: /api/inquiries/{id}/messages
        group.MapPost("/{id:guid}/messages", async (
            Guid id,
            [FromBody] SendInquiryMessageRequest request,
            ClaimsPrincipal user,
            IInquiryService inquiryService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            try
            {
                var message = await inquiryService.SendMessageAsync(
                    id,
                    request.Message,
                    userId,
                    cancellationToken);

                return message is null
                    ? Results.NotFound()
                    : Results.Ok(message);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        // PATCH: /api/inquiries/{id}/read
        group.MapPatch("/{id:guid}/read", async (
            Guid id,
            ClaimsPrincipal user,
            IInquiryService inquiryService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var updated = await inquiryService.MarkAsReadAsync(
                id,
                userId,
                cancellationToken);

            return updated
                ? Results.NoContent()
                : Results.NotFound();
        });

        return app;
    }

    private static bool TryGetUserId(
        ClaimsPrincipal user,
        out Guid userId)
    {
        var userIdValue =
            user.FindFirst("sub")?.Value ??
            user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return Guid.TryParse(userIdValue, out userId);
    }
}