using System.Text.Json;

using Npgsql;

using SjTuklas.Api.Dtos.Businesses;
using SjTuklas.Api.Models;

namespace SjTuklas.Api.Services;

public class BusinessService
{
    private readonly string _connectionString;

    public BusinessService(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("Supabase")
            ?? throw new InvalidOperationException(
                "Supabase connection string is not configured."
            );
    }

    // =========================================================
    // GET ALL
    // ADMIN
    //
    // Returns ALL businesses:
    // pending
    // approved
    // rejected
    // =========================================================

    public async Task<List<BusinessResponseDto>> GetBusinessesAsync()
    {
        const string sql = """
            SELECT
                id,
                owner_id,
                name,
                category,
                business_type,
                description,
                phone,
                hours,
                image,
                cover_image,
                profile_image,
                barangay,
                location,
                latitude,
                longitude,
                status,
                verified,
                is_pro,
                rating,
                reviews,
                features,
                created_at,
                updated_at
            FROM public.businesses
            ORDER BY created_at DESC;
            """;

        var businesses =
            new List<BusinessResponseDto>();

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(
                sql,
                connection
            );

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            businesses.Add(
                MapBusiness(reader)
            );
        }

        return businesses;
    }

    // =========================================================
    // GET APPROVED BUSINESSES
    // PUBLIC
    // =========================================================

    public async Task<List<BusinessResponseDto>>
        GetApprovedBusinessesAsync()
    {
        const string sql = """
            SELECT
                id,
                owner_id,
                name,
                category,
                business_type,
                description,
                phone,
                hours,
                image,
                cover_image,
                profile_image,
                barangay,
                location,
                latitude,
                longitude,
                status,
                verified,
                is_pro,
                rating,
                reviews,
                features,
                created_at,
                updated_at
            FROM public.businesses
            WHERE LOWER(TRIM(status)) = 'approved'
            ORDER BY created_at DESC;
            """;

        var businesses =
            new List<BusinessResponseDto>();

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(
                sql,
                connection
            );

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            businesses.Add(
                MapBusiness(reader)
            );
        }

        return businesses;
    }

    // =========================================================
    // GET BY ID
    // ADMIN
    //
    // Returns business regardless of status.
    // =========================================================

    public async Task<BusinessResponseDto?>
        GetBusinessByIdAsync(
            Guid businessId)
    {
        const string sql = """
            SELECT
                id,
                owner_id,
                name,
                category,
                business_type,
                description,
                phone,
                hours,
                image,
                cover_image,
                profile_image,
                barangay,
                location,
                latitude,
                longitude,
                status,
                verified,
                is_pro,
                rating,
                reviews,
                features,
                created_at,
                updated_at
            FROM public.businesses
            WHERE id = @id
            LIMIT 1;
            """;

        await using var connection =
            new NpgsqlConnection(
                _connectionString
            );

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(
                sql,
                connection
            );

        command.Parameters.AddWithValue(
            "id",
            businessId
        );

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return MapBusiness(reader);
    }

    // =========================================================
    // GET APPROVED BUSINESS BY ID
    // PUBLIC
    // =========================================================

    public async Task<BusinessResponseDto?>
        GetApprovedBusinessByIdAsync(
            Guid businessId)
    {
        const string sql = """
            SELECT
                id,
                owner_id,
                name,
                category,
                business_type,
                description,
                phone,
                hours,
                image,
                cover_image,
                profile_image,
                barangay,
                location,
                latitude,
                longitude,
                status,
                verified,
                is_pro,
                rating,
                reviews,
                features,
                created_at,
                updated_at
            FROM public.businesses
            WHERE
                id = @id
                AND LOWER(TRIM(status)) = 'approved'
            LIMIT 1;
            """;

        await using var connection =
            new NpgsqlConnection(
                _connectionString
            );

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(
                sql,
                connection
            );

        command.Parameters.AddWithValue(
            "id",
            businessId
        );

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return MapBusiness(reader);
    }

    // =========================================================
    // GET MY BUSINESS
    // PROTECTED
    //
    // Returns business owned by current user regardless
    // of status.
    // =========================================================

    public async Task<BusinessResponseDto?>
        GetBusinessByOwnerIdAsync(
            Guid ownerId)
    {
        const string sql = """
            SELECT
                id,
                owner_id,
                name,
                category,
                business_type,
                description,
                phone,
                hours,
                image,
                cover_image,
                profile_image,
                barangay,
                location,
                latitude,
                longitude,
                status,
                verified,
                is_pro,
                rating,
                reviews,
                features,
                created_at,
                updated_at
            FROM public.businesses
            WHERE owner_id = @owner_id
            ORDER BY created_at DESC
            LIMIT 1;
            """;

        await using var connection =
            new NpgsqlConnection(
                _connectionString
            );

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(
                sql,
                connection
            );

        command.Parameters.AddWithValue(
            "owner_id",
            ownerId
        );

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return MapBusiness(reader);
    }

    // =========================================================
    // CREATE
    // PROTECTED
    //
    // New businesses always start as:
    // pending
    //
    // image        = gallery / feature image
    // cover_image  = business profile cover
    // profile_image = business profile logo
    // =========================================================

    public async Task<BusinessResponseDto>
        CreateBusinessAsync(
            CreateBusinessDto dto,
            Guid ownerId)
    {
        const string sql = """
            INSERT INTO public.businesses (
                id,
                owner_id,
                name,
                category,
                business_type,
                description,
                phone,
                hours,
                image,
                cover_image,
                profile_image,
                barangay,
                location,
                latitude,
                longitude,
                status,
                verified,
                is_pro,
                rating,
                reviews,
                features,
                created_at,
                updated_at
            )
            VALUES (
                @id,
                @owner_id,
                @name,
                @category,
                @business_type,
                @description,
                @phone,
                @hours,
                @image,
                @cover_image,
                @profile_image,
                @barangay,
                @location,
                @latitude,
                @longitude,
                'pending',
                false,
                false,
                0,
                0,
                @features::jsonb,
                @created_at,
                @updated_at
            )
            RETURNING
                id,
                owner_id,
                name,
                category,
                business_type,
                description,
                phone,
                hours,
                image,
                cover_image,
                profile_image,
                barangay,
                location,
                latitude,
                longitude,
                status,
                verified,
                is_pro,
                rating,
                reviews,
                features,
                created_at,
                updated_at;
            """;

        var id =
            Guid.NewGuid();

        var now =
            DateTime.UtcNow;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(
                sql,
                connection
            );

        command.Parameters.AddWithValue(
            "id",
            id
        );

        command.Parameters.AddWithValue(
            "owner_id",
            ownerId
        );

        command.Parameters.AddWithValue(
            "name",
            dto.Name.Trim()
        );

        command.Parameters.AddWithValue(
            "category",
            dto.Category
        );

        command.Parameters.AddWithValue(
            "business_type",
            dto.BusinessType
        );

        command.Parameters.AddWithValue(
            "description",
            dto.Description.Trim()
        );

        command.Parameters.AddWithValue(
            "phone",
            dto.Phone.Trim()
        );

        command.Parameters.AddWithValue(
            "hours",
            dto.Hours.Trim()
        );

        // Existing image = gallery / feature image
        command.Parameters.AddWithValue(
            "image",
            dto.Image ?? string.Empty
        );

        // Business Profile cover
        command.Parameters.AddWithValue(
            "cover_image",
            dto.CoverImage ?? string.Empty
        );

        // Business Profile logo/profile image
        command.Parameters.AddWithValue(
            "profile_image",
            dto.ProfileImage ?? string.Empty
        );

        command.Parameters.AddWithValue(
            "barangay",
            dto.Barangay
        );

        command.Parameters.AddWithValue(
            "location",
            dto.Location
        );

        command.Parameters.AddWithValue(
            "latitude",
            dto.Latitude
        );

        command.Parameters.AddWithValue(
            "longitude",
            dto.Longitude
        );

        command.Parameters.AddWithValue(
            "features",
            JsonSerializer.Serialize(
                dto.Features
            )
        );

        command.Parameters.AddWithValue(
            "created_at",
            now
        );

        command.Parameters.AddWithValue(
            "updated_at",
            now
        );

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            throw new InvalidOperationException(
                "Business was not created."
            );
        }

        return MapBusiness(reader);
    }

    // =========================================================
    // UPDATE
    // PROTECTED
    // OWNER ONLY
    //
    // image         = gallery / feature image
    // cover_image   = business profile cover
    // profile_image = business profile logo
    // =========================================================

    public async Task<BusinessResponseDto?>
        UpdateBusinessAsync(
            Guid businessId,
            UpdateBusinessDto dto,
            Guid ownerId)
    {
        const string sql = """
            UPDATE public.businesses
            SET
                name = @name,
                category = @category,
                business_type = @business_type,
                description = @description,
                phone = @phone,
                hours = @hours,
                image = @image,
                cover_image = @cover_image,
                profile_image = @profile_image,
                barangay = @barangay,
                location = @location,
                latitude = @latitude,
                longitude = @longitude,
                features = @features::jsonb,
                updated_at = @updated_at
            WHERE
                id = @id
                AND owner_id = @owner_id
            RETURNING
                id,
                owner_id,
                name,
                category,
                business_type,
                description,
                phone,
                hours,
                image,
                cover_image,
                profile_image,
                barangay,
                location,
                latitude,
                longitude,
                status,
                verified,
                is_pro,
                rating,
                reviews,
                features,
                created_at,
                updated_at;
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(
                sql,
                connection
            );

        command.Parameters.AddWithValue(
            "id",
            businessId
        );

        command.Parameters.AddWithValue(
            "owner_id",
            ownerId
        );

        command.Parameters.AddWithValue(
            "name",
            dto.Name.Trim()
        );

        command.Parameters.AddWithValue(
            "category",
            dto.Category
        );

        command.Parameters.AddWithValue(
            "business_type",
            dto.BusinessType
        );

        command.Parameters.AddWithValue(
            "description",
            dto.Description.Trim()
        );

        command.Parameters.AddWithValue(
            "phone",
            dto.Phone.Trim()
        );

        command.Parameters.AddWithValue(
            "hours",
            dto.Hours.Trim()
        );

        // Existing image = gallery / feature image
        command.Parameters.AddWithValue(
            "image",
            dto.Image ?? string.Empty
        );

        // Business Profile cover
        command.Parameters.AddWithValue(
            "cover_image",
            dto.CoverImage ?? string.Empty
        );

        // Business Profile logo/profile image
        command.Parameters.AddWithValue(
            "profile_image",
            dto.ProfileImage ?? string.Empty
        );

        command.Parameters.AddWithValue(
            "barangay",
            dto.Barangay
        );

        command.Parameters.AddWithValue(
            "location",
            dto.Location
        );

        command.Parameters.AddWithValue(
            "latitude",
            dto.Latitude
        );

        command.Parameters.AddWithValue(
            "longitude",
            dto.Longitude
        );

        command.Parameters.AddWithValue(
            "features",
            JsonSerializer.Serialize(
                dto.Features
            )
        );

        command.Parameters.AddWithValue(
            "updated_at",
            DateTime.UtcNow
        );

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return MapBusiness(reader);
    }

    // =========================================================
    // DELETE
    // PROTECTED
    // OWNER ONLY
    // =========================================================

    public async Task<bool>
        DeleteBusinessAsync(
            Guid businessId,
            Guid ownerId)
    {
        const string sql = """
            DELETE FROM public.businesses
            WHERE
                id = @id
                AND owner_id = @owner_id;
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(
                sql,
                connection
            );

        command.Parameters.AddWithValue(
            "id",
            businessId
        );

        command.Parameters.AddWithValue(
            "owner_id",
            ownerId
        );

        var affectedRows =
            await command.ExecuteNonQueryAsync();

        return affectedRows > 0;
    }

    // =========================================================
    // UPDATE STATUS
    // ADMIN ONLY
    // =========================================================

    public async Task<BusinessResponseDto?>
        UpdateBusinessStatusAsync(
            Guid businessId,
            string status)
    {
        const string sql = """
            UPDATE public.businesses
            SET
                status = @status,
                updated_at = @updated_at
            WHERE
                id = @id
            RETURNING
                id,
                owner_id,
                name,
                category,
                business_type,
                description,
                phone,
                hours,
                image,
                cover_image,
                profile_image,
                barangay,
                location,
                latitude,
                longitude,
                status,
                verified,
                is_pro,
                rating,
                reviews,
                features,
                created_at,
                updated_at;
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(
                sql,
                connection
            );

        command.Parameters.AddWithValue(
            "id",
            businessId
        );

        command.Parameters.AddWithValue(
            "status",
            status
        );

        command.Parameters.AddWithValue(
            "updated_at",
            DateTime.UtcNow
        );

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return MapBusiness(reader);
    }

    // =========================================================
    // MAPPER
    // =========================================================

    private static BusinessResponseDto
        MapBusiness(
            NpgsqlDataReader reader)
    {
        return new BusinessResponseDto
        {
            Id =
                reader.GetGuid(
                    reader.GetOrdinal("id")
                ),

            OwnerId =
                reader.GetGuid(
                    reader.GetOrdinal("owner_id")
                ),

            Name =
                reader.GetString(
                    reader.GetOrdinal("name")
                ),

            Category =
                reader.GetString(
                    reader.GetOrdinal("category")
                ),

            BusinessType =
                reader.GetString(
                    reader.GetOrdinal("business_type")
                ),

            Description =
                reader.GetString(
                    reader.GetOrdinal("description")
                ),

            Phone =
                reader.GetString(
                    reader.GetOrdinal("phone")
                ),

            Hours =
                reader.GetString(
                    reader.GetOrdinal("hours")
                ),

            // Existing gallery / feature image
            Image =
                reader.GetString(
                    reader.GetOrdinal("image")
                ),

            // Business Profile cover
            CoverImage =
                reader.GetString(
                    reader.GetOrdinal("cover_image")
                ),

            // Business Profile logo
            ProfileImage =
                reader.GetString(
                    reader.GetOrdinal("profile_image")
                ),

            Barangay =
                reader.GetString(
                    reader.GetOrdinal("barangay")
                ),

            Location =
                reader.GetString(
                    reader.GetOrdinal("location")
                ),

            Latitude =
                reader.GetDouble(
                    reader.GetOrdinal("latitude")
                ),

            Longitude =
                reader.GetDouble(
                    reader.GetOrdinal("longitude")
                ),

            Status =
                reader.GetString(
                    reader.GetOrdinal("status")
                ),

            Verified =
                reader.GetBoolean(
                    reader.GetOrdinal("verified")
                ),

            IsPro =
                reader.GetBoolean(
                    reader.GetOrdinal("is_pro")
                ),

            Rating =
                reader.GetDouble(
                    reader.GetOrdinal("rating")
                ),

            Reviews =
                reader.GetInt32(
                    reader.GetOrdinal("reviews")
                ),

            Features =
                DeserializeFeatures(reader),

            CreatedAt =
                reader.GetDateTime(
                    reader.GetOrdinal("created_at")
                ),

            UpdatedAt =
                reader.GetDateTime(
                    reader.GetOrdinal("updated_at")
                )
        };
    }

    // =========================================================
    // FEATURES
    // =========================================================

    private static BusinessFeatures
        DeserializeFeatures(
            NpgsqlDataReader reader)
    {
        var ordinal =
            reader.GetOrdinal("features");

        if (reader.IsDBNull(ordinal))
        {
            return new BusinessFeatures();
        }

        var json =
            reader.GetFieldValue<string>(
                ordinal
            );

        if (string.IsNullOrWhiteSpace(json))
        {
            return new BusinessFeatures();
        }

        return JsonSerializer.Deserialize<BusinessFeatures>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }
        ) ?? new BusinessFeatures();
    }


    // =========================================================
// UPDATE BUSINESS IMAGE
// =========================================================

public async Task<bool> UpdateBusinessImageAsync(
    Guid businessId,
    Guid ownerId,
    string imageType,
    string imageUrl
)
{
    var column = imageType switch
    {
        "profile" => "profile_image",
        "cover" => "cover_image",
        "gallery" => "image",

        _ => throw new ArgumentException(
            "Invalid image type."
        )
    };

    var sql = $"""
        UPDATE public.businesses
        SET
            {column} = @image_url,
            updated_at = @updated_at
        WHERE
            id = @id
            AND owner_id = @owner_id;
        """;

    await using var connection =
        new NpgsqlConnection(_connectionString);

    await connection.OpenAsync();

    await using var command =
        new NpgsqlCommand(
            sql,
            connection
        );

    command.Parameters.AddWithValue(
        "image_url",
        imageUrl
    );

    command.Parameters.AddWithValue(
        "updated_at",
        DateTime.UtcNow
    );

    command.Parameters.AddWithValue(
        "id",
        businessId
    );

    command.Parameters.AddWithValue(
        "owner_id",
        ownerId
    );

    var affectedRows =
        await command.ExecuteNonQueryAsync();

    return affectedRows > 0;
}
}