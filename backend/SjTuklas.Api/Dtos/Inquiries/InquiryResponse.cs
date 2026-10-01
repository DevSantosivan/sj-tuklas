namespace SjTuklas.Api.Dtos.Inquiries;

public sealed class InquiryResponse
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public string BusinessName { get; set; } = string.Empty;

    public string? BusinessImage { get; set; }

    public string Subject { get; set; } = string.Empty;

    public string LastMessage { get; set; } = string.Empty;

    public DateTimeOffset? LastMessageTime { get; set; }

    public string Status { get; set; } = "new";

    public int Unread { get; set; }

    public List<InquiryMessageResponse> Messages { get; set; } = [];
}