import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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

export type SplitBulkConfigValues = {
  product?: BulkConfigValues;
  batch?: Omit<BulkConfigValues, "maxUsage">;
};

type BulkConfigModalProps = {
  open: boolean;
  productCount: number;
  batchCount: number;
  onClose: () => void;
  onApply: (values: SplitBulkConfigValues) => void;
};

const formatNumberVN = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("vi-VN");
};

const parseNumberVN = (value: string): string => {
  return value.replace(/\./g, "");
};

const DEFAULT_CONFIG: BulkConfigValues = {
  promotionType: "Clearance",
  discountType: "Percentage",
  discountValue: "",
  maxUsage: "1",
};

/* ── Reusable config section ───────────────────────────────────────── */
const ConfigSection = ({
  config,
  onChange,
  showMaxUsage,
}: {
  config: BulkConfigValues;
  onChange: (next: BulkConfigValues) => void;
  showMaxUsage: boolean;
}) => {
  const isPercentage = config.discountType === "Percentage";

  return (
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
            onChange({
              ...config,
              promotionType: e.target.value as PromotionType,
            })
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
            onChange({
              ...config,
              discountType: e.target.value as DiscountType,
              discountValue: "",
            })
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
            if (val !== "" && Number(val.replace(",", ".")) > 100) return;
            onChange({ ...config, discountValue: val });
          } else {
            const parsed = parseNumberVN(val);
            if (!/^\d*$/.test(parsed)) return;
            onChange({ ...config, discountValue: parsed });
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

      {showMaxUsage && (
        <TextField
          label="SL tối đa (maxUsage)"
          value={formatNumberVN(config.maxUsage)}
          onChange={(e) => {
            const parsed = parseNumberVN(e.target.value);
            if (!/^\d*$/.test(parsed)) return;
            onChange({ ...config, maxUsage: parsed });
          }}
          placeholder="VD: 1.000"
          helperText="Để trống hoặc 0 = không giới hạn."
          fullWidth
        />
      )}
    </Box>
  );
};

/* ── Modal ──────────────────────────────────────────────── */
export const BulkConfigModal = ({
  open,
  productCount,
  batchCount,
  onClose,
  onApply,
}: BulkConfigModalProps) => {
  const [productConfig, setProductConfig] =
    useState<BulkConfigValues>(DEFAULT_CONFIG);
  const [batchConfig, setBatchConfig] =
    useState<BulkConfigValues>(DEFAULT_CONFIG);

  const totalCount = productCount + batchCount;

  const handleApply = () => {
    const result: SplitBulkConfigValues = {};
    if (productCount > 0) result.product = productConfig;
    if (batchCount > 0)
      result.batch = {
        promotionType: batchConfig.promotionType,
        discountType: batchConfig.discountType,
        discountValue: batchConfig.discountValue,
      };
    onApply(result);
    setProductConfig(DEFAULT_CONFIG);
    setBatchConfig(DEFAULT_CONFIG);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cấu hình chung cho {totalCount} mục đã chọn</DialogTitle>
      <DialogContent>
        {productCount > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Sản phẩm (toàn bộ tồn kho) — {productCount} mục
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Áp dụng đồng loạt cho các sản phẩm không chọn theo lô.
            </Typography>
            <ConfigSection
              config={productConfig}
              onChange={setProductConfig}
              showMaxUsage
            />
          </>
        )}

        {productCount > 0 && batchCount > 0 && <Divider sx={{ my: 3 }} />}

        {batchCount > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Lô hàng — {batchCount} mục
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Áp dụng đồng loạt cho các lô hàng. SL tối đa do lô quy định.
            </Typography>
            <ConfigSection
              config={batchConfig}
              onChange={setBatchConfig}
              showMaxUsage={false}
            />
          </>
        )}
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
