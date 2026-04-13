import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import type { PosBatchDetail } from "@/services/posService";

interface BatchSelectionModalProps {
  open: boolean;
  loading: boolean;
  mode?: "add" | "switch";
  variantName: string;
  currentBatchCode?: string;
  batches: PosBatchDetail[];
  onClose: () => void;
  onSelectBatch: (batch: PosBatchDetail) => void;
}

const formatExpiryLabel = (batch: PosBatchDetail) => {
  if (batch.isExpired) return "Đã hết hạn";

  if (typeof batch.daysUntilExpiry !== "number") {
    return "Không rõ hạn dùng";
  }

  if (batch.daysUntilExpiry < 0) return "Đã hết hạn";
  if (batch.daysUntilExpiry === 0) return "Hết hạn hôm nay";

  return `Còn ${batch.daysUntilExpiry} ngày`;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN").format(parsed);
};

export const BatchSelectionModal = ({
  open,
  loading,
  mode = "add",
  variantName,
  currentBatchCode,
  batches,
  onClose,
  onSelectBatch,
}: BatchSelectionModalProps) => {
  const title = mode === "switch" ? "Đổi batch cho sản phẩm" : "Chọn batch";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            px: 1.5,
            py: 1.25,
            mb: 2,
            bgcolor: "grey.50",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Sản phẩm
          </Typography>
          <Typography variant="body1" fontWeight={700}>
            {variantName || "Sản phẩm"}
          </Typography>
        </Box>

        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" py={2}>
            <CircularProgress size={18} />
            <Typography variant="body2">Đang tải danh sách batch...</Typography>
          </Stack>
        ) : batches.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Không có batch phù hợp để bán.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {batches.map((batch) => {
              const remaining = Number(batch.remainingQuantity ?? 0);
              const isCurrent = currentBatchCode === batch.batchCode;
              const disabled = remaining <= 0 || Boolean(batch.isExpired);
              const actionDisabled =
                disabled || (mode === "switch" && isCurrent);

              return (
                <Box
                  key={batch.id || batch.batchCode}
                  sx={{
                    border: "1px solid",
                    borderColor: isCurrent ? "primary.main" : "divider",
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: isCurrent ? "primary.50" : "background.paper",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    spacing={1.5}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Mã batch
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        lineHeight={1.2}
                      >
                        {batch.batchCode}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        sx={{ mt: 0.75 }}
                      >
                        <Chip
                          size="small"
                          color={remaining > 0 ? "success" : "default"}
                          label={`Tồn kho: ${remaining}`}
                        />
                        <Chip
                          size="small"
                          color={batch.isExpired ? "error" : "info"}
                          label={formatExpiryLabel(batch)}
                        />
                        {isCurrent && (
                          <Chip
                            size="small"
                            color="primary"
                            label="Batch đang chọn"
                          />
                        )}
                      </Stack>

                      <Stack direction="row" spacing={2} mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          NSX: {formatDate(batch.manufactureDate)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          HSD: {formatDate(batch.expiryDate)}
                        </Typography>
                      </Stack>
                    </Box>

                    <Button
                      variant="contained"
                      size="small"
                      disabled={actionDisabled}
                      onClick={() => onSelectBatch(batch)}
                    >
                      {mode === "switch"
                        ? "Đổi sang batch này"
                        : "Thêm batch này"}
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};
