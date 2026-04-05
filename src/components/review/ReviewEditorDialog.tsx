import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Rating,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { useToast } from "@/hooks/useToast";
import { productReviewService } from "@/services/reviewService";
import type {
  ReviewResponse,
  TemporaryReviewMedia,
  ReviewDialogTarget,
} from "@/types/review";

interface ReviewEditorDialogProps {
  open: boolean;
  mode: "create" | "edit";
  target?: ReviewDialogTarget | null;
  initialReview?: ReviewResponse | null;
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

const MAX_IMAGES = 6;

export const ReviewEditorDialog = ({
  open,
  mode,
  target,
  initialReview,
  onClose,
  onSuccess,
}: ReviewEditorDialogProps) => {
  const { showToast } = useToast();
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState("");
  const [existingImages, setExistingImages] = useState(
    initialReview?.images || [],
  );
  const [mediaIdsToDelete, setMediaIdsToDelete] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<TemporaryReviewMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRating(initialReview?.rating ?? 5);
      setComment(initialReview?.comment ?? "");
      setExistingImages(initialReview?.images || []);
      setMediaIdsToDelete([]);
      setNewImages([]);
      setFormError(null);
    } else {
      setUploading(false);
      setIsSubmitting(false);
    }
  }, [open, initialReview]);

  const remainingSlots = useMemo(() => {
    return MAX_IMAGES - existingImages.length - newImages.length;
  }, [existingImages.length, newImages.length]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !target) return;

    if (remainingSlots <= 0) {
      setFormError(`Bạn chỉ có thể tải tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    const fileList = Array.from(files).slice(0, remainingSlots);
    if (!fileList.length) return;

    try {
      setUploading(true);
      setFormError(null);
      const uploaded =
        await productReviewService.uploadTemporaryImages(fileList);
      setNewImages((prev) => [
        ...prev,
        ...uploaded.filter(
          (item): item is TemporaryReviewMedia & { id: string } =>
            Boolean(item.id),
        ),
      ]);
      showToast("Đã tải ảnh thành công", "success");
    } catch (err: any) {
      setFormError(err.message || "Không thể tải ảnh lên");
      showToast(err.message || "Không thể tải ảnh lên", "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveExisting = (id?: string) => {
    if (!id) return;
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setMediaIdsToDelete((prev) => [...prev, id]);
  };

  const handleRemoveNew = (id?: string) => {
    if (!id) return;
    setNewImages((prev) => prev.filter((img) => img.id !== id));
  };

  const validate = () => {
    if (!target?.orderDetailId && mode === "create") {
      setFormError("Không xác định được sản phẩm để đánh giá");
      return false;
    }
    if (!rating || rating < 1) {
      setFormError("Vui lòng chọn số sao");
      return false;
    }
    if (!comment.trim()) {
      setFormError("Hãy chia sẻ trải nghiệm của bạn");
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      if (mode === "create" && target) {
        await productReviewService.createReview({
          orderDetailId: target.orderDetailId,
          rating: rating || 0,
          comment: comment.trim(),
          temporaryMediaIds: newImages.map((img) => img.id!).filter(Boolean),
        });
        showToast("Đã gửi đánh giá, vui lòng chờ duyệt", "success");
      } else if (initialReview?.id) {
        await productReviewService.updateReview(initialReview.id, {
          rating: rating || 0,
          comment: comment.trim(),
          temporaryMediaIds: newImages.map((img) => img.id!).filter(Boolean),
        });
        showToast("Đã cập nhật đánh giá", "success");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Không thể gửi đánh giá");
      showToast(err.message || "Không thể gửi đánh giá", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerText =
    mode === "create" ? "Chia sẻ cảm nhận của bạn" : "Cập nhật đánh giá";
  const subTitle =
    target?.productName || initialReview?.variantName || "Sản phẩm";
  const thumbnail =
    target?.thumbnailUrl || existingImages[0]?.url || newImages[0]?.url;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "grey.100",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={subTitle}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <CameraAltIcon color="disabled" />
            )}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {headerText}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subTitle}
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 12, right: 12 }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Mức độ hài lòng
            </Typography>
            <Rating
              value={rating}
              precision={1}
              size="large"
              onChange={(_, value) => setRating(value)}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Cảm nhận của bạn
            </Typography>
            <TextField
              multiline
              minRows={4}
              fullWidth
              placeholder="Hương thơm lưu lâu, cảm giác thế nào..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </Box>

          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Hình ảnh thực tế ({existingImages.length + newImages.length}/
                {MAX_IMAGES})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={
                  uploading ? (
                    <CircularProgress size={18} />
                  ) : (
                    <CloudUploadIcon />
                  )
                }
                disabled={uploading || remainingSlots <= 0}
              >
                Tải ảnh
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  multiple
                  onChange={handleUpload}
                />
              </Button>
            </Stack>

            {existingImages.length > 0 || newImages.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {existingImages.map((image) => (
                  <Box key={image.id} sx={{ position: "relative" }}>
                    <img
                      src={image.url || ""}
                      alt={image.altText || "Review"}
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: 12,
                        objectFit: "cover",
                        border: "1px solid #eee",
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveExisting(image.id)}
                      sx={{
                        position: "absolute",
                        top: -10,
                        right: -10,
                        bgcolor: "background.paper",
                        boxShadow: 1,
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                {newImages.map((image) => (
                  <Box key={image.id} sx={{ position: "relative" }}>
                    <img
                      src={image.url || ""}
                      alt="New upload"
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: 12,
                        objectFit: "cover",
                        border: "1px solid #eee",
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveNew(image.id)}
                      sx={{
                        position: "absolute",
                        top: -10,
                        right: -10,
                        bgcolor: "background.paper",
                        boxShadow: 1,
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={
                  uploading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <CloudUploadIcon />
                  )
                }
                disabled={uploading || remainingSlots <= 0}
                sx={{ py: 2, borderStyle: "dashed", color: "text.secondary" }}
              >
                Thêm ảnh thực tế (tối đa {MAX_IMAGES})
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  multiple
                  onChange={handleUpload}
                />
              </Button>
            )}
          </Box>

          {formError && <Alert severity="error">{formError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Huỷ bỏ
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || uploading}
        >
          {isSubmitting
            ? "Đang gửi..."
            : mode === "create"
              ? "Gửi đánh giá"
              : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
