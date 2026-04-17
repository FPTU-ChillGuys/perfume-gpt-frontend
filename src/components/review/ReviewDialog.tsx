import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Rating,
  Box,
  Typography,
  Stack,
  Avatar,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  type ReviewDialogTarget,
  type ReviewResponse,
  type CreateReviewRequest,
  type TemporaryReviewMedia,
} from "@/types/review";
import { productReviewService } from "@/services/reviewService";
import { useToast } from "@/hooks/useToast";

interface ReviewDialogProps {
  open: boolean;
  mode: "create" | "edit";
  target: ReviewDialogTarget | null;
  existingReview?: ReviewResponse | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const RATING_LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Rất tốt"];

const MAX_IMAGES = 5;
const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 1000;

export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  mode,
  target,
  existingReview,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [images, setImages] = useState<File[]>([]);
  const [temporaryMedia, setTemporaryMedia] = useState<TemporaryReviewMedia[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (images.length + files.length > MAX_IMAGES) {
      showToast(`Chỉ có thể tải lên tối đa ${MAX_IMAGES} ảnh`, "warning");
      return;
    }

    const validImages = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        showToast("Chỉ được chọn file ảnh", "warning");
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB
        showToast("Kích thước ảnh không được vượt quá 10MB", "warning");
        return false;
      }
      return true;
    });

    setImages((prev) => [...prev, ...validImages]);

    // Clear input để có thể chọn lại cùng file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!images.length) return [];

    setIsUploadingImages(true);
    try {
      const uploadedMedia =
        await productReviewService.uploadTemporaryImages(images);
      setTemporaryMedia(uploadedMedia);
      return uploadedMedia
        .map((media) => media.id)
        .filter((id): id is string => Boolean(id));
    } catch (error: any) {
      console.error("Error uploading images:", error);
      throw new Error("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleSubmit = async () => {
    if (!target) return;

    if (rating === 0) {
      showToast("Vui lòng chọn số sao đánh giá", "warning");
      return;
    }

    if (!comment.trim()) {
      showToast("Vui lòng nhập nội dung đánh giá", "warning");
      return;
    }

    if (comment.trim().length < MIN_COMMENT_LENGTH) {
      showToast(
        `Nội dung đánh giá phải có ít nhất ${MIN_COMMENT_LENGTH} ký tự`,
        "warning",
      );
      return;
    }

    if (comment.length > MAX_COMMENT_LENGTH) {
      showToast(
        `Nội dung đánh giá không được vượt quá ${MAX_COMMENT_LENGTH} ký tự`,
        "warning",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let temporaryMediaIds: string[] = [];

      if (images.length > 0) {
        temporaryMediaIds = await uploadImages();
      }

      const payload: CreateReviewRequest = {
        orderDetailId: target.orderDetailId,
        rating,
        comment: comment.trim(),
        temporaryMediaIds:
          temporaryMediaIds.length > 0 ? temporaryMediaIds : null,
      };

      if (mode === "create") {
        await productReviewService.createReview(payload);
        showToast("Đánh giá của bạn đã được gửi thành công!", "success");
      } else {
        // Mode edit - tuy chưa có updateReview API, có thể implement sau
        showToast("Chức năng sửa đánh giá đang được phát triển", "info");
      }

      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      const message = error.message || "Có lỗi xảy ra khi gửi đánh giá";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment("");
    setImages([]);
    setTemporaryMedia([]);
    setError(null);
    onClose();
  };

  if (!target) return null;

  const isFormValid =
    rating > 0 &&
    comment.trim().length >= MIN_COMMENT_LENGTH &&
    comment.length <= MAX_COMMENT_LENGTH;
  const canSubmit = isFormValid && !isSubmitting && !isUploadingImages;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              src={target.thumbnailUrl || undefined}
              variant="rounded"
              sx={{ width: 56, height: 56 }}
            >
              📦
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={600}>
                {mode === "create" ? "Viết đánh giá" : "Sửa đánh giá"}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {target.productName || target.variantName}
              </Typography>
            </Box>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Rating */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Đánh giá của bạn *
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Rating
                  value={rating}
                  onChange={(_, newValue) => setRating(newValue || 0)}
                  size="large"
                  precision={1}
                />
                <Typography
                  variant="body2"
                  color="primary.main"
                  fontWeight={500}
                >
                  {RATING_LABELS[rating]}
                </Typography>
              </Stack>
            </Box>

            {/* Comment */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Nhận xét của bạn *
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                error={
                  comment.length > MAX_COMMENT_LENGTH ||
                  (comment.trim().length > 0 &&
                    comment.trim().length < MIN_COMMENT_LENGTH)
                }
                helperText={`${comment.length}/${MAX_COMMENT_LENGTH} ký tự (tối thiểu ${MIN_COMMENT_LENGTH} ký tự)`}
                disabled={isSubmitting}
              />
            </Box>

            {/* Images */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Thêm ảnh (tùy chọn)
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Tối đa {MAX_IMAGES} ảnh, mỗi ảnh không quá 10MB
              </Typography>

              {images.length > 0 && (
                <Box mb={2}>
                  <ImageList cols={3} gap={8} sx={{ maxHeight: 300 }}>
                    {images.map((image, index) => (
                      <ImageListItem key={index}>
                        <Box
                          sx={{
                            width: "100%",
                            height: 120,
                            borderRadius: 1,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "grey.100",
                          }}
                        >
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "100%",
                              objectFit: "contain",
                              borderRadius: 4,
                            }}
                          />
                        </Box>
                        <ImageListItemBar
                          sx={{ borderRadius: "0 0 4px 4px" }}
                          actionIcon={
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveImage(index)}
                              sx={{ color: "white" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          }
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Box>
              )}

              {images.length < MAX_IMAGES && (
                <Button
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting || isUploadingImages}
                  sx={{ textTransform: "none" }}
                >
                  {isUploadingImages ? "Đang tải ảnh..." : "Thêm ảnh"}
                </Button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageSelect}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={
              isSubmitting ? <CircularProgress size={16} /> : undefined
            }
          >
            {isSubmitting
              ? "Đang gửi..."
              : mode === "create"
                ? "Gửi đánh giá"
                : "Cập nhật"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReviewDialog;
