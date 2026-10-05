
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
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
                if (
                    string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password) ||
                    string.IsNullOrWhiteSpace(request.FullName)
                )
                {
                    return Results.BadRequest(new
                    {
                        message = "Email, password, and full name are required."
                    });
                }

                if (
                    request.Role != "visitor" &&
                    request.Role != "business_owner"
                )
                {
                    return Results.BadRequest(new
                    {
                        message = "Invalid account role."
                    });
                }

                try
                {
                    var result = await authService.SignUpAsync(request);

                    if (result.User is null)
                    {
                        return Results.BadRequest(new
                        {
                            message = "Registration failed."
                        });
                    }

                    if (
                        !string.IsNullOrWhiteSpace(result.AccessToken) &&
                        !string.IsNullOrWhiteSpace(result.RefreshToken)
                    )
                    {
                        SetAuthenticationCookies(context, result);
                    }

                    await hubContext.Clients.All.SendAsync(
                        "UserRegistered",
                        new
                        {
                            userId = result.User.Id
                        }
                    );

                    return Results.Ok(
                        new AuthResponseDto
                        {
                            User = new AuthUserDto
                            {
                                Id = result.User.Id,
                                Email = result.User.Email,
                                FullName = GetMetadataValue(
                                    result.User.UserMetadata,
                                    "full_name"
                                ),
                                Role = GetMetadataValue(
                                    result.User.UserMetadata,
                                    "role"
                                )
                            },
                            ExpiresIn = result.ExpiresIn
                        }
                    );
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new
                    {
                        message = ex.Message
                    });
                }
                catch (Exception)
                {
                   return Results.Problem(
    detail: "Registration failed.",
    statusCode: StatusCodes.Status500InternalServerError
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
                if (
                    string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password)
                )
                {
                    return Results.BadRequest(new
                    {
                        message = "Email and password are required."
                    });
                }

                try
                {
                    var result = await authService.SignInAsync(request);

                    if (
                        string.IsNullOrWhiteSpace(result.AccessToken) ||
                        string.IsNullOrWhiteSpace(result.RefreshToken) ||
                        result.User is null
                    )
                    {
                        return Results.Json(
                            new
                            {
                                message = "Supabase login did not return a complete authentication response."
                            },
                            statusCode: StatusCodes.Status401Unauthorized
                        );
                    }

                    // Set HttpOnly authentication cookies.
                    SetAuthenticationCookies(context, result);

                    // Load user profile.
                    var profile = await profileService.GetProfileAsync(
                        result.User.Id
                    );

                    return Results.Ok(
                        new AuthResponseDto
                        {
                            User = new AuthUserDto
                            {
                                Id = result.User.Id,
                                Email = result.User.Email,
                                FullName = profile?.FullName,
                                Role = profile?.Role
                            },
                            ExpiresIn = result.ExpiresIn
                        }
                    );
                }
                catch (Exception)
                {
                    return Results.Json(
                        new
                        {
                            message = "Login failed. Please check your email and password."
                        },
                        statusCode: StatusCodes.Status401Unauthorized
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
                if (user.Identity?.IsAuthenticated != true)
                {
                    return Results.Unauthorized();
                }

                var userId = user.FindFirstValue("sub");

                if (!Guid.TryParse(userId, out var parsedUserId))
                {
                    return Results.Unauthorized();
                }

                var email =
                    user.FindFirstValue(ClaimTypes.Email) ??
                    user.FindFirstValue("email");

                var profile = await profileService.GetProfileAsync(
                    parsedUserId
                );

                if (profile is null)
                {
                    return Results.Ok(new
                    {
                        id = parsedUserId,
                        email,
                        fullName = (string?)null,
                        role = (string?)null
                    });
                }

                return Results.Ok(new
                {
                    id = parsedUserId,
                    email,
                    fullName = profile.FullName,
                    role = profile.Role
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
                var profile = await profileService.GetProfileAsync(userId);

                if (profile is null)
                {
                    return Results.NotFound(new
                    {
                        message = "User profile was not found."
                    });
                }

                return Results.Ok(
                    new AuthUserDto
                    {
                        Id = profile.Id,
                        Email = profile.Email,
                        FullName = profile.FullName,
                        Role = profile.Role
                    }
                );
            }
        )
        .RequireAuthorization();


        // ========================================================
        // REFRESH TOKEN
        // ========================================================

        group.MapPost(
            "/refresh",
            async (
                HttpContext context,
                AuthService authService) =>
            {
                if (
                    !context.Request.Cookies.TryGetValue(
                        AuthService.RefreshTokenCookieName,
                        out var refreshToken
                    ) ||
                    string.IsNullOrWhiteSpace(refreshToken)
                )
                {
                    ClearAuthenticationCookies(context);

                    return Results.Unauthorized();
                }

                try
                {
                    var result = await authService.RefreshTokenAsync(
                        refreshToken
                    );

                    if (
                        string.IsNullOrWhiteSpace(result.AccessToken) ||
                        string.IsNullOrWhiteSpace(result.RefreshToken)
                    )
                    {
                        ClearAuthenticationCookies(context);

                        return Results.Unauthorized();
                    }

                    SetAuthenticationCookies(context, result);

                    return Results.Ok(new
                    {
                        expiresIn = result.ExpiresIn
                    });
                }
                catch (Exception)
                {
                    ClearAuthenticationCookies(context);

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
                if (
                    context.Request.Cookies.TryGetValue(
                        AuthService.AccessTokenCookieName,
                        out var accessToken
                    ) &&
                    !string.IsNullOrWhiteSpace(accessToken)
                )
                {
                    try
                    {
                        await authService.SignOutAsync(accessToken);
                    }
                    catch (Exception)
                    {
                        // Clear local cookies even if Supabase logout fails.
                    }
                }

                ClearAuthenticationCookies(context);

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
            metadata is null ||
            !metadata.TryGetValue(key, out var value) ||
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
        var environment = context.RequestServices
            .GetRequiredService<IHostEnvironment>();

        var isDevelopment = environment.IsDevelopment();

        // Localhost:
        // SameSite=Lax, Secure=false
        //
        // Production:
        // SameSite=None, Secure=true
        var sameSite = isDevelopment
            ? SameSiteMode.Lax
            : SameSiteMode.None;

        var secure = !isDevelopment;

        var accessMaxAge = TimeSpan.FromSeconds(
            response.ExpiresIn > 0
                ? response.ExpiresIn
                : 3600
        );

        var accessCookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = sameSite,
            Path = "/",
            MaxAge = accessMaxAge,
            IsEssential = true
        };

        var refreshCookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = sameSite,
            Path = "/",
            MaxAge = TimeSpan.FromDays(30),
            IsEssential = true
        };

        if (!string.IsNullOrWhiteSpace(response.AccessToken))
        {
            context.Response.Cookies.Append(
                AuthService.AccessTokenCookieName,
                response.AccessToken,
                accessCookieOptions
            );
        }

        if (!string.IsNullOrWhiteSpace(response.RefreshToken))
        {
            context.Response.Cookies.Append(
                AuthService.RefreshTokenCookieName,
                response.RefreshToken,
                refreshCookieOptions
            );
        }
    }


    // ============================================================
    // CLEAR AUTHENTICATION COOKIES
    // ============================================================

    private static void ClearAuthenticationCookies(
        HttpContext context)
    {
        var environment = context.RequestServices
            .GetRequiredService<IHostEnvironment>();

        var isDevelopment = environment.IsDevelopment();

        var options = new CookieOptions
        {
            HttpOnly = true,
            Secure = !isDevelopment,
            SameSite = isDevelopment
                ? SameSiteMode.Lax
                : SameSiteMode.None,
            Path = "/",
            MaxAge = TimeSpan.Zero,
            Expires = DateTimeOffset.UnixEpoch,
            IsEssential = true
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