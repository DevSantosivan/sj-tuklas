using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using SjTuklas.Api.Dtos.Auth;

namespace SjTuklas.Api.Services;

public class AuthService
{
    // =========================================================
    // COOKIE NAMES
    // =========================================================

    public const string AccessTokenCookieName =
        "sj_tuklas_access";

    public const string RefreshTokenCookieName =
        "sj_tuklas_refresh";

    // =========================================================
    // DEPENDENCIES
    // =========================================================

    private readonly HttpClient _httpClient;

    private readonly string _supabaseUrl;

    private readonly string _supabaseKey;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public AuthService(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;

        _supabaseUrl =
            configuration["Supabase:Url"]
            ?? throw new InvalidOperationException(
                "Supabase URL is not configured."
            );

        _supabaseKey =
            configuration["Supabase:PublishableKey"]
            ?? throw new InvalidOperationException(
                "Supabase publishable key is not configured."
            );
    }

    // =========================================================
    // SIGN UP
    // =========================================================

    public async Task<SupabaseAuthResponseDto>
        SignUpAsync(
            RegisterRequestDto request)
    {
        var email =
            request.Email
                .Trim()
                .ToLowerInvariant();

        var fullName =
            request.FullName.Trim();

        var phone =
            request.Phone?.Trim();

        var payload = new
        {
            email,

            password =
                request.Password,

            data = new
            {
                full_name =
                    fullName,

                phone,

                role =
                    request.Role
            }
        };

        using var httpRequest =
            new HttpRequestMessage(
                HttpMethod.Post,
                $"{_supabaseUrl}/auth/v1/signup"
            );

        AddSupabaseHeaders(
            httpRequest
        );

        httpRequest.Content =
            JsonContent.Create(payload);

        var response =
            await _httpClient.SendAsync(
                httpRequest
            );

        return await HandleResponseAsync(
            response
        );
    }

    // =========================================================
    // SIGN IN
    // =========================================================


      public async Task<SupabaseAuthResponseDto>
    SignInAsync(
        LoginRequestDto request)
{
    var email =
        request.Email
            .Trim()
            .ToLowerInvariant();

    var password =
        request.Password;

    Console.WriteLine("==========================================");
    Console.WriteLine("SUPABASE SIGN IN DEBUG");
    Console.WriteLine($"Email: [{email}]");
    Console.WriteLine($"Email Length: {email.Length}");
    Console.WriteLine(
        $"Password Supplied: {!string.IsNullOrEmpty(password)}"
    );
    Console.WriteLine(
        $"Password Length: {password?.Length ?? 0}"
    );
    Console.WriteLine("==========================================");

    var payload = new
    {
        email,
        password
    };

    using var httpRequest =
        new HttpRequestMessage(
            HttpMethod.Post,
            $"{_supabaseUrl}/auth/v1/token?grant_type=password"
        );

    AddSupabaseHeaders(httpRequest);

    httpRequest.Content =
        JsonContent.Create(payload);

    var response =
        await _httpClient.SendAsync(httpRequest);

    Console.WriteLine("==========================================");
    Console.WriteLine("SUPABASE RESPONSE");
    Console.WriteLine($"Status: {(int)response.StatusCode}");
    Console.WriteLine($"Success: {response.IsSuccessStatusCode}");
    Console.WriteLine("==========================================");

    return await HandleResponseAsync(response);
}
    // =========================================================
    // REFRESH TOKEN
    // =========================================================

    public async Task<SupabaseAuthResponseDto>
        RefreshTokenAsync(
            string refreshToken)
    {
        var payload = new
        {
            refresh_token =
                refreshToken
        };

        using var httpRequest =
            new HttpRequestMessage(
                HttpMethod.Post,
                $"{_supabaseUrl}/auth/v1/token?grant_type=refresh_token"
            );

        AddSupabaseHeaders(
            httpRequest
        );

        httpRequest.Content =
            JsonContent.Create(payload);

        var response =
            await _httpClient.SendAsync(
                httpRequest
            );

        return await HandleResponseAsync(
            response
        );
    }

    // =========================================================
    // SIGN OUT
    // =========================================================

    public async Task SignOutAsync(
        string accessToken)
    {
        using var httpRequest =
            new HttpRequestMessage(
                HttpMethod.Post,
                $"{_supabaseUrl}/auth/v1/logout"
            );

        AddSupabaseHeaders(
            httpRequest
        );

        httpRequest.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                accessToken
            );

        var response =
            await _httpClient.SendAsync(
                httpRequest
            );

        if (!response.IsSuccessStatusCode)
        {
            var body =
                await response.Content
                    .ReadAsStringAsync();

            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(body)
                    ? "Supabase logout failed."
                    : body
            );
        }
    }

    // =========================================================
    // SUPABASE HEADERS
    // =========================================================

    private void AddSupabaseHeaders(
        HttpRequestMessage request)
    {
        request.Headers.Add(
            "apikey",
            _supabaseKey
        );

        request.Headers.Accept.Add(
            new MediaTypeWithQualityHeaderValue(
                "application/json"
            )
        );
    }

    // =========================================================
    // HANDLE SUPABASE RESPONSE
    // =========================================================

    private static async Task<SupabaseAuthResponseDto>
        HandleResponseAsync(
            HttpResponseMessage response)
    {
        var body =
            await response.Content
                .ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(body)
                    ? $"Authentication failed with status {(int)response.StatusCode}."
                    : body
            );
        }

        var result =
            JsonSerializer.Deserialize<SupabaseAuthResponseDto>(
                body,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }
            );

        return result
            ?? throw new InvalidOperationException(
                "Invalid authentication response."
            );
    }
}