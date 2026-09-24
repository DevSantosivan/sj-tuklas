
using SjTuklas.Api.Dtos.Stats;
using SjTuklas.Api.Services;

namespace SjTuklas.Api.Endpoints;

public static class StatsEndpoints
{
    public static IEndpointRouteBuilder MapStatsEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/public/stats")
            .WithTags("Public Statistics");

        // ========================================================
        // COMMUNITY STATS
        // ========================================================

        group.MapGet(
            "",
            async (
                ProfileService profileService) =>
            {
                try
                {
                    // ------------------------------------------------
                    // REGISTERED USERS
                    // ------------------------------------------------

                    var registeredUsers =
                        await profileService
                            .GetRegisteredUserCountAsync();

                    // ------------------------------------------------
                    // DEFAULT CATEGORIES
                    // ------------------------------------------------
                    //
                    // Temporary static value.
                    // Update this when your category list changes.
                    //

                    const int categories = 8;

                    // ------------------------------------------------
                    // RETURN STATS
                    // ------------------------------------------------

                    return Results.Ok(
                        new CommunityStatsDto
                        {
                            RegisteredUsers =
                                registeredUsers,

                            Categories =
                                categories,

                            // These will be populated from the
                            // existing business data on Angular.
                            Businesses = 0,
                            Services = 0
                        }
                    );
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        "=========================================="
                    );

                    Console.WriteLine(
                        "COMMUNITY STATS ERROR"
                    );

                    Console.WriteLine(
                        $"Type: {ex.GetType().Name}"
                    );

                    Console.WriteLine(
                        $"Message: {ex.Message}"
                    );

                    Console.WriteLine(
                        ex.ToString()
                    );

                    Console.WriteLine(
                        "=========================================="
                    );

                    return Results.Problem(
                        detail:
                            "Failed to load community statistics.",
                        statusCode:
                            StatusCodes.Status500InternalServerError
                    );
                }
            }
        );

        return app;
    }
}
