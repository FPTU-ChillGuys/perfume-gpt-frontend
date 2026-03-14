import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import InsightsIcon from "@mui/icons-material/Insights";
import CelebrationIcon from "@mui/icons-material/Celebration";
import { ReviewCard } from "@/components/review/ReviewCard";
import { productReviewService } from "@/services/reviewService";
import {
  getReviewStatus,
  type ReviewResponse,
  type ReviewStatisticsResponse,
} from "@/types/review";

interface ReviewSectionProps {
  variantId: string | null;
  refreshToken?: number;
}

const ratingLabels = [5, 4, 3, 2, 1] as const;

const gradientCardSx = {
  borderRadius: 3,
  p: 3,
  border: "1px solid",
  borderColor: "rgba(255,255,255,0.4)",
  background: "linear-gradient(135deg, #f8f1ff 0%, #fdecef 55%, #fff8ec 100%)",
};

const ReviewStatistics = ({
  stats,
}: {
  stats: ReviewStatisticsResponse | null;
}) => {
  const total = stats?.totalReviews ?? 0;
  const average = stats?.averageRating ?? 0;

  return (
    <Box sx={gradientCardSx}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        alignItems="center"
      >
        <Box textAlign="center" flex={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Điểm trung bình
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            alignItems="flex-end"
            mt={1}
          >
            <Typography variant="h2" fontWeight={800} color="#ff7a18">
              {average.toFixed(1)}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              /5
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Dựa trên {total} lượt đánh giá
          </Typography>
          <Chip
            icon={<CelebrationIcon fontSize="small" />}
            label={
              average >= 4.8
                ? "Tuyệt phẩm"
                : average >= 4.2
                  ? "Được yêu thích"
                  : "Đáng cân nhắc"
            }
            color="warning"
            sx={{ mt: 1.5, bgcolor: "rgba(255, 143, 66, 0.15)" }}
          />
        </Box>
        <Box flex={2} width="100%">
          <Stack spacing={1.25}>
            {ratingLabels.map((score) => {
              const count =
                score === 5
                  ? (stats?.fiveStarCount ?? 0)
                  : score === 4
                    ? (stats?.fourStarCount ?? 0)
                    : score === 3
                      ? (stats?.threeStarCount ?? 0)
                      : score === 2
                        ? (stats?.twoStarCount ?? 0)
                        : (stats?.oneStarCount ?? 0);
              const percentage = total ? Math.round((count / total) * 100) : 0;
              return (
                <Stack
                  key={score}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                >
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    width={92}
                  >
                    <Typography fontWeight={700}>{score}</Typography>
                    <StarRoundedIcon
                      sx={{ color: "#ffb347" }}
                      fontSize="small"
                    />
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      flex: 1,
                      height: 12,
                      borderRadius: 6,
                      bgcolor: "rgba(255,255,255,0.6)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 6,
                        background: "linear-gradient(90deg, #ff7a18, #ffb347)",
                      },
                    }}
                  />
                  <Typography
                    width={56}
                    textAlign="right"
                    fontWeight={600}
                    color="text.secondary"
                  >
                    {count}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>
        <Box textAlign="center" flex={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Tỷ lệ giới thiệu
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            alignItems="center"
            mt={1}
          >
            <InsightsIcon sx={{ color: "#845EF7" }} />
            <Typography variant="h4" fontWeight={700} color="#845EF7">
              {total ? Math.min(99, Math.round((average / 5) * 100)) : 0}%
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Khách đã mua sẵn sàng giới thiệu sản phẩm này
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export const ReviewSection = ({
  variantId,
  refreshToken = 0,
}: ReviewSectionProps) => {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [stats, setStats] = useState<ReviewStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    if (!variantId) {
      setReviews([]);
      setStats(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setVisibleCount(4);

    Promise.all([
      productReviewService.getVariantReviews(variantId),
      productReviewService.getVariantStatistics(variantId),
    ])
      .then(([variantReviews, statistics]) => {
        if (!isMounted) return;
        setReviews(variantReviews);
        setStats(statistics);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Không thể tải đánh giá");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [variantId, refreshToken]);

  const approvedReviews = useMemo(
    () => reviews.filter((review) => getReviewStatus(review) === "Approved"),
    [reviews],
  );

  if (!variantId) {
    return null;
  }

  if (isLoading) {
    return (
      <Box mt={4}>
        <Skeleton
          variant="rounded"
          height={220}
          sx={{ mb: 3, borderRadius: 3 }}
        />
        <Grid container spacing={2}>
          {Array.from({ length: 2 }).map((_, idx) => (
            <Grid key={idx} size={{ xs: 12, md: 6 }}>
              <Skeleton
                variant="rounded"
                height={200}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box mt={4}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box mt={6}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <StarRoundedIcon sx={{ color: "#ff7a18" }} />
        <Typography variant="h5" fontWeight={700}>
          Trải nghiệm từ khách hàng thực tế
        </Typography>
      </Stack>

      <ReviewStatistics stats={stats} />

      <Box mt={4}>
        {approvedReviews.length === 0 ? (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
            Chưa có đánh giá nào cho phiên bản này. Hãy là người đầu tiên chia
            sẻ cảm nhận của bạn!
          </Alert>
        ) : (
          <Grid container spacing={2.5}>
            {approvedReviews.slice(0, visibleCount).map((review) => (
              <Grid key={review.id} size={{ xs: 12, md: 6 }}>
                <ReviewCard review={review} clampLines={5} />
              </Grid>
            ))}
          </Grid>
        )}

        {approvedReviews.length > visibleCount && (
          <Box textAlign="center" mt={4}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setVisibleCount((prev) => prev + 4)}
              sx={{
                px: 4,
                py: 1.2,
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Xem thêm đánh giá
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};
