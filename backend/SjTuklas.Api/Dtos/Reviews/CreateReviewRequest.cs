namespace SjTuklas.Api.Dtos.Reviews;

public class CreateReviewRequest
{
    public int Rating { get; set; }

    public string Comment { get; set; } = string.Empty;
}