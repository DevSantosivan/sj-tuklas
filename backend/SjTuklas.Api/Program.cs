using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.Tokens;

using SjTuklas.Api.Endpoints;
using SjTuklas.Api.Hubs;
using SjTuklas.Api.Services;

var builder = WebApplication.CreateBuilder(args);


// ============================================================
// SERVICES
// ============================================================

builder.Services.AddOpenApi();


// ============================================================
// BUSINESS SERVICES
// ============================================================

builder.Services.AddScoped<BusinessService>();

builder.Services.AddScoped<ProfileService>();

builder.Services.AddScoped<FavoriteService>();


// ============================================================
// AUTH SERVICE
// ============================================================

builder.Services.AddHttpClient<AuthService>();


// ============================================================
// SUPABASE STORAGE
// ============================================================

builder.Services.AddHttpClient<
    ISupabaseStorageService,
    SupabaseStorageService
>();


// ============================================================
// SIGNALR USER ID PROVIDER
// ============================================================

builder.Services.AddSingleton<
    IUserIdProvider,
    BusinessUserIdProvider
>();


// ============================================================
// SIGNALR
// ============================================================

builder.Services.AddSignalR();


// ============================================================
// SUPABASE JWT CONFIGURATION
// ============================================================

const string supabaseIssuer =
    "https://psvrjkhsfrzzapazttkh.supabase.co/auth/v1";

const string supabaseAudience =
    "authenticated";


builder.Services
    .AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme
    )
    .AddJwtBearer(options =>
    {
        // ====================================================
        // SUPABASE JWT AUTHORITY
        // ====================================================

        options.Authority =
            supabaseIssuer;

        options.Audience =
            supabaseAudience;

        options.RequireHttpsMetadata =
            true;


        // ====================================================
        // KEEP ORIGINAL JWT CLAIM NAMES
        // ====================================================

        options.MapInboundClaims =
            false;


        // ====================================================
        // TOKEN VALIDATION
        // ====================================================

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer =
                    true,

                ValidIssuer =
                    supabaseIssuer,

                ValidateAudience =
                    true,

                ValidAudience =
                    supabaseAudience,

                ValidateLifetime =
                    true,

                ValidateIssuerSigningKey =
                    true,

                ClockSkew =
                    TimeSpan.FromSeconds(30),

                NameClaimType =
                    "sub",
            };


        // ====================================================
        // JWT EVENTS
        // ====================================================

        options.Events =
            new JwtBearerEvents
            {
                // ==================================================
                // READ JWT FROM HTTPONLY COOKIE
                // ==================================================

                OnMessageReceived = context =>
                {
                    var hasCookie =
                        context.Request.Cookies.ContainsKey(
                            AuthService.AccessTokenCookieName
                        );

                    Console.WriteLine(
                        $"JWT COOKIE PRESENT: {hasCookie}"
                    );

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
                        context.Token =
                            accessToken;

                        Console.WriteLine(
                            "JWT TOKEN LOADED FROM HTTPONLY COOKIE."
                        );
                    }
                    else
                    {
                        Console.WriteLine(
                            "JWT TOKEN NOT FOUND IN COOKIE."
                        );
                    }

                    return Task.CompletedTask;
                },


                // ==================================================
                // TOKEN VALIDATED
                // ==================================================

                OnTokenValidated = context =>
                {
                    var userId =
                        context.Principal?
                            .FindFirst("sub")?
                            .Value;

                    var email =
                        context.Principal?
                            .FindFirst("email")?
                            .Value;

                    Console.WriteLine(
                        "=========================================="
                    );

                    Console.WriteLine(
                        "JWT AUTHENTICATION SUCCESS"
                    );

                    Console.WriteLine(
                        $"User ID: {userId}"
                    );

                    Console.WriteLine(
                        $"Email: {email}"
                    );

                    Console.WriteLine(
                        "=========================================="
                    );

                    return Task.CompletedTask;
                },


                // ==================================================
                // AUTHENTICATION FAILED
                // ==================================================

                OnAuthenticationFailed = context =>
                {
                    Console.WriteLine(
                        "=========================================="
                    );

                    Console.WriteLine(
                        "JWT AUTHENTICATION FAILED"
                    );

                    Console.WriteLine(
                        $"Exception Type: " +
                        $"{context.Exception.GetType().Name}"
                    );

                    Console.WriteLine(
                        $"Message: " +
                        $"{context.Exception.Message}"
                    );

                    Console.WriteLine(
                        context.Exception.ToString()
                    );

                    Console.WriteLine(
                        "=========================================="
                    );

                    return Task.CompletedTask;
                },


                // ==================================================
                // AUTHORIZATION CHALLENGE
                // ==================================================

                OnChallenge = context =>
                {
                    Console.WriteLine(
                        "=========================================="
                    );

                    Console.WriteLine(
                        "JWT CHALLENGE - 401 UNAUTHORIZED"
                    );

                    Console.WriteLine(
                        $"Error: {context.Error}"
                    );

                    Console.WriteLine(
                        $"Description: " +
                        $"{context.ErrorDescription}"
                    );

                    Console.WriteLine(
                        $"Authentication Failure: " +
                        $"{context.AuthenticateFailure}"
                    );

                    Console.WriteLine(
                        "=========================================="
                    );

                    return Task.CompletedTask;
                },
            };
    });


// ============================================================
// AUTHORIZATION
// ============================================================

builder.Services.AddAuthorization();


// ============================================================
// ANTIFORGERY
// ============================================================

builder.Services.AddAntiforgery();


// ============================================================
// CORS
// ============================================================

builder.Services.AddCors(
    options =>
    {
        options.AddPolicy(
            "Angular",
            policy =>
            {
                policy
                    .WithOrigins(
                        "http://localhost:4200"
                    )
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            }
        );
    }
);


// ============================================================
// BUILD APPLICATION
// ============================================================

var app =
    builder.Build();


// ============================================================
// OPENAPI
// ============================================================

if (
    app.Environment.IsDevelopment()
)
{
    app.MapOpenApi();
}


// ============================================================
// MIDDLEWARE
// ============================================================

app.UseCors("Angular");

app.UseAuthentication();

app.UseAuthorization();

app.UseAntiforgery();


// ============================================================
// AUTH ENDPOINTS
// ============================================================

app.MapAuthEndpoints();


// ============================================================
// BUSINESS ENDPOINTS
// ============================================================

app.MapBusinessEndpoints();


// ============================================================
// FAVORITE ENDPOINTS
// ============================================================

app.MapFavoriteEndpoints();


// ============================================================
// STATS ENDPOINTS
// ============================================================

app.MapStatsEndpoints();


// ============================================================
// SIGNALR
// ============================================================

app.MapHub<BusinessHub>(
    "/hubs/business"
);


// ============================================================
// RUN
// ============================================================

app.Run();