using System.Net.Http.Headers;

namespace SjTuklas.Api.Services;

public interface ISupabaseStorageService
{
    Task<string> UploadBusinessImageAsync(
        Guid businessId,
        string imageType,
        IFormFile file,
        CancellationToken cancellationToken = default
    );
}

public class SupabaseStorageService : ISupabaseStorageService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    private const long MaxFileSize =
        5 * 1024 * 1024;

    private static readonly string[] AllowedContentTypes =
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    public SupabaseStorageService(
        HttpClient httpClient,
        IConfiguration configuration
    )
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<string> UploadBusinessImageAsync(
        Guid businessId,
        string imageType,
        IFormFile file,
        CancellationToken cancellationToken = default
    )
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException(
                "Please select an image."
            );
        }

        if (file.Length > MaxFileSize)
        {
            throw new ArgumentException(
                "Image file must not exceed 5 MB."
            );
        }

        if (!AllowedContentTypes.Contains(
                file.ContentType,
                StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException(
                "Only JPG, PNG, and WEBP images are allowed."
            );
        }

        imageType =
            imageType.Trim().ToLowerInvariant();

        var folder = imageType switch
        {
            "profile" => "profiles",
            "cover" => "covers",
            "gallery" => "gallery",

            _ => throw new ArgumentException(
                "Invalid image type. Use profile, cover, or gallery."
            )
        };

        var supabaseUrl =
            _configuration["Supabase:Url"]?
                .TrimEnd('/');

        var secretKey =
            _configuration["Supabase:SecretKey"];

        var bucket =
            _configuration["Supabase:Bucket"]
            ?? "business-images";

        if (string.IsNullOrWhiteSpace(supabaseUrl))
        {
            throw new InvalidOperationException(
                "Supabase URL is not configured."
            );
        }

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException(
                "Supabase SecretKey is not configured."
            );
        }

        // =====================================================
        // FILE NAME
        // =====================================================

        var extension =
            GetExtension(file.ContentType);

        var fileName =
            $"{Guid.NewGuid():N}{extension}";

        // Example:
        //
        // profiles/abc-guid/123.jpg
        // covers/abc-guid/456.webp
        // gallery/abc-guid/789.png
        //
        var filePath =
            $"{folder}/{businessId}/{fileName}";

        // =====================================================
        // SUPABASE STORAGE URL
        // =====================================================

        var uploadUrl =
            $"{supabaseUrl}/storage/v1/object/{bucket}/{filePath}";

        await using var stream =
            file.OpenReadStream();

        using var content =
            new StreamContent(stream);

        content.Headers.ContentType =
            new MediaTypeHeaderValue(
                file.ContentType
            );

        using var request =
            new HttpRequestMessage(
                HttpMethod.Post,
                uploadUrl
            );

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                secretKey
            );

        request.Headers.Add(
            "apikey",
            secretKey
        );

        request.Headers.Add(
            "x-upsert",
            "true"
        );

        request.Content = content;

        using var response =
            await _httpClient.SendAsync(
                request,
                cancellationToken
            );

        if (!response.IsSuccessStatusCode)
        {
            var error =
                await response.Content.ReadAsStringAsync(
                    cancellationToken
                );

            throw new InvalidOperationException(
                $"Supabase Storage upload failed: {error}"
            );
        }

        // =====================================================
        // PUBLIC URL
        // =====================================================

        var publicUrl =
            $"{supabaseUrl}/storage/v1/object/public/{bucket}/{filePath}";

        return publicUrl;
    }

    private static string GetExtension(
        string contentType
    )
    {
        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",

            _ => throw new ArgumentException(
                "Unsupported image type."
            )
        };
    }
}