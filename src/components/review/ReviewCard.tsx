import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
  Button,
} from "@mui/material";
import Rating from "@mui/material/Rating";
import CloseIcon from "@mui/icons-material/Close";
import type { ReviewMedia, ReviewResponse, ReviewStatus } from "@/types/review";

const statusStyles: Record<ReviewStatus, { label: string; color: "default" | "success" | "warning" | "error" }> = {
  Pending: { label: "Chờ duyệt", color: "warning" },
  Approved: { label: "Đã duyệt", color: "success" },
  Rejected: { label: "Từ chối", color: "error" },
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const getInitials = (name?: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
};

interface ReviewCardProps {
  review: ReviewResponse;
  showStatus?: boolean;
  actions?: React.ReactNode;
  clampLines?: number;
  dense?: boolean;
}

export const ReviewCard = ({
  review,
  showStatus = false,
  actions,
  clampLines = 0,
  dense = false,
}: ReviewCardProps) => {
  const theme = useTheme();
  const [selectedImage, setSelectedImage] = useState<ReviewMedia | null>(null);
  const [expanded, setExpanded] = useState(false);

  const avatarGradient = useMemo(() => {
    const seed = (review.userFullName || "perfume").length * 37;
    const hue = (seed * 23) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 40) % 360}, 75%, 55%))`;
  }, [review.userFullName]);

  const commentNeedsClamp = clampLines > 0 && (review.comment?.length || 0) > 220;

  return (
    <Paper
      elevation={0}
      sx={{
        p: dense ? 2 : 3,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background: theme.palette.mode === "light"
          ? "radial-gradient(circle at top, rgba(255,255,255,0.95), rgba(248,248,248,0.9))"
          : theme.palette.background.paper,
      }}
    >
      <Stack spacing={dense ? 2 : 2.5}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={review.userProfilePictureUrl || undefined}
            sx={{
              width: dense ? 44 : 56,
              height: dense ? 44 : 56,
              background: review.userProfilePictureUrl ? undefined : avatarGradient,
              color: "white",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {getInitials(review.userFullName)}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography variant={dense ? "subtitle1" : "h6"} fontWeight={600} noWrap>
              {review.userFullName || "Ẩn danh"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {review.variantName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
              <Rating value={review.rating || 0} precision={0.5} size={dense ? "small" : "medium"} readOnly />
              <Typography variant="body2" color="text.secondary">
                {review.rating?.toFixed(1)} · {review.createdAt ? dateFormatter.format(new Date(review.createdAt)) : ""}
              </Typography>
              {showStatus && review.status && (
                <Chip
                  label={statusStyles[review.status]?.label || review.status}
                  color={statusStyles[review.status]?.color}
                  size="small"
                  sx={{ ml: 0.5 }}
                />
              )}
            </Stack>
          </Box>
          {actions}
        </Stack>

        {review.comment && (
          <Typography
            variant="body1"
            color="text.primary"
            sx={{
              lineHeight: 1.7,
              whiteSpace: "pre-line",
              ...(commentNeedsClamp && !expanded
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: clampLines,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
                : {}),
            }}
          >
            {review.comment}
          </Typography>
        )}

        {commentNeedsClamp && (
          <Button
            variant="text"
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600 }}
          >
            {expanded ? "Thu gọn" : "Xem thêm"}
          </Button>
        )}

        {(review.images?.length || 0) > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 1.5,
            }}
          >
            {(review.images || []).map((image) => (
              <Box
                key={image.id}
                onClick={() => setSelectedImage(image)}
                sx={{
                  position: "relative",
                  borderRadius: 2,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: "rgba(0,0,0,0.08)",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-2px)" },
                }}
              >
                <img
                  src={image.url || ""}
                  alt={image.altText || review.variantName || "Review image"}
                  style={{ width: "100%", height: 100, objectFit: "cover" }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Stack>

      <Dialog open={Boolean(selectedImage)} onClose={() => setSelectedImage(null)} maxWidth="md">
        <DialogContent sx={{ position: "relative", p: 0 }}>
          <IconButton
            size="small"
            onClick={() => setSelectedImage(null)}
            sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(0,0,0,0.6)", color: "white", zIndex: 1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          {selectedImage && (
            <Box sx={{ p: 3, bgcolor: "black" }}>
              <img
                src={selectedImage.url || ""}
                alt={selectedImage.altText || "Review image"}
                style={{ width: "100%", height: "auto", borderRadius: 12 }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};
