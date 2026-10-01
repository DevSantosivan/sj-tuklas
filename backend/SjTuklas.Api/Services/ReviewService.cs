using Npgsql;
using NpgsqlTypes;
using SjTuklas.Api.Dtos.Reviews;
using SjTuklas.Api.Models;

namespace SjTuklas.Api.Services;

public class ReviewService
{
    private readonly string _connectionString;

    public ReviewService(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("Supabase")
            ?? throw new InvalidOperationException(
                "Supabase connection string is not configured."
            );
    }

    // =========================================================
    // GET ALL REVIEWS FOR A BUSINESS
    // =========================================================

    public async Task<List<ReviewResponse>> GetReviewsAsync(
        Guid businessId)
    {
        const string sql = """
            SELECT
                id,
                business_id,
                user_id,
                user_name,
                user_avatar,
                rating,
                comment,
                created_at,
                updated_at
            FROM public.reviews
            WHERE business_id = @business_id
            ORDER BY created_at DESC;
            """;

        var reviews = new List<ReviewResponse>();

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.Add(
            "business_id",
            NpgsqlDbType.Uuid
        ).Value = businessId;

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            reviews.Add(MapReview(reader));
        }

        return reviews;
    }

    // =========================================================
    // GET AVERAGE RATING AND BREAKDOWN
    // =========================================================

    public async Task<ReviewSummaryResponse> GetSummaryAsync(
        Guid businessId)
    {
        const string sql = """
            SELECT rating
            FROM public.reviews
            WHERE business_id = @business_id;
            """;

        var ratings = new List<int>();

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.Add(
            "business_id",
            NpgsqlDbType.Uuid
        ).Value = businessId;

        await using var reader =
            await command.ExecuteReaderAsync();

        var ratingOrdinal = reader.GetOrdinal("rating");

        while (await reader.ReadAsync())
        {
            // PostgreSQL SMALLINT is read as Int16.
            ratings.Add(reader.GetInt16(ratingOrdinal));
        }

        var totalReviews = ratings.Count;

        return new ReviewSummaryResponse
        {
            TotalReviews = totalReviews,

            AverageRating = totalReviews == 0
                ? 0
                : Math.Round(ratings.Average(), 1),

            Breakdown = new Dictionary<int, int>
            {
                [1] = ratings.Count(x => x == 1),
                [2] = ratings.Count(x => x == 2),
                [3] = ratings.Count(x => x == 3),
                [4] = ratings.Count(x => x == 4),
                [5] = ratings.Count(x => x == 5)
            }
        };
    }

    // =========================================================
    // GET CURRENT USER'S REVIEW
    // =========================================================

    public async Task<ReviewResponse?> GetMyReviewAsync(
        Guid businessId,
        string userId)
    {
        var parsedUserId = ParseUserId(userId);

        const string sql = """
            SELECT
                id,
                business_id,
                user_id,
                user_name,
                user_avatar,
                rating,
                comment,
                created_at,
                updated_at
            FROM public.reviews
            WHERE business_id = @business_id
              AND user_id = @user_id
            LIMIT 1;
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.Add(
            "business_id",
            NpgsqlDbType.Uuid
        ).Value = businessId;

        command.Parameters.Add(
            "user_id",
            NpgsqlDbType.Uuid
        ).Value = parsedUserId;

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return MapReview(reader);
    }

    // =========================================================
    // CREATE REVIEW
    // =========================================================

    public async Task<ReviewResponse> CreateReviewAsync(
        Guid businessId,
        string userId,
        string userName,
        CreateReviewRequest request)
    {
        var parsedUserId = ParseUserId(userId);

        var comment = request.Comment?.Trim();

        if (string.IsNullOrWhiteSpace(comment))
        {
            throw new ArgumentException(
                "Review comment is required.",
                nameof(request)
            );
        }

        if (request.Rating < 1 || request.Rating > 5)
        {
            throw new ArgumentOutOfRangeException(
                nameof(request),
                "Rating must be from 1 to 5."
            );
        }

        // Check whether the user has already reviewed this business.
        var existing = await GetMyReviewAsync(
            businessId,
            userId
        );

        if (existing is not null)
        {
            throw new ReviewAlreadyExistsException();
        }

        const string sql = """
            INSERT INTO public.reviews (
                id,
                business_id,
                user_id,
                user_name,
                user_avatar,
                rating,
                comment,
                created_at,
                updated_at
            )
            VALUES (
                @id,
                @business_id,
                @user_id,
                @user_name,
                @user_avatar,
                @rating,
                @comment,
                @created_at,
                @updated_at
            )
            RETURNING
                id,
                business_id,
                user_id,
                user_name,
                user_avatar,
                rating,
                comment,
                created_at,
                updated_at;
            """;

        var reviewId = Guid.NewGuid();
        var createdAt = DateTime.UtcNow;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.Add(
            "id",
            NpgsqlDbType.Uuid
        ).Value = reviewId;

        command.Parameters.Add(
            "business_id",
            NpgsqlDbType.Uuid
        ).Value = businessId;

        command.Parameters.Add(
            "user_id",
            NpgsqlDbType.Uuid
        ).Value = parsedUserId;

        command.Parameters.Add(
            "user_name",
            NpgsqlDbType.Varchar
        ).Value = string.IsNullOrWhiteSpace(userName)
            ? "SJ Tuklas User"
            : userName.Trim();

        command.Parameters.Add(
            "user_avatar",
            NpgsqlDbType.Text
        ).Value = DBNull.Value;

        // PostgreSQL SMALLINT.
        command.Parameters.Add(
            "rating",
            NpgsqlDbType.Smallint
        ).Value = (short)request.Rating;

        command.Parameters.Add(
            "comment",
            NpgsqlDbType.Varchar
        ).Value = comment;

        command.Parameters.Add(
            "created_at",
            NpgsqlDbType.TimestampTz
        ).Value = createdAt;

        // updated_at is NOT NULL in the current database schema.
        command.Parameters.Add(
            "updated_at",
            NpgsqlDbType.TimestampTz
        ).Value = createdAt;

        try
        {
            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                throw new InvalidOperationException(
                    "Review INSERT returned no record."
                );
            }

            return MapReview(reader);
        }
        catch (PostgresException ex)
            when (ex.SqlState == "23505")
        {
            // Unique constraint violation:
            // one review per user per business.
            throw new ReviewAlreadyExistsException();
        }
        catch (PostgresException ex)
        {
            // Keep database details in server logs only.
            Console.WriteLine("======================================");
            Console.WriteLine("REVIEW DATABASE ERROR");
            Console.WriteLine($"SQL State: {ex.SqlState}");
            Console.WriteLine($"Message: {ex.MessageText}");
            Console.WriteLine($"Detail: {ex.Detail}");
            Console.WriteLine($"Hint: {ex.Hint}");
            Console.WriteLine($"Table: {ex.TableName}");
            Console.WriteLine($"Column: {ex.ColumnName}");
            Console.WriteLine("======================================");

            throw;
        }
    }

    // =========================================================
    // DELETE OWN REVIEW
    // =========================================================

    public async Task<bool> DeleteReviewAsync(
        Guid reviewId,
        string userId)
    {
        var parsedUserId = ParseUserId(userId);

        const string sql = """
            DELETE FROM public.reviews
            WHERE id = @review_id
              AND user_id = @user_id;
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.Add(
            "review_id",
            NpgsqlDbType.Uuid
        ).Value = reviewId;

        command.Parameters.Add(
            "user_id",
            NpgsqlDbType.Uuid
        ).Value = parsedUserId;

        var affectedRows =
            await command.ExecuteNonQueryAsync();

        return affectedRows > 0;
    }

    // =========================================================
    // MAP DATABASE RECORD TO DTO
    // =========================================================

    private static ReviewResponse MapReview(
        NpgsqlDataReader reader)
    {
        var idOrdinal = reader.GetOrdinal("id");
        var businessIdOrdinal = reader.GetOrdinal("business_id");
        var userIdOrdinal = reader.GetOrdinal("user_id");
        var userNameOrdinal = reader.GetOrdinal("user_name");
        var userAvatarOrdinal = reader.GetOrdinal("user_avatar");
        var ratingOrdinal = reader.GetOrdinal("rating");
        var commentOrdinal = reader.GetOrdinal("comment");
        var createdAtOrdinal = reader.GetOrdinal("created_at");
        var updatedAtOrdinal = reader.GetOrdinal("updated_at");

        return new ReviewResponse
        {
            Id = reader.GetGuid(idOrdinal),

            BusinessId = reader.GetGuid(businessIdOrdinal),

            UserId = reader.GetGuid(userIdOrdinal).ToString(),

            UserName = reader.IsDBNull(userNameOrdinal)
                ? "SJ Tuklas User"
                : reader.GetString(userNameOrdinal),

            UserAvatar = reader.IsDBNull(userAvatarOrdinal)
                ? null
                : reader.GetString(userAvatarOrdinal),

            // PostgreSQL SMALLINT -> C# short -> int.
            Rating = reader.GetInt16(ratingOrdinal),

            Comment = reader.IsDBNull(commentOrdinal)
                ? string.Empty
                : reader.GetString(commentOrdinal),

            CreatedAt = reader.GetDateTime(createdAtOrdinal),

            UpdatedAt = reader.IsDBNull(updatedAtOrdinal)
                ? null
                : reader.GetDateTime(updatedAtOrdinal)
        };
    }

    // =========================================================
    // VALIDATE USER ID
    // =========================================================

    private static Guid ParseUserId(string userId)
    {
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            throw new ArgumentException(
                "User ID must be a valid UUID.",
                nameof(userId)
            );
        }

        return parsedUserId;
    }
}

// =============================================================
// REVIEW ALREADY EXISTS
// =============================================================

public class ReviewAlreadyExistsException : Exception
{
    public ReviewAlreadyExistsException()
        : base("You have already reviewed this business.")
    {
    }
}