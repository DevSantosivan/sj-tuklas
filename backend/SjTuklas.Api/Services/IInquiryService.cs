using SjTuklas.Api.Dtos.Inquiries;

namespace SjTuklas.Api.Services;

public interface IInquiryService
{
    Task<IReadOnlyList<InquiryResponse>> GetMyInquiriesAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<InquiryResponse?> GetInquiryByIdAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InquiryMessageResponse>?> GetMessagesAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<InquiryResponse> CreateInquiryAsync(
        CreateInquiryRequest request,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<InquiryResponse> FindOrCreateForBusinessAsync(
        Guid businessId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<InquiryMessageResponse?> SendMessageAsync(
        Guid inquiryId,
        string message,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<bool> MarkAsReadAsync(
        Guid inquiryId,
        Guid userId,
        CancellationToken cancellationToken = default);
}