import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import InsightsIcon from "@mui/icons-material/Insights";
import CelebrationIcon from "@mui/icons-material/Celebration";
import { ReviewCard } from "@/components/review/ReviewCard";
import { productReviewService } from "@/services/reviewService";
import { useAuth } from "@/hooks/useAuth";
import { markRenderMetric } from "@/utils/perfMetrics";
import {
  type ReviewResponse,
  type ReviewStatisticsResponse,
} from "@/types/review";

interface ReviewSectionProps {
  variantId: string | null;
  refreshToken?: number;
  onStatisticsChange?: (stats: ReviewStatisticsResponse | null) => void;
}

const ratingLabels = [5, 4, 3, 2, 1] as const;

type RatingFilter = 0 | 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Statistics panel (left column)
// ---------------------------------------------------------------------------

const ReviewStatistics = ({
  stats,
  activeFilter,
  onFilter,
}: {
  stats: ReviewStatisticsResponse | null;
  activeFilter: RatingFilter;
  onFilter: (r: RatingFilter) => void;
}) => {
  const total = stats?.totalReviews ?? 0;
  const average = stats?.averageRating ?? 0;
  const recommendPct = total ? Math.min(99, Math.round((average / 5) * 100)) : 0;

  const countByStar: Record<number, number> = {
    5: stats?.fiveStarCount ?? 0,
    4: stats?.fourStarCount ?? 0,
    3: stats?.threeStarCount ?? 0,
    2: stats?.twoStarCount ?? 0,
    1: stats?.oneStarCount ?? 0,
  };

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      {/* Score summary */}
      <Box
        sx={{
          p: 3,
          background:
            "linear-gradient(135deg, #fff8f0 0%, #fff0f5 55%, #f5f0ff 100%)",
          borderBottom: "1px solid",
          borderColor: "divider",
          textAlign: "center",
        }}
      >
        <Typography
          variant="h1"
          fontWeight={800}
          sx={{ color: "#f59e0b", lineHeight: 1, fontSize: "3.5rem" }}
        >
          {average.toFixed(1)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          trên 5
        </Typography>
        <Stack
          direction="row"
          justifyContent="center"
          spacing={0.25}
          mt={0.75}
          mb={0.5}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <StarRoundedIcon
              key={i}
              sx={{
                fontSize: 20,
                color: i < Math.round(average) ? "#f59e0b" : "#e5e7eb",
              }}
            />
          ))}
        </Stack>
        <Chip
          label={
            average >= 4.8
              ? "Tuyệt phẩm"
              : average >= 4.2
                ? "Được yêu thích"
                : "Đáng cân nhắc"
          }
          size="small"
          sx={{
            bgcolor: "rgba(245,158,11,0.12)",
            color: "#b45309",
            fontWeight: 700,
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        />
        <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
          {total} đánh giá
        </Typography>
      </Box>

      {/* Rating bars — clickable for filter */}
      <Box sx={{ p: 2 }}>
        <Stack spacing={0.75}>
          {ratingLabels.map((score) => {
            const count = countByStar[score] ?? 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            const isActive = activeFilter === score;
            return (
              <Stack
                key={score}
                direction="row"
                spacing={1.25}
                alignItems="center"
                onClick={() => onFilter(isActive ? 0 : score)}
                sx={{
                  cursor: "pointer",
                  borderRadius: 1,
                  px: 0.5,
                  py: 0.25,
                  bgcolor: isActive ? "rgba(245,158,11,0.1)" : "transparent",
                  outline: isActive ? "1px solid rgba(245,158,11,0.4)" : "none",
                  transition: "all 0.18s",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                }}
              >
                <Stack direction="row" spacing={0.4} alignItems="center" width={52} flexShrink={0}>
                  <Typography variant="caption" fontWeight={700} sx={{ minWidth: 8 }}>
                    {score}
                  </Typography>
                  <StarRoundedIcon sx={{ fontSize: 13, color: "#f59e0b" }} />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: "rgba(0,0,0,0.07)",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 3,
                      background: isActive
                        ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : "linear-gradient(90deg, #d1d5db, #9ca3af)",
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color={isActive ? "#b45309" : "text.secondary"}
                  fontWeight={isActive ? 700 : 400}
                  sx={{ minWidth: 28, textAlign: "right" }}
                >
                  {count}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      {/* Recommend rate */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Tỷ lệ giới thiệu:
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color="#845EF7">
            {recommendPct}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 6;

export const ReviewSection = ({
  variantId,
  refreshToken = 0,
  onStatisticsChange,
}: ReviewSectionProps) => {
  const { user } = useAuth();
  const canReply = user?.role === "staff" || user?.role === "admin";
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [stats, setStats] = useState<ReviewStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(0);
  const variantCacheRef = useRef<
    Map<
      string,
      { reviews: ReviewResponse[]; stats: ReviewStatisticsResponse | null }
    >
  >(new Map());

  useEffect(() => {
    variantCacheRef.current.clear();
  }, [refreshToken]);

  useEffect(() => {
    if (!variantId) {
      onStatisticsChange?.(null);
      return;
    }

    const cached = variantCacheRef.current.get(variantId);
    if (cached) {
      setReviews(cached.reviews);
      setStats(cached.stats);
      onStatisticsChange?.(cached.stats);
      setError(null);
      setVisibleCount(PAGE_SIZE);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const startedAt = performance.now();
    setIsLoading(true);
    setError(null);
    setVisibleCount(PAGE_SIZE);
    setStats(null);
    onStatisticsChange?.(null);

    Promise.allSettled([
      productReviewService.getVariantReviews(variantId),
      productReviewService.getVariantStatistics(variantId),
    ])
      .then(([reviewsResult, statsResult]) => {
        if (!isMounted) return;

        if (reviewsResult.status === "rejected") {
          setError(reviewsResult.reason?.message || "Không thể tải đánh giá");
          setReviews([]);
          setStats(null);
          onStatisticsChange?.(null);
          return;
        }

        const variantReviews = reviewsResult.value || [];
        const statistics =
          statsResult.status === "fulfilled" ? statsResult.value : null;

        variantCacheRef.current.set(variantId, {
          reviews: variantReviews,
          stats: statistics,
        });
        setReviews(variantReviews);
        setStats(statistics);
        onStatisticsChange?.(statistics);

        if (statsResult.status === "rejected") {
          console.warn("Failed to load review statistics:", statsResult.reason);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
          markRenderMetric(
            "/products/:productId",
            "review-section-fetch",
            performance.now() - startedAt,
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [variantId, refreshToken, onStatisticsChange]);

  const filteredReviews = useMemo(() => {
    if (ratingFilter === 0) return reviews;
    return reviews.filter(
      (r) => Math.round(r.rating ?? 0) === ratingFilter,
    );
  }, [reviews, ratingFilter]);

  const handleFilterChange = (r: RatingFilter) => {
    setRatingFilter(r);
    setVisibleCount(PAGE_SIZE);
  };

  if (!variantId) return null;

  if (isLoading) {
    return (
      <Box mt={4}>
        <Skeleton variant="rounded" height={32} width={260} sx={{ mb: 3 }} />
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Skeleton variant="rounded" height={320} sx={{ flex: "0 0 280px", borderRadius: 2 }} />
          <Box flex={1}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <Box key={idx} sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1.5} mb={1}>
                  <Skeleton variant="circular" width={44} height={44} />
                  <Box flex={1}>
                    <Skeleton variant="text" width="40%" height={18} />
                    <Skeleton variant="text" width="25%" height={14} />
                    <Skeleton variant="text" width="30%" height={16} />
                  </Box>
                </Stack>
                <Skeleton variant="text" width="90%" />
                <Skeleton variant="text" width="75%" />
              </Box>
            ))}
          </Box>
        </Stack>
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

  const total = stats?.totalReviews ?? 0;

  return (
    <Box mt={6}>
      {/* Section header */}
      <Stack direction="row" spacing={1} alignItems="center" mb={3}>
        <StarRoundedIcon sx={{ color: "#f59e0b", fontSize: 22 }} />
        <Typography variant="h5" fontWeight={700}>
          Đánh giá từ khách hàng
        </Typography>
        {total > 0 && (
          <Typography variant="body2" color="text.secondary">
            ({total})
          </Typography>
        )}
      </Stack>

      {reviews.length === 0 ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
          Chưa có đánh giá nào cho phiên bản này. Hãy là người đầu tiên chia
          sẻ cảm nhận của bạn!
        </Alert>
      ) : (
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
          {/* Left: Stats + filter */}
          <Box sx={{ flex: "0 0 260px", position: { md: "sticky" }, top: { md: 90 } }}>
            <ReviewStatistics
              stats={stats}
              activeFilter={ratingFilter}
              onFilter={handleFilterChange}
            />
            {ratingFilter !== 0 && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={() => handleFilterChange(0)}
                sx={{ mt: 1, borderRadius: 1.5, textTransform: "none", fontWeight: 600 }}
              >
                Xem tất cả đánh giá
              </Button>
            )}
          </Box>

          {/* Right: Review list */}
          <Box flex={1} minWidth={0}>
            {/* Filter summary */}
            {ratingFilter !== 0 && (
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Lọc:
                </Typography>
                <Chip
                  icon={<StarRoundedIcon sx={{ fontSize: "14px !important", color: "#f59e0b !important" }} />}
                  label={`${ratingFilter} sao`}
                  size="small"
                  onDelete={() => handleFilterChange(0)}
                  sx={{ fontWeight: 700 }}
                />
                <Typography variant="caption" color="text.secondary">
                  ({filteredReviews.length} kết quả)
                </Typography>
              </Stack>
            )}

            {filteredReviews.length === 0 ? (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                Không có đánh giá {ratingFilter} sao nào.
              </Alert>
            ) : (
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ borderRadius: 2, px: { xs: 2, md: 3 }, py: 1 }}
              >
                {filteredReviews.slice(0, visibleCount).map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    clampLines={5}
                    onReply={
                      canReply
                        ? async (reviewId, comment) => {
                            await productReviewService.answerReview(reviewId, comment);
                            const updated =
                              await productReviewService.getVariantReviews(variantId!);
                            setReviews(updated);
                          }
                        : undefined
                    }
                  />
                ))}
              </Paper>
            )}

            {filteredReviews.length > visibleCount && (
              <Box textAlign="center" mt={3}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  sx={{
                    px: 4,
                    py: 1,
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: "divider",
                  }}
                >
                  Xem thêm ({filteredReviews.length - visibleCount} đánh giá)
                </Button>
              </Box>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
};
