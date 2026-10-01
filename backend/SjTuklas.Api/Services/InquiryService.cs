
using Npgsql;
using SjTuklas.Api.Dtos.Inquiries;

namespace SjTuklas.Api.Services;

public sealed class InquiryService : IInquiryService
{
    private readonly string _connectionString;

    public InquiryService(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("Supabase")
            ?? throw new InvalidOperationException(
                "Supabase connection string is not configured."
            );
    }

    // =========================================================
    // GET MY INQUIRIES
    // =========================================================

    public async Task<IReadOnlyList<InquiryResponse>> GetMyInquiriesAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                i.id,
                i.business_id,
                b.name,
                b.image,
                i.subject,
                i.status,
                i.visitor_id,
                i.owner_id,
                i.visitor_last_read_at,
                i.owner_last_read_at,
                i.created_at,
                i.updated_at,
                COALESCE((
                    SELECT m.message
                    FROM public.inquiry_messages m
                    WHERE m.inquiry_id = i.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ), '') AS last_message,
                (
                    SELECT m.created_at
                    FROM public.inquiry_messages m
                    WHERE m.inquiry_id = i.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS last_message_time,
                (
                    SELECT COUNT(*)::int
                    FROM public.inquiry_messages m
                    WHERE m.inquiry_id = i.id
                      AND m.sender_id <> @user_id
                      AND m.created_at > COALESCE(
                        CASE
                            WHEN i.visitor_id = @user_id
                                THEN i.visitor_last_read_at
                            ELSE i.owner_last_read_at
                        END,
                        '-infinity'::timestamptz
                      )
                ) AS unread
            FROM public.inquiries i
            INNER JOIN public.businesses b
                ON b.id = i.business_id
            WHERE i.visitor_id = @user_id
               OR i.owner_id = @user_id
            ORDER BY i.updated_at DESC;
            """;

        var results = new List<InquiryResponse>();

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync(cancellationToken);

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("user_id", userId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(MapInquiry(reader));
        }

        return results;
    }

    // =========================================================
    // GET INQUIRY BY ID
    // =========================================================

    public async Task<InquiryResponse?> GetInquiryByIdAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var inquiry = await GetAuthorizedInquiryAsync(
            inquiryId,
            userId,
            cancellationToken
        );

        if (inquiry is null)
            return null;

        inquiry.Messages = (
            await GetMessagesInternalAsync(
                inquiryId,
                userId,
                cancellationToken
            )
        ).ToList();

        return inquiry;
    }

    // =========================================================
    // GET MESSAGES
    // =========================================================

    public async Task<IReadOnlyList<InquiryMessageResponse>?> GetMessagesAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (!await IsParticipantAsync(
            inquiryId,
            userId,
            cancellationToken))
        {
            return null;
        }

        return await GetMessagesInternalAsync(
            inquiryId,
            userId,
            cancellationToken
        );
    }

    // =========================================================
    // CREATE INQUIRY
    // =========================================================

    public async Task<InquiryResponse> CreateInquiryAsync(
        CreateInquiryRequest request,
        Guid visitorId,
        CancellationToken cancellationToken)
    {
        var inquiry = await FindOrCreateForBusinessAsync(
            request.BusinessId,
            visitorId,
            cancellationToken
        );

        if (!string.IsNullOrWhiteSpace(request.Message))
        {
            await SendMessageAsync(
                inquiry.Id,
                request.Message,
                visitorId,
                cancellationToken
            );
        }

        if (!string.IsNullOrWhiteSpace(request.Subject))
        {
            const string updateSubjectSql = """
                UPDATE public.inquiries
                SET
                    subject = @subject,
                    updated_at = NOW()
                WHERE id = @id
                  AND visitor_id = @visitor_id;
                """;

            await using var connection =
                new NpgsqlConnection(_connectionString);

            await connection.OpenAsync(cancellationToken);

            await using var command =
                new NpgsqlCommand(updateSubjectSql, connection);

            command.Parameters.AddWithValue(
                "subject",
                request.Subject.Trim()
            );

            command.Parameters.AddWithValue("id", inquiry.Id);
            command.Parameters.AddWithValue("visitor_id", visitorId);

            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        return await GetAuthorizedInquiryAsync(
            inquiry.Id,
            visitorId,
            cancellationToken
        ) ?? throw new InvalidOperationException(
            "Inquiry could not be loaded."
        );
    }

    // =========================================================
    // FIND OR CREATE INQUIRY FOR BUSINESS
    // =========================================================

    public async Task<InquiryResponse> FindOrCreateForBusinessAsync(
        Guid businessId,
        Guid visitorId,
        CancellationToken cancellationToken)
    {
        const string businessSql = """
            SELECT owner_id
            FROM public.businesses
            WHERE id = @business_id;
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync(cancellationToken);

        Guid ownerId;

        await using (var businessCommand =
            new NpgsqlCommand(businessSql, connection))
        {
            businessCommand.Parameters.AddWithValue(
                "business_id",
                businessId
            );

            var value =
                await businessCommand.ExecuteScalarAsync(
                    cancellationToken
                );

            if (value is null || value is DBNull)
            {
                throw new KeyNotFoundException(
                    "Business was not found."
                );
            }

            ownerId = (Guid)value;
        }

        if (ownerId == visitorId)
        {
            throw new InvalidOperationException(
                "You cannot inquire about your own business."
            );
        }

        const string insertSql = """
            INSERT INTO public.inquiries (
                business_id,
                visitor_id,
                owner_id
            )
            VALUES (
                @business_id,
                @visitor_id,
                @owner_id
            )
            ON CONFLICT (business_id, visitor_id)
            DO UPDATE SET
                updated_at = public.inquiries.updated_at
            RETURNING id;
            """;

        Guid inquiryId;

        await using (var insertCommand =
            new NpgsqlCommand(insertSql, connection))
        {
            insertCommand.Parameters.AddWithValue(
                "business_id",
                businessId
            );

            insertCommand.Parameters.AddWithValue(
                "visitor_id",
                visitorId
            );

            insertCommand.Parameters.AddWithValue(
                "owner_id",
                ownerId
            );

            inquiryId = (Guid)(
                await insertCommand.ExecuteScalarAsync(
                    cancellationToken
                ) ?? throw new InvalidOperationException(
                    "Inquiry could not be created."
                )
            );
        }

        return await GetAuthorizedInquiryAsync(
            inquiryId,
            visitorId,
            cancellationToken
        ) ?? throw new InvalidOperationException(
            "Inquiry could not be loaded."
        );
    }

    // =========================================================
    // SEND MESSAGE
    // =========================================================

    public async Task<InquiryMessageResponse?> SendMessageAsync(
        Guid inquiryId,
        string message,
        Guid senderId,
        CancellationToken cancellationToken)
    {
        var cleanMessage = message.Trim();

        if (cleanMessage.Length == 0 || cleanMessage.Length > 5000)
        {
            throw new ArgumentException(
                "Message must be between 1 and 5000 characters."
            );
        }

        const string insertSql = """
            INSERT INTO public.inquiry_messages (
                inquiry_id,
                sender_id,
                message
            )
            SELECT
                i.id,
                @sender_id,
                @message
            FROM public.inquiries i
            WHERE i.id = @inquiry_id
              AND (
                  i.visitor_id = @sender_id
                  OR i.owner_id = @sender_id
              )
              AND i.status <> 'closed'
            RETURNING
                id,
                sender_id,
                message,
                created_at;
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        Guid messageId;
        DateTimeOffset createdAt;

        await using (var command =
            new NpgsqlCommand(insertSql, connection, transaction))
        {
            command.Parameters.AddWithValue("inquiry_id", inquiryId);
            command.Parameters.AddWithValue("sender_id", senderId);
            command.Parameters.AddWithValue("message", cleanMessage);

            await using var reader =
                await command.ExecuteReaderAsync(cancellationToken);

            if (!await reader.ReadAsync(cancellationToken))
                return null;

            messageId = reader.GetGuid(0);
            createdAt = reader.GetFieldValue<DateTimeOffset>(3);
        }

        const string updateSql = """
            UPDATE public.inquiries
            SET
                updated_at = NOW(),
                status = CASE
                    WHEN visitor_id = @sender_id THEN 'new'
                    ELSE 'replied'
                END
            WHERE id = @inquiry_id;
            """;

        await using (var updateCommand =
            new NpgsqlCommand(updateSql, connection, transaction))
        {
            updateCommand.Parameters.AddWithValue(
                "inquiry_id",
                inquiryId
            );

            updateCommand.Parameters.AddWithValue(
                "sender_id",
                senderId
            );

            await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        return new InquiryMessageResponse
        {
            Id = messageId,
            Sender = "self",
            Message = cleanMessage,
            CreatedAt = createdAt
        };
    }

    // =========================================================
    // MARK AS READ
    // =========================================================

    public async Task<bool> MarkAsReadAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE public.inquiries
            SET
                visitor_last_read_at = CASE
                    WHEN visitor_id = @user_id THEN NOW()
                    ELSE visitor_last_read_at
                END,
                owner_last_read_at = CASE
                    WHEN owner_id = @user_id THEN NOW()
                    ELSE owner_last_read_at
                END
            WHERE id = @inquiry_id
              AND (
                  visitor_id = @user_id
                  OR owner_id = @user_id
              );
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync(cancellationToken);

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("inquiry_id", inquiryId);
        command.Parameters.AddWithValue("user_id", userId);

        return await command.ExecuteNonQueryAsync(
            cancellationToken
        ) > 0;
    }

    // =========================================================
    // GET AUTHORIZED INQUIRY
    // =========================================================

    private async Task<InquiryResponse?> GetAuthorizedInquiryAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                i.id,
                i.business_id,
                b.name,
                b.image,
                i.subject,
                i.status,
                i.visitor_id,
                i.owner_id,
                i.visitor_last_read_at,
                i.owner_last_read_at,
                i.created_at,
                i.updated_at,
                COALESCE((
                    SELECT m.message
                    FROM public.inquiry_messages m
                    WHERE m.inquiry_id = i.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ), '') AS last_message,
                (
                    SELECT m.created_at
                    FROM public.inquiry_messages m
                    WHERE m.inquiry_id = i.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS last_message_time,
                (
                    SELECT COUNT(*)::int
                    FROM public.inquiry_messages m
                    WHERE m.inquiry_id = i.id
                      AND m.sender_id <> @user_id
                      AND m.created_at > COALESCE(
                        CASE
                            WHEN i.visitor_id = @user_id
                                THEN i.visitor_last_read_at
                            ELSE i.owner_last_read_at
                        END,
                        '-infinity'::timestamptz
                      )
                ) AS unread
            FROM public.inquiries i
            INNER JOIN public.businesses b
                ON b.id = i.business_id
            WHERE i.id = @inquiry_id
              AND (
                  i.visitor_id = @user_id
                  OR i.owner_id = @user_id
              )
            LIMIT 1;
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync(cancellationToken);

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("inquiry_id", inquiryId);
        command.Parameters.AddWithValue("user_id", userId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        return await reader.ReadAsync(cancellationToken)
            ? MapInquiry(reader)
            : null;
    }

    // =========================================================
    // CHECK PARTICIPANT
    // =========================================================

    private async Task<bool> IsParticipantAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM public.inquiries
                WHERE id = @inquiry_id
                  AND (
                      visitor_id = @user_id
                      OR owner_id = @user_id
                  )
            );
            """;

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync(cancellationToken);

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("inquiry_id", inquiryId);
        command.Parameters.AddWithValue("user_id", userId);

        return (bool)(
            await command.ExecuteScalarAsync(cancellationToken)
            ?? false
        );
    }

    // =========================================================
    // GET MESSAGES INTERNAL
    // =========================================================

    private async Task<IReadOnlyList<InquiryMessageResponse>>
        GetMessagesInternalAsync(
            Guid inquiryId,
            Guid userId,
            CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id,
                sender_id,
                message,
                created_at
            FROM public.inquiry_messages
            WHERE inquiry_id = @inquiry_id
            ORDER BY created_at ASC;
            """;

        var messages = new List<InquiryMessageResponse>();

        await using var connection =
            new NpgsqlConnection(_connectionString);

        await connection.OpenAsync(cancellationToken);

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("inquiry_id", inquiryId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var senderId = reader.GetGuid(1);

            messages.Add(new InquiryMessageResponse
            {
                Id = reader.GetGuid(0),
                Sender = senderId == userId ? "self" : "other",
                Message = reader.GetString(2),
                CreatedAt = reader.GetFieldValue<DateTimeOffset>(3)
            });
        }

        return messages;
    }

    // =========================================================
    // MAP INQUIRY
    // =========================================================

    private static InquiryResponse MapInquiry(
        NpgsqlDataReader reader)
    {
        return new InquiryResponse
        {
            Id = reader.GetGuid(0),
            BusinessId = reader.GetGuid(1),
            BusinessName = reader.GetString(2),
            BusinessImage = reader.IsDBNull(3)
                ? null
                : reader.GetString(3),
            Subject = reader.GetString(4),
            Status = reader.GetString(5),
            LastMessage = reader.GetString(12),
            LastMessageTime = reader.IsDBNull(13)
                ? null
                : reader.GetFieldValue<DateTimeOffset>(13),
            Unread = reader.GetInt32(14)
        };
    }
}