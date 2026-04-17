import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  CircularProgress,
  Skeleton,
  IconButton,
  Alert,
} from "@mui/material";
import { Close, LocalOffer } from "@mui/icons-material";
import {
  voucherService,
  type ApplicableVoucherResponse,
  type ApplicableVoucherCartItemRequest,
} from "@/services/voucherService";

const formatDiscount = (voucher: ApplicableVoucherResponse) => {
  const val = Number(voucher.discountValue ?? 0);
  const type = voucher.discountType;
  if (type === "Percentage" || (type as any) === 2) return `${val}%`;
  return `${val.toLocaleString("vi-VN")}đ`;
};

interface VoucherCardProps {
  voucher: ApplicableVoucherResponse;
  onApply: (code: string) => void;
  isApplying: boolean;
}

const VoucherCard = ({ voucher, onApply, isApplying }: VoucherCardProps) => {
  const isApplicable = voucher.isApplicable;
  const hasReason = !isApplicable && voucher.ineligibleReason;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        opacity: isApplicable ? 1 : 0.7,
        backgroundColor: isApplicable ? "background.paper" : "grey.50",
        borderColor: isApplicable ? "error.main" : "grey.300",
        borderWidth: 1,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          borderColor: isApplicable ? "error.dark" : "grey.300",
          boxShadow: isApplicable ? 1 : 0,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {/* Voucher Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              fontFamily="monospace"
              color={isApplicable ? "text.primary" : "text.disabled"}
              sx={{ fontSize: "0.875rem" }}
            >
              {voucher.code}
            </Typography>
            <Chip
              label={isApplicable ? "Có thể dùng" : "Không khả dụng"}
              size="small"
              color={isApplicable ? "success" : "default"}
              variant="filled"
              sx={{
                height: 20,
                fontSize: "0.7rem",
                fontWeight: 500,
                "& .MuiChip-label": { px: 1 },
              }}
            />
          </Box>

          <Typography
            variant="body2"
            fontWeight={600}
            color={isApplicable ? "error.main" : "text.disabled"}
            sx={{ fontSize: "0.875rem", mb: hasReason ? 0.5 : 0 }}
          >
            Giảm {formatDiscount(voucher)}
          </Typography>

          {hasReason && (
            <Typography
              variant="caption"
              color="warning.dark"
              sx={{
                fontSize: "0.75rem",
                display: "block",
                bgcolor: "warning.50",
                px: 1,
                py: 0.25,
                borderRadius: 0.5,
                border: "1px solid",
                borderColor: "warning.200",
              }}
            >
              {voucher.ineligibleReason}
            </Typography>
          )}
        </Box>

        {/* Apply Button */}
        <Button
          size="small"
          variant={isApplicable ? "contained" : "outlined"}
          color="error"
          disabled={!isApplicable || isApplying}
          onClick={() => voucher.code && onApply(voucher.code)}
          startIcon={isApplying ? <CircularProgress size={12} /> : undefined}
          sx={{
            minWidth: 70,
            height: 32,
            fontSize: "0.75rem",
            fontWeight: 600,
            px: 1.5,
            flexShrink: 0,
            textTransform: "none",
          }}
        >
          {isApplying ? "Đang áp dụng..." : "Áp dụng"}
        </Button>
      </Box>
    </Paper>
  );
};

interface VoucherPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onApplyVoucher: (code: string) => Promise<void>;
  cartItems: ApplicableVoucherCartItemRequest[];
  isApplying: boolean;
}

export const VoucherPickerDialog = ({
  open,
  onClose,
  onApplyVoucher,
  cartItems,
  isApplying,
}: VoucherPickerDialogProps) => {
  const [manualCode, setManualCode] = useState("");
  const [vouchers, setVouchers] = useState<ApplicableVoucherResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApplicableVouchers = async () => {
    if (!open || cartItems.length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await voucherService.getApplicableVouchers(cartItems);
      setVouchers(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách voucher");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadApplicableVouchers();
      setManualCode("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleApplyVoucherCard = async (code: string) => {
    try {
      await onApplyVoucher(code);
      onClose();
    } catch (error) {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" fontWeight={600} color="text.primary">
            Voucher khả dụng
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 2.5, maxHeight: 500 }}>
        <Divider sx={{ mb: 2.5 }} />

        {/* Voucher List */}
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 1.5, fontSize: "0.875rem" }}>
              {error}
            </Alert>
          )}

          {isLoading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[...Array(3)].map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  height={56}
                  sx={{ borderRadius: 1.5 }}
                />
              ))}
            </Box>
          ) : vouchers.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 3,
                color: "text.secondary",
              }}
            >
              <LocalOffer sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">Không có voucher khả dụng</Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {vouchers.map((voucher, index) => (
                <VoucherCard
                  key={voucher.voucherId || index}
                  voucher={voucher}
                  onApply={handleApplyVoucherCard}
                  isApplying={isApplying}
                />
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
