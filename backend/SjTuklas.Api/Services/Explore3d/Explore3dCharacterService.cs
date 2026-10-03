using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using SjTuklas.Api.DTOs.Explore3d;
using SjTuklas.Api.Models.Explore3d;

namespace SjTuklas.Api.Services.Explore3d;

public sealed class Explore3dCharacterService : IExplore3dCharacterService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<Explore3dCharacterService> _logger;

    private const string TableName = "explore3d_characters";

    private static readonly JsonSerializerOptions JsonOptions = new(
        JsonSerializerDefaults.Web
    );

    public Explore3dCharacterService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<Explore3dCharacterService> logger
    )
    {
        _httpClient = httpClient;
        _logger = logger;

        var supabaseUrl = configuration["Supabase:Url"];
        var serviceRoleKey = configuration["Supabase:ServiceRoleKey"];

        if (string.IsNullOrWhiteSpace(supabaseUrl))
        {
            throw new InvalidOperationException(
                "Supabase:Url is not configured."
            );
        }

        if (string.IsNullOrWhiteSpace(serviceRoleKey))
        {
            throw new InvalidOperationException(
                "Supabase:ServiceRoleKey is not configured."
            );
        }

       _httpClient.BaseAddress = new Uri(
       $"{supabaseUrl.TrimEnd('/')}/rest/v1/"
       );

     _httpClient.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", serviceRoleKey);

     _httpClient.DefaultRequestHeaders.Add(
    "apikey",
    serviceRoleKey
    );
    }

    public async Task<Explore3dCharacter?> GetByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        var url =
            $"{TableName}?user_id=eq.{userId}&select=*&limit=1";

        using var response = await _httpClient.GetAsync(
            url,
            cancellationToken
        );

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(
                cancellationToken
            );

            _logger.LogError(
                "Failed to get 3D character for user {UserId}. Status: {Status}. Error: {Error}",
                userId,
                response.StatusCode,
                error
            );

            response.EnsureSuccessStatusCode();
        }

        var characters =
            await response.Content.ReadFromJsonAsync<List<Explore3dCharacter>>(
                JsonOptions,
                cancellationToken
            );

        return characters?.FirstOrDefault();
    }

    public async Task<Explore3dCharacter> CreateAsync(
        Guid userId,
        string username,
        CancellationToken cancellationToken = default
    )
    {
        var now = DateTime.UtcNow;

        var character = new Explore3dCharacter
        {
            UserId = userId,
            Username = NormalizeUsername(username),
            CharacterModel = "explorer",
            CreatedAt = now,
            UpdatedAt = now
        };

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            TableName
        );

        request.Headers.Add("Prefer", "return=representation");
        request.Content = JsonContent.Create(character, options: JsonOptions);

        using var response = await _httpClient.SendAsync(
            request,
            cancellationToken
        );

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(
                cancellationToken
            );

            _logger.LogError(
                "Failed to create 3D character for user {UserId}. Status: {Status}. Error: {Error}",
                userId,
                response.StatusCode,
                error
            );

            response.EnsureSuccessStatusCode();
        }

        var created =
            await response.Content.ReadFromJsonAsync<List<Explore3dCharacter>>(
                JsonOptions,
                cancellationToken
            );

        return created?.FirstOrDefault() ?? character;
    }

    public async Task<Explore3dCharacter> GetOrCreateAsync(
        Guid userId,
        string username,
        CancellationToken cancellationToken = default
    )
    {
        var existing = await GetByUserIdAsync(
            userId,
            cancellationToken
        );

        if (existing is not null)
        {
            return existing;
        }

        try
        {
            return await CreateAsync(
                userId,
                username,
                cancellationToken
            );
        }
        catch (HttpRequestException)
        {
            // Another request may have created the record at the same time.
            var createdByAnotherRequest = await GetByUserIdAsync(
                userId,
                cancellationToken
            );

            if (createdByAnotherRequest is not null)
            {
                return createdByAnotherRequest;
            }

            throw;
        }
    }

    public async Task<Explore3dCharacter?> UpdateAsync(
        Guid userId,
        UpdateCharacterDto request,
        CancellationToken cancellationToken = default
    )
    {
        var username = NormalizeUsername(request.Username);

        var payload = new
        {
            username,
            updated_at = DateTime.UtcNow
        };

        var url = $"{TableName}?user_id=eq.{userId}";

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Patch,
            url
        );

        httpRequest.Headers.Add("Prefer", "return=representation");
        httpRequest.Content = JsonContent.Create(payload);

        using var response = await _httpClient.SendAsync(
            httpRequest,
            cancellationToken
        );

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(
                cancellationToken
            );

            _logger.LogError(
                "Failed to update 3D character for user {UserId}. Status: {Status}. Error: {Error}",
                userId,
                response.StatusCode,
                error
            );

            response.EnsureSuccessStatusCode();
        }

        var updated =
            await response.Content.ReadFromJsonAsync<List<Explore3dCharacter>>(
                JsonOptions,
                cancellationToken
            );

        return updated?.FirstOrDefault();
    }

    private static string NormalizeUsername(string? username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return "Explorer";
        }

        return username.Trim();
    }
}