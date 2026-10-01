
namespace SjTuklas.Api.Models;

public sealed class Inquiry
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public Guid VisitorId { get; set; }
    public Guid OwnerId { get; set; }
    public string Subject { get; set; } = "Business inquiry";
    public string Status { get; set; } = "new";
    public DateTimeOffset? VisitorLastReadAt { get; set; }
    public DateTimeOffset? OwnerLastReadAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class InquiryMessage
{
    public Guid Id { get; set; }
    public Guid InquiryId { get; set; }
    public Guid SenderId { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}