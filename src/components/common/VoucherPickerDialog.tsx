import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Button,
  Box,
  Typography,
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
  const accentColor = isApplicable ? "error.main" : "grey.400";
  const borderColor = isApplicable ? "error.main" : "divider";

  return (
    <Box
      sx={{
        display: "flex",
        borderRadius: 2,
        overflow: "hidden",
        border: "1.5px solid",
        borderColor,
        opacity: isApplicable ? 1 : 0.65,
        boxShadow: isApplicable ? "0 2px 8px rgba(0,0,0,0.07)" : "none",
      }}
    >
      {/* Left panel — same as VoucherSection */}
      <Box
        sx={{
          width: 48,
          minWidth: 48,
          bgcolor: accentColor,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          gap: 0.5,
          py: 2,
        }}
      >
        <LocalOffer sx={{ fontSize: 18 }} />
        <Typography
          variant="caption"
          sx={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 8,
            letterSpacing: 1,
            opacity: 0.9,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          VOUCHER
        </Typography>
      </Box>

      {/* Dashed separator */}
      <Box
        sx={{
          width: 0,
          borderLeft: "2px dashed",
          borderColor: isApplicable ? "error.light" : "grey.300",
          my: 1,
        }}
      />

      {/* Right content */}
      <Box sx={{ flex: 1, px: 1.5, py: 1.25 }}>
        {/* Code + status chip */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 0.5,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} letterSpacing={0.5}>
            {voucher.code}
          </Typography>
          <Chip
            label={isApplicable ? "Có thể dùng" : "Không khả dụng"}
            size="small"
            color={isApplicable ? "success" : "default"}
            sx={{ fontSize: "0.68rem", height: 20 }}
          />
        </Box>

        {/* Discount */}
        <Typography
          variant="h6"
          fontWeight={800}
          color={isApplicable ? "error.main" : "text.disabled"}
          sx={{ lineHeight: 1.2 }}
        >
          Giảm {formatDiscount(voucher)}
        </Typography>

        {/* Ineligible reason */}
        {hasReason && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.5,
              color: "warning.dark",
              bgcolor: "warning.50",
              border: "1px solid",
              borderColor: "warning.200",
              borderRadius: 0.5,
              px: 1,
              py: 0.25,
            }}
          >
            {voucher.ineligibleReason}
          </Typography>
        )}

        <Divider sx={{ my: 0.75 }} />

        {/* Apply button */}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            size="small"
            variant={isApplicable ? "contained" : "outlined"}
            color="error"
            disabled={!isApplicable || isApplying}
            onClick={() => voucher.code && onApply(voucher.code)}
            startIcon={
              isApplying ? (
                <CircularProgress size={14} color="inherit" />
              ) : undefined
            }
            sx={{ fontSize: 12, fontWeight: 600 }}
          >
            {isApplying ? "Đang áp dụng..." : "Áp dụng"}
          </Button>
        </Box>
      </Box>
    </Box>
  );


  return (
    <Box
      sx={{
        display: "flex",
        borderRadius: 2,
        overflow: "visible",
        border: "1px solid",
        borderColor,
        bgcolor: isApplicable ? "#fff" : "grey.50",
        position: "relative",
        opacity: isApplicable ? 1 : 0.75,
        transition: "box-shadow 0.2s",
        "&:hover": {
          boxShadow: isApplicable ? "0 2px 12px rgba(0,0,0,0.10)" : "none",
        },
        // Top notch
        "&::before": {
          content: '""',
          position: "absolute",
          top: -6,
          left: 55,
          width: 12,
          height: 12,
          borderRadius: "50%",
          bgcolor: "background.default",
          border: "1px solid",
          borderColor,
          zIndex: 1,
        },
        // Bottom notch
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: -6,
          left: 55,
          width: 12,
          height: 12,
          borderRadius: "50%",
          bgcolor: "background.default",
          border: "1px solid",
          borderColor,
          zIndex: 1,
        },
      }}
    >
      {/* Left strip */}
      <Box
        sx={{
          width: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          bgcolor: accentColor,
          borderRadius: "8px 0 0 8px",
        }}
      >
        <LocalOffer sx={{ color: "#fff", fontSize: 22 }} />
      </Box>

      {/* Dashed separator */}
      <Box
        sx={{
          width: "1px",
          borderLeft: "1.5px dashed",
          borderColor,
          flexShrink: 0,
        }}
      />

      {/* Right: info + action */}
      <Box
        sx={{
          flex: 1,
          px: 1.5,
          py: 1.25,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        {/* Voucher details */}
        <Box flex={1} minWidth={0}>
          {/* Code + chip row */}
          <Box display="flex" alignItems="center" gap={0.75} mb={0.4} flexWrap="wrap">
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "0.82rem",
                fontFamily: "monospace",
                letterSpacing: 0.5,
                color: isApplicable ? "text.primary" : "text.disabled",
              }}
            >
              {voucher.code}
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 0.75,
                py: 0.15,
                borderRadius: "10px",
                bgcolor: isApplicable ? "success.50" : "grey.100",
                border: "1px solid",
                borderColor: isApplicable ? "success.200" : "grey.300",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: isApplicable ? "success.dark" : "text.disabled",
                  lineHeight: 1.4,
                }}
              >
                {isApplicable ? "✓ Có thể dùng" : "Không khả dụng"}
              </Typography>
            </Box>
          </Box>

          {/* Discount label */}
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.875rem",
              color: isApplicable ? "error.main" : "text.disabled",
              mb: hasReason ? 0.5 : 0,
            }}
          >
            Giảm {formatDiscount(voucher)}
          </Typography>

          {/* Ineligible reason */}
          {hasReason && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontSize: "0.72rem",
                color: "warning.dark",
                bgcolor: "warning.50",
                border: "1px solid",
                borderColor: "warning.200",
                borderRadius: 0.75,
                px: 1,
                py: 0.25,
              }}
            >
              {voucher.ineligibleReason}
            </Typography>
          )}
        </Box>

        {/* Apply button */}
        <Button
          size="small"
          variant={isApplicable ? "contained" : "outlined"}
          color="error"
          disabled={!isApplicable || isApplying}
          onClick={() => voucher.code && onApply(voucher.code)}
          startIcon={isApplying ? <CircularProgress size={12} color="inherit" /> : undefined}
          sx={{
            minWidth: 76,
            height: 34,
            fontSize: "0.78rem",
            fontWeight: 600,
            px: 1.5,
            flexShrink: 0,
            textTransform: "none",
            borderRadius: "8px",
          }}
        >
          {isApplying ? "" : "Áp dụng"}
        </Button>
      </Box>
    </Box>
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
