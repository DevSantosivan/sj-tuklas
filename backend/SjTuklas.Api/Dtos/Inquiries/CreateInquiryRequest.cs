namespace SjTuklas.Api.Dtos.Inquiries;

public sealed class CreateInquiryRequest
{
    public Guid BusinessId { get; set; }

    public string Subject { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}