using SjTuklas.Api.Dtos.Inquiries;

namespace SjTuklas.Api.Services;

public interface IInquiryService
{
    // GET: /api/inquiries
    // Visitor's inquiries
    Task<IReadOnlyList<InquiryResponse>> GetMyInquiriesAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    // GET: /api/inquiries/business
    // Inquiries received by the authenticated business owner
    Task<IReadOnlyList<InquiryResponse>> GetBusinessInquiriesAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    // GET: /api/inquiries/{id}
    Task<InquiryResponse?> GetInquiryByIdAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken = default);

    // GET: /api/inquiries/{id}/messages
    Task<IReadOnlyList<InquiryMessageResponse>?> GetMessagesAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken = default);

    // POST: /api/inquiries
    Task<InquiryResponse> CreateInquiryAsync(
        CreateInquiryRequest request,
        Guid userId,
        CancellationToken cancellationToken = default);

    // POST: /api/inquiries/business/{businessId}
    Task<InquiryResponse> FindOrCreateForBusinessAsync(
        Guid businessId,
        Guid userId,
        CancellationToken cancellationToken = default);

    // POST: /api/inquiries/{id}/messages
    Task<InquiryMessageResponse?> SendMessageAsync(
        Guid inquiryId,
        string message,
        Guid userId,
        CancellationToken cancellationToken = default);

    // PATCH: /api/inquiries/{id}/read
    Task<bool> MarkAsReadAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken = default);
}