
using Npgsql;
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

        command.Parameters.AddWithValue(
            "business_id",
            businessId
        );

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

        command.Parameters.AddWithValue(
            "business_id",
            businessId
        );

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            ratings.Add(reader.GetInt32(
                reader.GetOrdinal("rating")
            ));
        }

        return new ReviewSummaryResponse
        {
            TotalReviews = ratings.Count,

            AverageRating = ratings.Count == 0
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

        var parsedUserId = ParseUserId(userId);

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "business_id",
            businessId
        );

        command.Parameters.AddWithValue(
            "user_id",
            parsedUserId
        );

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
        var comment = request.Comment.Trim();

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("id", reviewId);
        command.Parameters.AddWithValue("business_id", businessId);
        command.Parameters.AddWithValue("user_id", parsedUserId);
        command.Parameters.AddWithValue("user_name", userName);
        command.Parameters.AddWithValue(
            "user_avatar",
            DBNull.Value
        );
        command.Parameters.AddWithValue("rating", request.Rating);
        command.Parameters.AddWithValue("comment", comment);
        command.Parameters.AddWithValue("created_at", createdAt);
        command.Parameters.AddWithValue(
            "updated_at",
            DBNull.Value
        );

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
            Console.WriteLine("======================================");
            Console.WriteLine("REVIEW DATABASE ERROR");
            Console.WriteLine($"Code: {ex.SqlState}");
            Console.WriteLine($"Message: {ex.MessageText}");
            Console.WriteLine($"Detail: {ex.Detail}");
            Console.WriteLine($"Hint: {ex.Hint}");
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
        const string sql = """
            DELETE FROM public.reviews
            WHERE id = @review_id
              AND user_id = @user_id;
            """;

        var parsedUserId = ParseUserId(userId);

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "review_id",
            reviewId
        );

        command.Parameters.AddWithValue(
            "user_id",
            parsedUserId
        );

        var affectedRows =
            await command.ExecuteNonQueryAsync();

        return affectedRows > 0;
    }

    // =========================================================
    // MAP REVIEW
    // =========================================================

    private static ReviewResponse MapReview(
        NpgsqlDataReader reader)
    {
        var userAvatarOrdinal =
            reader.GetOrdinal("user_avatar");

        var updatedAtOrdinal =
            reader.GetOrdinal("updated_at");

        return new ReviewResponse
        {
            Id = reader.GetGuid(
                reader.GetOrdinal("id")
            ),

            BusinessId = reader.GetGuid(
                reader.GetOrdinal("business_id")
            ),

            UserId = reader.GetGuid(
                reader.GetOrdinal("user_id")
            ).ToString(),

            UserName = reader.GetString(
                reader.GetOrdinal("user_name")
            ),

            UserAvatar = reader.IsDBNull(userAvatarOrdinal)
                ? null
                : reader.GetString(userAvatarOrdinal),

            Rating = reader.GetInt32(
                reader.GetOrdinal("rating")
            ),

            Comment = reader.GetString(
                reader.GetOrdinal("comment")
            ),

            CreatedAt = reader.GetDateTime(
                reader.GetOrdinal("created_at")
            ),

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
// REVIEW SERVICE EXCEPTION
// =============================================================

public class ReviewServiceException : Exception
{
    public System.Net.HttpStatusCode StatusCode { get; }

    public string ResponseBody { get; }

    public ReviewServiceException(
        System.Net.HttpStatusCode statusCode,
        string responseBody)
        : base($"Supabase request failed: {(int)statusCode}")
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
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