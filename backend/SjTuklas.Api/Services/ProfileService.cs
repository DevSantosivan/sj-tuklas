using Npgsql;

namespace SjTuklas.Api.Services;

public class ProfileService
{
    private readonly string _connectionString;

    public ProfileService(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("Supabase")
            ?? throw new InvalidOperationException(
                "Supabase connection string is not configured."
            );
    }

    // ============================================================
    // UPSERT PROFILE
    // ============================================================

    public async Task UpsertProfileAsync(
        Guid userId,
        string fullName,
        string role,
        string? phone)
    {
        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        const string sql = """
            INSERT INTO public.profiles
            (
                id,
                full_name,
                phone,
                role
            )
            VALUES
            (
                @id,
                @full_name,
                @phone,
                CAST(@role AS app_role)
            )
            ON CONFLICT (id)
            DO UPDATE SET
                full_name = EXCLUDED.full_name,
                phone = EXCLUDED.phone,
                role = EXCLUDED.role;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "id",
            userId
        );

        command.Parameters.AddWithValue(
            "full_name",
            fullName
        );

        command.Parameters.AddWithValue(
            "phone",
            (object?)phone ?? DBNull.Value
        );

        command.Parameters.AddWithValue(
            "role",
            role
        );

        await command.ExecuteNonQueryAsync();
    }

    // ============================================================
    // GET PROFILE
    // ============================================================

    public async Task<Profile?> GetProfileAsync(
        Guid userId)
    {
        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        const string sql = """
            SELECT
                p.id,
                p.full_name,
                p.phone,
                p.role,
                u.email
            FROM public.profiles p
            LEFT JOIN auth.users u
                ON u.id = p.id
            WHERE p.id = @id
            LIMIT 1;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "id",
            userId
        );

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        var idOrdinal =
            reader.GetOrdinal("id");

        var fullNameOrdinal =
            reader.GetOrdinal("full_name");

        var phoneOrdinal =
            reader.GetOrdinal("phone");

        var roleOrdinal =
            reader.GetOrdinal("role");

        var emailOrdinal =
            reader.GetOrdinal("email");

        return new Profile
        {
            Id =
                reader.GetGuid(idOrdinal),

            FullName =
                reader.IsDBNull(fullNameOrdinal)
                    ? null
                    : reader.GetString(fullNameOrdinal),

            Phone =
                reader.IsDBNull(phoneOrdinal)
                    ? null
                    : reader.GetString(phoneOrdinal),

            Role =
                reader.IsDBNull(roleOrdinal)
                    ? null
                    : reader.GetString(roleOrdinal),

            Email =
                reader.IsDBNull(emailOrdinal)
                    ? null
                    : reader.GetString(emailOrdinal)
        };
    }

    // ============================================================
    // CHECK ADMIN
    // ============================================================

    public async Task<bool> IsAdminAsync(
        Guid userId)
    {
        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync();

        const string sql = """
            SELECT role
            FROM public.profiles
            WHERE id = @id
            LIMIT 1;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "id",
            userId
        );

        var result =
            await command.ExecuteScalarAsync();

        if (
            result is null ||
            result == DBNull.Value
        )
        {
            return false;
        }

        return string.Equals(
            result.ToString(),
            "admin",
            StringComparison.OrdinalIgnoreCase
        );
    }


// ============================================================
// GET REGISTERED USER COUNT
// ============================================================

public async Task<int> GetRegisteredUserCountAsync()
{
    await using var connection =
        new NpgsqlConnection(_connectionString);

    await connection.OpenAsync();

    const string sql = """
        SELECT COUNT(*)
        FROM public.profiles;
        """;

    await using var command =
        new NpgsqlCommand(sql, connection);

    var result =
        await command.ExecuteScalarAsync();

    return Convert.ToInt32(result);
}


}


// ================================================================
// PROFILE MODEL
// ================================================================

public class Profile
{
    public Guid Id { get; set; }

    public string? FullName { get; set; }

    public string? Phone { get; set; }

    public string? Role { get; set; }

    public string? Email { get; set; }
}