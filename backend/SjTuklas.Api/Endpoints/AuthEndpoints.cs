using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

using SjTuklas.Api.Dtos.Auth;
using SjTuklas.Api.Hubs;
using SjTuklas.Api.Services;

namespace SjTuklas.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/auth")
            .WithTags("Authentication");

      // ========================================================
// REGISTER
// ========================================================

group.MapPost(
    "/register",
    async (
        RegisterRequestDto request,
        HttpContext context,
        AuthService authService,
        IHubContext<BusinessHub> hubContext) =>
    {
        // ------------------------------------------------
        // BASIC VALIDATION
        // ------------------------------------------------

        if (
            string.IsNullOrWhiteSpace(request.Email)
            ||
            string.IsNullOrWhiteSpace(request.Password)
            ||
            string.IsNullOrWhiteSpace(request.FullName)
        )
        {
            return Results.BadRequest(new
            {
                message =
                    "Email, password, and full name are required."
            });
        }

        if (
            request.Role != "visitor"
            &&
            request.Role != "business_owner"
        )
        {
            return Results.BadRequest(new
            {
                message =
                    "Invalid account role."
            });
        }

        try
        {
            // ------------------------------------------------
            // CREATE SUPABASE AUTH USER
            // ------------------------------------------------

            var result =
                await authService.SignUpAsync(
                    request
                );

            // ------------------------------------------------
            // VALIDATE SUPABASE RESPONSE
            // ------------------------------------------------

            if (result.User is null)
            {
                return Results.BadRequest(new
                {
                    message =
                        "Registration failed."
                });
            }

            // ------------------------------------------------
            // STORE TOKENS IF AVAILABLE
            // ------------------------------------------------

            if (
                !string.IsNullOrWhiteSpace(
                    result.AccessToken
                )
                &&
                !string.IsNullOrWhiteSpace(
                    result.RefreshToken
                )
            )
            {
                SetAuthenticationCookies(
                    context,
                    result
                );
            }

            // ------------------------------------------------
            // 🔥 REALTIME USER REGISTERED EVENT
            // ------------------------------------------------
            //
            // IMPORTANT:
            // This is sent only AFTER SignUpAsync succeeds.
            //
            // If SignUpAsync also creates the profiles row,
            // then the community stats count can safely
            // re-fetch after receiving this event.
            // ------------------------------------------------

            Console.WriteLine(
                "=========================================="
            );

            Console.WriteLine(
                "USER REGISTERED - BROADCASTING REALTIME EVENT"
            );

            Console.WriteLine(
                $"User ID: {result.User.Id}"
            );

            Console.WriteLine(
                $"Email: {result.User.Email}"
            );

            Console.WriteLine(
                $"Role: {request.Role}"
            );

            await hubContext.Clients.All.SendAsync(
                "UserRegistered",
                new
                {
                    userId = result.User.Id
                }
            );

            Console.WriteLine(
                "USER REGISTERED EVENT SENT"
            );

            Console.WriteLine(
                "=========================================="
            );

            // ------------------------------------------------
            // RETURN API DTO
            // ------------------------------------------------

            return Results.Ok(
                new AuthResponseDto
                {
                    User =
                        new AuthUserDto
                        {
                            Id =
                                result.User.Id,

                            Email =
                                result.User.Email,

                            FullName =
                                GetMetadataValue(
                                    result.User.UserMetadata,
                                    "full_name"
                                ),

                            Role =
                                GetMetadataValue(
                                    result.User.UserMetadata,
                                    "role"
                                )
                        },

                    ExpiresIn =
                        result.ExpiresIn
                }
            );
        }
        catch (InvalidOperationException ex)
        {
            Console.WriteLine(
                "=========================================="
            );

            Console.WriteLine(
                "REGISTRATION VALIDATION ERROR"
            );

            Console.WriteLine(
                $"Message: {ex.Message}"
            );

            Console.WriteLine(
                "=========================================="
            );

            return Results.BadRequest(new
            {
                message =
                    ex.Message
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                "=========================================="
            );

            Console.WriteLine(
                "REGISTRATION ERROR"
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
                detail: ex.Message,
                statusCode: 500
            );
        }
    }
);
      

        // ========================================================
        // LOGIN
        // ========================================================

        group.MapPost(
            "/login",
            async (
                LoginRequestDto request,
                HttpContext context,
                AuthService authService,
                ProfileService profileService) =>
            {
                Console.WriteLine(
                    "=========================================="
                );

                Console.WriteLine(
                    "LOGIN REQUEST"
                );

                Console.WriteLine(
                    $"Email: {request.Email}"
                );

                Console.WriteLine(
                    $"Password supplied: {!string.IsNullOrWhiteSpace(request.Password)}"
                );

                Console.WriteLine(
                    "=========================================="
                );

                // ------------------------------------------------
                // BASIC VALIDATION
                // ------------------------------------------------

                if (
                    string.IsNullOrWhiteSpace(request.Email)
                    ||
                    string.IsNullOrWhiteSpace(request.Password)
                )
                {
                    Console.WriteLine(
                        "LOGIN REJECTED: EMAIL OR PASSWORD EMPTY"
                    );

                    return Results.BadRequest(new
                    {
                        message =
                            "Email and password are required."
                    });
                }

                try
                {
                    // ------------------------------------------------
                    // SIGN IN WITH SUPABASE
                    // ------------------------------------------------

                    Console.WriteLine(
                        "Calling Supabase authentication..."
                    );

                    var result =
                        await authService.SignInAsync(
                            request
                        );

                    Console.WriteLine(
                        "Supabase authentication request completed."
                    );

                    // ------------------------------------------------
                    // DEBUG SUPABASE RESPONSE
                    // ------------------------------------------------

                    Console.WriteLine(
                        "------------------------------------------"
                    );

                    Console.WriteLine(
                        $"User returned: {result.User is not null}"
                    );

                    Console.WriteLine(
                        $"Access token returned: {!string.IsNullOrWhiteSpace(result.AccessToken)}"
                    );

                    Console.WriteLine(
                        $"Refresh token returned: {!string.IsNullOrWhiteSpace(result.RefreshToken)}"
                    );

                    Console.WriteLine(
                        $"Expires in: {result.ExpiresIn}"
                    );

                    if (result.User is not null)
                    {
                        Console.WriteLine(
                            $"Supabase User ID: {result.User.Id}"
                        );

                        Console.WriteLine(
                            $"Supabase Email: {result.User.Email}"
                        );
                    }

                    Console.WriteLine(
                        "------------------------------------------"
                    );

                    // ------------------------------------------------
                    // VALIDATE SUPABASE RESPONSE
                    // ------------------------------------------------

                    if (
                        string.IsNullOrWhiteSpace(
                            result.AccessToken
                        )
                        ||
                        string.IsNullOrWhiteSpace(
                            result.RefreshToken
                        )
                        ||
                        result.User is null
                    )
                    {
                        Console.WriteLine(
                            "LOGIN FAILED: INVALID SUPABASE RESPONSE"
                        );

                        Console.WriteLine(
                            $"Has Access Token: {!string.IsNullOrWhiteSpace(result.AccessToken)}"
                        );

                        Console.WriteLine(
                            $"Has Refresh Token: {!string.IsNullOrWhiteSpace(result.RefreshToken)}"
                        );

                        Console.WriteLine(
                            $"Has User: {result.User is not null}"
                        );

                        Console.WriteLine(
                            "=========================================="
                        );

                        return Results.Json(
                            new
                            {
                                message =
                                    "Supabase login did not return a complete authentication response."
                            },
                            statusCode:
                                StatusCodes.Status401Unauthorized
                        );
                    }

                    // ------------------------------------------------
                    // STORE TOKENS IN HTTP-ONLY COOKIES
                    // ------------------------------------------------

                    Console.WriteLine(
                        "Setting authentication cookies..."
                    );

                    SetAuthenticationCookies(
                        context,
                        result
                    );

                    Console.WriteLine(
                        "Authentication cookies set."
                    );

                    // ------------------------------------------------
                    // GET PROFILE
                    // ------------------------------------------------

                    Console.WriteLine(
                        "Loading user profile..."
                    );

                    var profile =
                        await profileService.GetProfileAsync(
                            result.User.Id
                        );

                    Console.WriteLine(
                        $"Profile found: {profile is not null}"
                    );

                    if (profile is not null)
                    {
                        Console.WriteLine(
                            $"Profile role: {profile.Role}"
                        );

                        Console.WriteLine(
                            $"Profile name: {profile.FullName}"
                        );

                        Console.WriteLine(
                            $"Profile email: {profile.Email}"
                        );
                    }

                    // ------------------------------------------------
                    // RETURN API DTO
                    // ------------------------------------------------

                    Console.WriteLine(
                        "LOGIN SUCCESS"
                    );

                    Console.WriteLine(
                        "=========================================="
                    );

                    return Results.Ok(
                        new AuthResponseDto
                        {
                            User =
                                new AuthUserDto
                                {
                                    Id =
                                        result.User.Id,

                                    Email =
                                        result.User.Email,

                                    FullName =
                                        profile?.FullName,

                                    Role =
                                        profile?.Role
                                },

                            ExpiresIn =
                                result.ExpiresIn
                        }
                    );
                }
                catch (Exception ex)
                {
                    // ------------------------------------------------
                    // IMPORTANT LOGIN DEBUGGING
                    // ------------------------------------------------

                    Console.WriteLine(
                        "=========================================="
                    );

                    Console.WriteLine(
                        "LOGIN ERROR"
                    );

                    Console.WriteLine(
                        $"Exception Type: {ex.GetType().Name}"
                    );

                    Console.WriteLine(
                        $"Message: {ex.Message}"
                    );

                    Console.WriteLine(
                        "Full Exception:"
                    );

                    Console.WriteLine(
                        ex.ToString()
                    );

                    Console.WriteLine(
                        "=========================================="
                    );

                    return Results.Json(
                        new
                        {
                            message =
                                ex.Message
                        },
                        statusCode:
                            StatusCodes.Status401Unauthorized
                    );
                }
            }
        );

        // ========================================================
        // CURRENT USER
        // ========================================================

        group.MapGet(
            "/me",
            async (
                ClaimsPrincipal user,
                ProfileService profileService) =>
            {
                // ------------------------------------------------
                // AUTHENTICATION CHECK
                // ------------------------------------------------

                if (
                    user.Identity?.IsAuthenticated != true
                )
                {
                    return Results.Unauthorized();
                }

                // ------------------------------------------------
                // USER ID FROM JWT
                // ------------------------------------------------

                var userId =
                    user.FindFirstValue("sub");

                if (
                    !Guid.TryParse(
                        userId,
                        out var parsedUserId
                    )
                )
                {
                    return Results.Unauthorized();
                }

                // ------------------------------------------------
                // EMAIL FROM JWT
                // ------------------------------------------------

                var email =
                    user.FindFirstValue(
                        ClaimTypes.Email
                    )
                    ??
                    user.FindFirstValue(
                        "email"
                    );

                // ------------------------------------------------
                // GET PROFILE
                // ------------------------------------------------

                var profile =
                    await profileService.GetProfileAsync(
                        parsedUserId
                    );

                // ------------------------------------------------
                // PROFILE NOT FOUND
                // ------------------------------------------------

                if (profile is null)
                {
                    return Results.Ok(new
                    {
                        id = parsedUserId,

                        email,

                        fullName =
                            (string?)null,

                        role =
                            (string?)null
                    });
                }

                // ------------------------------------------------
                // RETURN CURRENT USER
                // ------------------------------------------------

                return Results.Ok(new
                {
                    id = parsedUserId,

                    email,

                    fullName =
                        profile.FullName,

                    role =
                        profile.Role
                });
            }
        )
        .RequireAuthorization();

        // ========================================================
        // GET USER BY ID
        // ========================================================

        group.MapGet(
            "/users/{userId:guid}",
            async (
                Guid userId,
                ProfileService profileService) =>
            {
                Console.WriteLine(
                    "=========================================="
                );

                Console.WriteLine(
                    "GET USER BY ID"
                );

                Console.WriteLine(
                    $"Requested User ID: {userId}"
                );

                // ------------------------------------------------
                // GET PROFILE
                // ------------------------------------------------

                var profile =
                    await profileService.GetProfileAsync(
                        userId
                    );

                // ------------------------------------------------
                // PROFILE NOT FOUND
                // ------------------------------------------------

                if (profile is null)
                {
                    Console.WriteLine(
                        "USER PROFILE NOT FOUND"
                    );

                    Console.WriteLine(
                        "=========================================="
                    );

                    return Results.NotFound(new
                    {
                        message =
                            "User profile was not found."
                    });
                }

                // ------------------------------------------------
                // DEBUG OWNER INFORMATION
                // ------------------------------------------------

                Console.WriteLine(
                    $"User ID: {profile.Id}"
                );

                Console.WriteLine(
                    $"Email: {profile.Email}"
                );

                Console.WriteLine(
                    $"Full Name: {profile.FullName}"
                );

                Console.WriteLine(
                    $"Role: {profile.Role}"
                );

                Console.WriteLine(
                    "=========================================="
                );

                // ------------------------------------------------
                // RETURN USER
                // ------------------------------------------------

                return Results.Ok(
                    new AuthUserDto
                    {
                        Id =
                            profile.Id,

                        Email =
                            profile.Email,

                        FullName =
                            profile.FullName,

                        Role =
                            profile.Role
                    }
                );
            }
        )
        .RequireAuthorization();

        // ========================================================
        // REFRESH
        // ========================================================

        group.MapPost(
            "/refresh",
            async (
                HttpContext context,
                AuthService authService) =>
            {
                // ------------------------------------------------
                // GET REFRESH TOKEN
                // ------------------------------------------------

                if (
                    !context.Request.Cookies.TryGetValue(
                        AuthService.RefreshTokenCookieName,
                        out var refreshToken
                    )
                    ||
                    string.IsNullOrWhiteSpace(
                        refreshToken
                    )
                )
                {
                    return Results.Unauthorized();
                }

                try
                {
                    // ------------------------------------------------
                    // ASK SUPABASE FOR NEW TOKENS
                    // ------------------------------------------------

                    var result =
                        await authService.RefreshTokenAsync(
                            refreshToken
                        );

                    if (
                        string.IsNullOrWhiteSpace(
                            result.AccessToken
                        )
                        ||
                        string.IsNullOrWhiteSpace(
                            result.RefreshToken
                        )
                    )
                    {
                        ClearAuthenticationCookies(
                            context
                        );

                        return Results.Unauthorized();
                    }

                    // ------------------------------------------------
                    // REPLACE COOKIES
                    // ------------------------------------------------

                    SetAuthenticationCookies(
                        context,
                        result
                    );

                    return Results.Ok(new
                    {
                        expiresIn =
                            result.ExpiresIn
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        "=========================================="
                    );

                    Console.WriteLine(
                        "TOKEN REFRESH ERROR"
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

                    ClearAuthenticationCookies(
                        context
                    );

                    return Results.Unauthorized();
                }
            }
        );

        // ========================================================
        // LOGOUT
        // ========================================================

        group.MapPost(
            "/logout",
            async (
                HttpContext context,
                AuthService authService) =>
            {
                // ------------------------------------------------
                // GET ACCESS TOKEN
                // ------------------------------------------------

                if (
                    context.Request.Cookies.TryGetValue(
                        AuthService.AccessTokenCookieName,
                        out var accessToken
                    )
                    &&
                    !string.IsNullOrWhiteSpace(
                        accessToken
                    )
                )
                {
                    try
                    {
                        await authService.SignOutAsync(
                            accessToken
                        );
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine(
                            "SUPABASE LOGOUT ERROR:"
                        );

                        Console.WriteLine(
                            ex.ToString()
                        );

                        // Continue clearing local cookies.
                    }
                }

                // ------------------------------------------------
                // CLEAR LOCAL COOKIES
                // ------------------------------------------------

                ClearAuthenticationCookies(
                    context
                );

                return Results.NoContent();
            }
        );

        return app;
    }

    // ============================================================
    // METADATA HELPER
    // ============================================================

    private static string? GetMetadataValue(
        Dictionary<string, object>? metadata,
        string key)
    {
        if (
            metadata is null
            ||
            !metadata.TryGetValue(
                key,
                out var value
            )
            ||
            value is null
        )
        {
            return null;
        }

        return value.ToString();
    }

    // ============================================================
    // SET AUTHENTICATION COOKIES
    // ============================================================

    private static void SetAuthenticationCookies(
        HttpContext context,
        SupabaseAuthResponseDto response)
    {
        var environment =
            context.RequestServices
                .GetRequiredService<IHostEnvironment>();

        var isDevelopment =
            environment.IsDevelopment();

        // --------------------------------------------------------
        // ACCESS TOKEN
        // --------------------------------------------------------

        var accessCookie =
            new CookieOptions
            {
                HttpOnly = true,

                Secure =
                    !isDevelopment,

                SameSite =
                    SameSiteMode.Lax,

                Path = "/",

                MaxAge =
                    TimeSpan.FromSeconds(
                        response.ExpiresIn > 0
                            ? response.ExpiresIn
                            : 3600
                    )
            };

        if (
            !string.IsNullOrWhiteSpace(
                response.AccessToken
            )
        )
        {
            context.Response.Cookies.Append(
                AuthService.AccessTokenCookieName,
                response.AccessToken,
                accessCookie
            );
        }

        // --------------------------------------------------------
        // REFRESH TOKEN
        // --------------------------------------------------------

        var refreshCookie =
            new CookieOptions
            {
                HttpOnly = true,

                Secure =
                    !isDevelopment,

                SameSite =
                    SameSiteMode.Lax,

                Path = "/",

                MaxAge =
                    TimeSpan.FromDays(30)
            };

        if (
            !string.IsNullOrWhiteSpace(
                response.RefreshToken
            )
        )
        {
            context.Response.Cookies.Append(
                AuthService.RefreshTokenCookieName,
                response.RefreshToken,
                refreshCookie
            );
        }
    }

    // ============================================================
    // CLEAR AUTHENTICATION COOKIES
    // ============================================================

    private static void ClearAuthenticationCookies(
        HttpContext context)
    {
        var environment =
            context.RequestServices
                .GetRequiredService<IHostEnvironment>();

        var isDevelopment =
            environment.IsDevelopment();

        var options =
            new CookieOptions
            {
                HttpOnly = true,

                Secure =
                    !isDevelopment,

                SameSite =
                    SameSiteMode.Lax,

                Path = "/"
            };

        context.Response.Cookies.Delete(
            AuthService.AccessTokenCookieName,
            options
        );

        context.Response.Cookies.Delete(
            AuthService.RefreshTokenCookieName,
            options
        );
    }
}