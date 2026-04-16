import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { DiscountType, PromotionType } from "@/services/campaignService";

const PROMOTION_TYPE_OPTIONS: Array<{ value: PromotionType; label: string }> = [
  { value: "Clearance", label: "Xả kho" },
  { value: "NewArrival", label: "Hàng mới về" },
  { value: "Regular", label: "Thông thường" },
];

const DISCOUNT_TYPE_OPTIONS: Array<{ value: DiscountType; label: string }> = [
  { value: "Percentage", label: "Phần trăm (%)" },
  { value: "FixedAmount", label: "Số tiền cố định" },
];

export type BulkConfigValues = {
  promotionType: PromotionType;
  discountType: DiscountType;
  discountValue: string;
  maxUsage: string;
};

type BulkConfigModalProps = {
  open: boolean;
  selectedCount: number;
  onClose: () => void;
  onApply: (values: BulkConfigValues) => void;
};

const formatNumberVN = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("vi-VN");
};

const parseNumberVN = (value: string): string => {
  return value.replace(/\./g, "");
};

export const BulkConfigModal = ({
  open,
  selectedCount,
  onClose,
  onApply,
}: BulkConfigModalProps) => {
  const [config, setConfig] = useState<BulkConfigValues>({
    promotionType: "Clearance",
    discountType: "Percentage",
    discountValue: "",
    maxUsage: "1",
  });

  const handleApply = () => {
    onApply(config);
    setConfig({
      promotionType: "Clearance",
      discountType: "Percentage",
      discountValue: "",
      maxUsage: "1",
    });
  };

  const isPercentage = config.discountType === "Percentage";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Cấu hình chung cho {selectedCount} sản phẩm đã chọn
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Các giá trị dưới đây sẽ được áp dụng đồng loạt cho tất cả sản phẩm
          đang được chọn.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <FormControl fullWidth>
            <InputLabel>Loại khuyến mãi</InputLabel>
            <Select
              label="Loại khuyến mãi"
              value={config.promotionType}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  promotionType: e.target.value as PromotionType,
                }))
              }
            >
              {PROMOTION_TYPE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Kiểu giảm</InputLabel>
            <Select
              label="Kiểu giảm"
              value={config.discountType}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  discountType: e.target.value as DiscountType,
                  discountValue: "",
                }))
              }
            >
              {DISCOUNT_TYPE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Giá trị giảm"
            required
            value={
              isPercentage
                ? config.discountValue
                : formatNumberVN(config.discountValue)
            }
            onChange={(e) => {
              const val = e.target.value;
              if (isPercentage) {
                if (!/^\d*([.,]\d{0,2})?$/.test(val)) return;
                setConfig((c) => ({ ...c, discountValue: val }));
              } else {
                const parsed = parseNumberVN(val);
                if (!/^\d*$/.test(parsed)) return;
                setConfig((c) => ({ ...c, discountValue: parsed }));
              }
            }}
            placeholder={isPercentage ? "VD: 20" : "VD: 50.000"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {isPercentage ? "%" : "VND"}
                </InputAdornment>
              ),
            }}
            fullWidth
          />

          <TextField
            label="SL tối đa (maxUsage)"
            value={formatNumberVN(config.maxUsage)}
            onChange={(e) => {
              const parsed = parseNumberVN(e.target.value);
              if (!/^\d*$/.test(parsed)) return;
              setConfig((c) => ({ ...c, maxUsage: parsed }));
            }}
            placeholder="VD: 1.000"
            helperText="Áp dụng cho item không chọn lô. Item theo lô sẽ là null."
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={handleApply}>
          Áp dụng
        </Button>
      </DialogActions>
    </Dialog>
  );
};
