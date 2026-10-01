namespace SjTuklas.Api.Dtos.Inquiries;

public sealed class InquiryMessageResponse
{
    public Guid Id { get; set; }

    public string Sender { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}