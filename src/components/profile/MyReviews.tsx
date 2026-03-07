import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { ReviewResponse, ReviewStatus } from "@/types/review";
import { ReviewCard } from "@/components/review/ReviewCard";

interface MyReviewsProps {
  reviews: ReviewResponse[];
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (review: ReviewResponse) => void;
  onDelete: (review: ReviewResponse) => Promise<void>;
}

const statusOptions: { value: ReviewStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "Pending", label: "Chờ duyệt" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Rejected", label: "Bị từ chối" },
];

export const MyReviews = ({ reviews, isLoading, onRefresh, onEdit, onDelete }: MyReviewsProps) => {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const sorted = [...reviews].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
    if (statusFilter === "all") {
      return sorted;
    }
    return sorted.filter((review) => review.status === statusFilter);
  }, [reviews, statusFilter]);

  const handleDelete = async (review: ReviewResponse) => {
    if (!review.id) return;
    if (!window.confirm("Bạn chắc chắn muốn xoá đánh giá này?")) {
      return;
    }
    setDeletingId(review.id);
    try {
      await onDelete(review);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} mb={3} alignItems={{ xs: "flex-start", md: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Đánh giá của tôi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Theo dõi trạng thái và cập nhật phản hồi từ đội ngũ PerfumeGPT
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(_, value) => value && setStatusFilter(value)}
            size="small"
            color="primary"
          >
            {statusOptions.map((option) => (
              <ToggleButton
                key={option.value}
                value={option.value}
                sx={{ textTransform: "none", px: 2 }}
              >
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={isLoading}
          >
            Làm mới
          </Button>
        </Stack>
      </Stack>

      {isLoading ? (
        <Stack spacing={2}>
          {Array.from({ length: 2 }).map((_, idx) => (
            <Box key={idx} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", height: 160, bgcolor: "grey.50" }} />
          ))}
        </Stack>
      ) : filtered.length === 0 ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
          {statusFilter === "all"
            ? "Bạn chưa có đánh giá nào. Hãy chia sẻ cảm nhận sau mỗi đơn hàng!"
            : "Không có đánh giá nào ở trạng thái này."}
        </Alert>
      ) : (
        <Stack spacing={2.5}>
          {filtered.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              showStatus
              dense
              actions={
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<EditIcon fontSize="small" />}
                    onClick={() => onEdit(review)}
                  >
                    Chỉnh sửa
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    color="error"
                    startIcon={
                      deletingId === review.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <DeleteOutlineIcon fontSize="small" />
                      )
                    }
                    onClick={() => handleDelete(review)}
                    disabled={deletingId === review.id}
                  >
                    Xoá
                  </Button>
                </Stack>
              }
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};
