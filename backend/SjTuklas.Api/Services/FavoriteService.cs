using Npgsql;

using SjTuklas.Api.Dtos.Favorites;
using SjTuklas.Api.Models;

namespace SjTuklas.Api.Services;

public class FavoriteService
{
    private readonly string _connectionString;

    public FavoriteService(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("Supabase")
            ?? throw new InvalidOperationException(
                "Supabase connection string is not configured."
            );
    }

    // =========================================================
    // CHECK IF FAVORITE
    // =========================================================

    public async Task<bool> IsFavoriteAsync(
        Guid userId,
        Guid businessId)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM public.favorites
                WHERE user_id = @user_id
                  AND business_id = @business_id
            );
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "user_id",
            userId
        );

        command.Parameters.AddWithValue(
            "business_id",
            businessId
        );

        var result =
            await command.ExecuteScalarAsync();

        return result is bool isFavorite && isFavorite;
    }

    // =========================================================
    // ADD FAVORITE
    // =========================================================

  public async Task<Favorite> AddFavoriteAsync(
    Guid userId,
    Guid businessId)
{
    const string sql = """
        INSERT INTO public.favorites (
            id,
            user_id,
            business_id,
            created_at
        )
        VALUES (
            @id,
            @user_id,
            @business_id,
            @created_at
        )
        RETURNING
            id,
            user_id,
            business_id,
            created_at;
        """;

    var id = Guid.NewGuid();
    var createdAt = DateTime.UtcNow;

    await using var connection =
        new NpgsqlConnection(_connectionString);

    await connection.OpenAsync();

    await using var command =
        new NpgsqlCommand(sql, connection);

    command.Parameters.AddWithValue("id", id);
    command.Parameters.AddWithValue("user_id", userId);
    command.Parameters.AddWithValue("business_id", businessId);
    command.Parameters.AddWithValue("created_at", createdAt);

    try
    {
        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            throw new InvalidOperationException(
                "Favorite INSERT returned no record."
            );
        }

        return MapFavorite(reader);
    }
    catch (PostgresException ex)
    {
        Console.WriteLine("======================================");
        Console.WriteLine("FAVORITE DATABASE ERROR");
        Console.WriteLine($"Code: {ex.SqlState}");
        Console.WriteLine($"Message: {ex.MessageText}");
        Console.WriteLine($"Detail: {ex.Detail}");
        Console.WriteLine($"Hint: {ex.Hint}");
        Console.WriteLine("======================================");

        throw;
    }
}
    // =========================================================
    // REMOVE FAVORITE
    // =========================================================

    public async Task<bool> RemoveFavoriteAsync(
        Guid userId,
        Guid businessId)
    {
        const string sql = """
            DELETE FROM public.favorites
            WHERE user_id = @user_id
              AND business_id = @business_id;
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "user_id",
            userId
        );

        command.Parameters.AddWithValue(
            "business_id",
            businessId
        );

        var affectedRows =
            await command.ExecuteNonQueryAsync();

        return affectedRows > 0;
    }

    // =========================================================
    // GET MY FAVORITES
    // WITH BUSINESS DETAILS
    // =========================================================

    public async Task<List<FavoriteBusinessResponseDto>>
        GetUserFavoritesAsync(Guid userId)
    {
        const string sql = """
            SELECT
                f.id AS favorite_id,
                f.created_at AS favorited_at,

                b.id,
                b.owner_id,
                b.name,
                b.category,
                b.business_type,
                b.description,
                b.phone,
                b.hours,
                b.image,
                b.barangay,
                b.location,
                b.latitude,
                b.longitude,
                b.status,
                b.verified,
                b.is_pro,
                b.rating,
                b.reviews,
                b.created_at,
                b.updated_at

            FROM public.favorites f

            INNER JOIN public.businesses b
                ON b.id = f.business_id

            WHERE f.user_id = @user_id

            ORDER BY f.created_at DESC;
            """;

        var favorites =
            new List<FavoriteBusinessResponseDto>();

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "user_id",
            userId
        );

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            favorites.Add(
                MapFavoriteBusiness(reader)
            );
        }

        return favorites;
    }

    // =========================================================
    // MAP FAVORITE
    // =========================================================

    private static Favorite MapFavorite(
        NpgsqlDataReader reader)
    {
        return new Favorite
        {
            Id = reader.GetGuid(
                reader.GetOrdinal("id")
            ),

            UserId = reader.GetGuid(
                reader.GetOrdinal("user_id")
            ),

            BusinessId = reader.GetGuid(
                reader.GetOrdinal("business_id")
            ),

            CreatedAt = reader.GetDateTime(
                reader.GetOrdinal("created_at")
            )
        };
    }

    // =========================================================
    // MAP FAVORITE BUSINESS
    // =========================================================

    private static FavoriteBusinessResponseDto
        MapFavoriteBusiness(
            NpgsqlDataReader reader)
    {
        return new FavoriteBusinessResponseDto
        {
            Id = reader.GetGuid(
                reader.GetOrdinal("id")
            ),

            OwnerId = reader.GetGuid(
                reader.GetOrdinal("owner_id")
            ),

            Name = reader.GetString(
                reader.GetOrdinal("name")
            ),

            Category = reader.GetString(
                reader.GetOrdinal("category")
            ),

            BusinessType = reader.GetString(
                reader.GetOrdinal("business_type")
            ),

            Description = reader.GetString(
                reader.GetOrdinal("description")
            ),

            Phone = reader.GetString(
                reader.GetOrdinal("phone")
            ),

            Hours = reader.GetString(
                reader.GetOrdinal("hours")
            ),

            Image = reader.GetString(
                reader.GetOrdinal("image")
            ),

            Barangay = reader.GetString(
                reader.GetOrdinal("barangay")
            ),

            Location = reader.GetString(
                reader.GetOrdinal("location")
            ),

            Latitude = reader.GetDouble(
                reader.GetOrdinal("latitude")
            ),

            Longitude = reader.GetDouble(
                reader.GetOrdinal("longitude")
            ),

            Status = reader.GetString(
                reader.GetOrdinal("status")
            ),

            Verified = reader.GetBoolean(
                reader.GetOrdinal("verified")
            ),

            IsPro = reader.GetBoolean(
                reader.GetOrdinal("is_pro")
            ),

            Rating = reader.GetDouble(
                reader.GetOrdinal("rating")
            ),

            Reviews = reader.GetInt32(
                reader.GetOrdinal("reviews")
            ),

            CreatedAt = reader.GetDateTime(
                reader.GetOrdinal("created_at")
            ),

            UpdatedAt = reader.GetDateTime(
                reader.GetOrdinal("updated_at")
            ),

            FavoritedAt = reader.GetDateTime(
                reader.GetOrdinal("favorited_at")
            )
        };
    }
}