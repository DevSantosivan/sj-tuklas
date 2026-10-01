    namespace SjTuklas.Api.Dtos.Reviews;

    public class ReviewSummaryResponse
    {
        public double AverageRating { get; set; }

        public int TotalReviews { get; set; }

        public Dictionary<int, int> Breakdown { get; set; } = new()
        {
            [1] = 0,
            [2] = 0,
            [3] = 0,
            [4] = 0,
            [5] = 0
        };
    }