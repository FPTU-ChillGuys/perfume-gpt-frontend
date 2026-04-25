import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import Rating from "@mui/material/Rating";
import CloseIcon from "@mui/icons-material/Close";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import VerifiedIcon from "@mui/icons-material/Verified";
import {
  getReviewStatus,
  type ReviewMedia,
  type ReviewResponse,
  type ReviewStatus,
} from "@/types/review";
import remarkGfm from "remark-gfm";

const statusStyles: Record<
  ReviewStatus,
  { label: string; color: "default" | "success" | "warning" | "error" }
> = {
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

const getRatingColor = (rating: number) => {
  if (rating >= 4.5) return "#f59e0b";
  if (rating >= 3.5) return "#f59e0b";
  if (rating >= 2.5) return "#fb923c";
  return "#ef4444";
};

interface ReviewCardProps {
  review: ReviewResponse;
  showStatus?: boolean;
  actions?: React.ReactNode;
  clampLines?: number;
  dense?: boolean;
  onReply?: (reviewId: string, comment: string) => Promise<void>;
}

export const ReviewCard = ({
  review,
  showStatus = false,
  actions,
  clampLines = 0,
  dense = false,
  onReply,
}: ReviewCardProps) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [selectedImage, setSelectedImage] = useState<ReviewMedia | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(review.staffFeedbackComment ?? "");
  const [replyLoading, setReplyLoading] = useState(false);

  const avatarGradient = useMemo(() => {
    const seed = (review.userFullName || "perfume").length * 37;
    const hue = (seed * 23) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 55%, 52%), hsl(${(hue + 30) % 360}, 52%, 46%))`;
  }, [review.userFullName]);

  const reviewStatus = getReviewStatus(review);
  const commentNeedsClamp =
    clampLines > 0 && (review.comment?.length || 0) > 220;
  const ratingValue = review.rating || 0;
  const ratingColor = getRatingColor(ratingValue);

  return (
    <Box
      sx={{
        py: dense ? 2 : 2.5,
        px: dense ? 0 : 0,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
        transition: "background 0.15s",
      }}
    >
      {/* ── Row 1: Avatar + Name + Rating + Date ── */}
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar
          src={review.userProfilePictureUrl || undefined}
          sx={{
            width: dense ? 36 : 44,
            height: dense ? 36 : 44,
            background: review.userProfilePictureUrl ? undefined : avatarGradient,
            color: "white",
            fontWeight: 700,
            fontSize: dense ? "0.8rem" : "0.9rem",
            flexShrink: 0,
          }}
        >
          {getInitials(review.userFullName)}
        </Avatar>

        <Box flex={1} minWidth={0}>
          {/* Name + verified */}
          <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ lineHeight: 1.3 }}
            >
              {review.userFullName || "Ẩn danh"}
            </Typography>
            <Tooltip title="Đã mua hàng" placement="top">
              <VerifiedIcon sx={{ fontSize: 14, color: "#22c55e" }} />
            </Tooltip>
            {showStatus && reviewStatus && (
              <Chip
                label={statusStyles[reviewStatus]?.label || reviewStatus}
                color={statusStyles[reviewStatus]?.color}
                size="small"
                sx={{ height: 18, fontSize: "0.65rem" }}
              />
            )}
            {actions}
          </Stack>

          {/* Variant name */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.2, mb: 0.5 }}
          >
            {review.variantName}
          </Typography>

          {/* Rating + Date inline */}
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Rating
              value={ratingValue}
              precision={0.5}
              size="small"
              readOnly
              sx={{
                "& .MuiRating-iconFilled": { color: ratingColor },
              }}
            />
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: ratingColor }}
            >
              {ratingValue.toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              ·{" "}
              {review.createdAt
                ? dateFormatter.format(new Date(review.createdAt))
                : ""}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      {/* ── Row 2: Comment ── */}
      {review.comment && (
        <Box
          sx={{
            mt: 1.5,
            ml: dense ? 0 : `${44 + 12}px`,
            fontSize: "0.9rem",
            lineHeight: 1.75,
            color: isDark ? "rgba(255,255,255,0.85)" : "text.primary",
            "& > p": { lineHeight: 1.75, mb: 1, margin: 0 },
            "& > p:last-child": { mb: 0 },
            "& ul, & ol": { pl: 2, mb: 1 },
            "& li": { mb: 0.5 },
            "& strong": { fontWeight: 700 },
            "& em": { fontStyle: "italic" },
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {review.comment}
          </ReactMarkdown>
        </Box>
      )}

      {commentNeedsClamp && (
        <Button
          variant="text"
          size="small"
          onClick={() => setExpanded((prev) => !prev)}
          sx={{
            ml: dense ? 0 : `${44 + 12}px`,
            mt: 0.5,
            textTransform: "none",
            fontWeight: 600,
            p: 0,
            minWidth: 0,
            fontSize: "0.8rem",
            color: "primary.main",
          }}
        >
          {expanded ? "Thu gọn ▲" : "Xem thêm ▼"}
        </Button>
      )}

      {/* ── Row 3: Images ── */}
      {(review.images?.length || 0) > 0 && (
        <Box
          sx={{
            mt: 1.5,
            ml: dense ? 0 : `${44 + 12}px`,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {(review.images || []).map((image) => (
            <Box
              key={image.id}
              onClick={() => setSelectedImage(image)}
              sx={{
                width: 80,
                height: 80,
                borderRadius: 1.5,
                overflow: "hidden",
                cursor: "zoom-in",
                border: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "scale(1.04)",
                  boxShadow: 4,
                },
              }}
            >
              <img
                src={image.url || ""}
                alt={image.altText || review.variantName || "Review image"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          ))}
        </Box>
      )}


      {/* ── Row 5: Staff reply ── */}
      {(review.staffFeedbackComment || onReply) && (
        <Box
          sx={{
            mt: 1.5,
            ml: dense ? 0 : `${44 + 12}px`,
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)",
            border: "1px solid",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
            <StorefrontIcon sx={{ fontSize: 14, color: "primary.main" }} />
            <Typography
              variant="caption"
              fontWeight={700}
              color="primary.main"
            >
              Phản hồi từ Cửa hàng
            </Typography>
            {review.staffFeedbackAt && (
              <Typography variant="caption" color="text.disabled">
                · {dateFormatter.format(new Date(review.staffFeedbackAt))}
              </Typography>
            )}
          </Stack>

          {!replyOpen && review.staffFeedbackComment && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: "pre-wrap", fontSize: "0.83rem" }}
            >
              {review.staffFeedbackComment}
            </Typography>
          )}

          {replyOpen && onReply && (
            <Stack spacing={1} mt={0.75}>
              <TextField
                multiline
                minRows={2}
                maxRows={6}
                fullWidth
                size="small"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập phản hồi đến khách hàng..."
                disabled={replyLoading}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={replyLoading || replyText.trim().length < 2}
                  onClick={async () => {
                    setReplyLoading(true);
                    try {
                      await onReply(review.id!, replyText.trim());
                      setReplyOpen(false);
                    } finally {
                      setReplyLoading(false);
                    }
                  }}
                  startIcon={
                    replyLoading ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : undefined
                  }
                >
                  Gửi
                </Button>
                <Button
                  size="small"
                  variant="text"
                  disabled={replyLoading}
                  onClick={() => {
                    setReplyText(review.staffFeedbackComment ?? "");
                    setReplyOpen(false);
                  }}
                >
                  Hủy
                </Button>
              </Stack>
            </Stack>
          )}

          {onReply && !replyOpen && (
            <Button
              size="small"
              variant="text"
              sx={{
                mt: review.staffFeedbackComment ? 0.75 : 0,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.78rem",
                p: 0,
                minWidth: 0,
                color: "primary.main",
              }}
              onClick={() => {
                setReplyText(review.staffFeedbackComment ?? "");
                setReplyOpen(true);
              }}
            >
              {review.staffFeedbackComment ? "Sửa phản hồi" : "Phản hồi"}
            </Button>
          )}
        </Box>
      )}

      {/* ── Lightbox ── */}
      <Dialog
        open={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
        maxWidth="md"
        PaperProps={{ sx: { bgcolor: "black", borderRadius: 2 } }}
      >
        <DialogContent sx={{ position: "relative", p: 0 }}>
          <IconButton
            size="small"
            onClick={() => setSelectedImage(null)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(0,0,0,0.55)",
              color: "white",
              zIndex: 1,
              "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          {selectedImage && (
            <Box sx={{ p: 2 }}>
              <img
                src={selectedImage.url || ""}
                alt={selectedImage.altText || "Review image"}
                style={{ width: "100%", height: "auto", borderRadius: 10 }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
