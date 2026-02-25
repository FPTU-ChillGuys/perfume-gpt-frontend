import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Alert,
} from "@mui/material";
import type { OrderStatus } from "@/types/order";
import { orderStatusLabels } from "@/utils/orderStatus";

interface UpdateOrderStatusDialogProps {
  open: boolean;
  currentStatus: OrderStatus;
  orderId: string;
  onClose: () => void;
  onConfirm: (status: OrderStatus, note?: string) => Promise<void>;
}

// Define allowed status transitions
const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Processing", "Canceled"],
  Processing: ["Delivering", "Canceled"],
  Delivering: ["Delivered", "Returned"],
  Delivered: [],
  Canceled: [],
  Returned: [],
};

export const UpdateOrderStatusDialog = ({
  open,
  currentStatus,
  orderId,
  onClose,
  onConfirm,
}: UpdateOrderStatusDialogProps) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedStatus("");
      setNote("");
      setError("");
      setIsSubmitting(false);
    }
  }, [open]);

  const availableStatuses = allowedTransitions[currentStatus] || [];

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedStatus("");
      setNote("");
      setError("");
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError("Vui lòng chọn trạng thái mới");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onConfirm(selectedStatus as OrderStatus, note || undefined);
      // Close dialog after successful update
      handleClose();
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật trạng thái");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          Cập nhật trạng thái đơn hàng
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Mã đơn hàng: <strong>{orderId.substring(0, 8)}...</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Trạng thái hiện tại:{" "}
            <strong>{orderStatusLabels[currentStatus]}</strong>
          </Typography>

          {availableStatuses.length === 0 ? (
            <Alert severity="warning">
              Đơn hàng đã ở trạng thái cuối cùng, không thể cập nhật thêm.
            </Alert>
          ) : (
            <>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Trạng thái mới *</InputLabel>
                <Select
                  value={selectedStatus}
                  label="Trạng thái mới *"
                  onChange={(e) => {
                    setSelectedStatus(e.target.value as OrderStatus);
                    setError("");
                  }}
                  disabled={isSubmitting}
                >
                  {availableStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {orderStatusLabels[status]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Ghi chú"
                placeholder="Nhập ghi chú (không bắt buộc)"
                multiline
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Hủy
        </Button>
        {availableStatuses.length > 0 && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedStatus}
            color="primary"
          >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
