import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import type {
  DiscountType,
  PromotionType,
  VoucherType,
} from "@/services/campaignService";
import {
  createEmptyVoucherDraft,
  type CampaignVoucherDraft,
} from "./campaignTypes";

// ─── Constants ──────────────────────────────────────────────────────
const PROMOTION_TYPE_OPTIONS: Array<{ value: PromotionType; label: string }> = [
  { value: "Clearance", label: "Xả kho" },
  { value: "NewArrival", label: "Hàng mới về" },
  { value: "Regular", label: "Thông thường" },
];

const VOUCHER_APPLY_TYPE_OPTIONS: Array<{ value: VoucherType; label: string }> =
  [
    { value: "Product", label: "Theo sản phẩm" },
    { value: "Order", label: "Theo đơn hàng" },
  ];

const DISCOUNT_TYPE_OPTIONS: Array<{ value: DiscountType; label: string }> = [
  { value: "Percentage", label: "Phần trăm (%)" },
  { value: "FixedAmount", label: "Số tiền cố định" },
];

const formatNumberVN = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("vi-VN");
};

const parseNumberVN = (value: string): string => {
  return value.replace(/\./g, "");
};

// ─── Props ──────────────────────────────────────────────────────────
type VoucherFormProps = {
  vouchers: CampaignVoucherDraft[];
  onVouchersChange: (vouchers: CampaignVoucherDraft[]) => void;
};

export const VoucherForm = ({
  vouchers,
  onVouchersChange,
}: VoucherFormProps) => {
  const addVoucher = () => {
    onVouchersChange([...vouchers, createEmptyVoucherDraft()]);
  };

  const removeVoucher = (key: string) => {
    const next = vouchers.filter((v) => v.key !== key);
    onVouchersChange(next.length > 0 ? next : [createEmptyVoucherDraft()]);
  };

  const updateField = <K extends keyof CampaignVoucherDraft>(
    key: string,
    field: K,
    value: CampaignVoucherDraft[K],
  ) => {
    onVouchersChange(
      vouchers.map((v) => {
        if (v.key !== key) return v;

        if (field === "applyType") {
          const nextApplyType = value as VoucherType;
          return {
            ...v,
            applyType: nextApplyType,
            targetItemType:
              nextApplyType === "Product" ? v.targetItemType || "Regular" : "",
          };
        }

        if (field === "isMemberOnly") {
          const isMember = value as boolean;
          return {
            ...v,
            isMemberOnly: isMember,
            // When turning off isMemberOnly, clear maxUsagePerUser
            maxUsagePerUserInput: isMember ? v.maxUsagePerUserInput : "",
          };
        }

        return { ...v, [field]: value };
      }),
    );
  };

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, bgcolor: "grey.50", borderStyle: "dashed" }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Voucher kèm theo (tùy chọn)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Voucher là tính năng bổ sung. Để trống mã voucher nếu không cần.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={addVoucher}
          >
            Thêm Voucher
          </Button>
        </Stack>

        <Stack spacing={2}>
          {vouchers.map((voucher, index) => {
            const isProductVoucher = voucher.applyType === "Product";
            const isPercentage = voucher.discountType === "Percentage";

            return (
              <Paper
                key={voucher.key}
                variant="outlined"
                sx={{ p: 2, position: "relative" }}
              >
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeVoucher(voucher.key)}
                  sx={{ position: "absolute", top: 8, right: 8 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>

                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Voucher #{index + 1}
                </Typography>

                {/* Hàng 1: 4 ô chính */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "1fr 1fr 1fr 1fr",
                    },
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <TextField
                    label="Mã voucher"
                    size="small"
                    placeholder="VD: FLASH30"
                    value={voucher.code}
                    onChange={(e) =>
                      updateField(voucher.key, "code", e.target.value)
                    }
                    fullWidth
                  />

                  <FormControl size="small" fullWidth>
                    <InputLabel>Kiểu giảm</InputLabel>
                    <Select
                      label="Kiểu giảm"
                      value={voucher.discountType}
                      onChange={(e) =>
                        updateField(
                          voucher.key,
                          "discountType",
                          e.target.value as DiscountType,
                        )
                      }
                    >
                      {DISCOUNT_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Giá trị giảm"
                    size="small"
                    value={
                      isPercentage
                        ? voucher.discountValueInput
                        : formatNumberVN(voucher.discountValueInput)
                    }
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (isPercentage) {
                        // Validate percentage input
                        if (!/^\d*([.,]\d{0,2})?$/.test(nextValue)) return;

                        // Check if value exceeds 100%
                        const numValue = Number(nextValue.replace(",", "."));
                        if (numValue > 100) {
                          return; // Don't update if > 100%
                        }

                        updateField(
                          voucher.key,
                          "discountValueInput",
                          nextValue,
                        );
                      } else {
                        const parsed = parseNumberVN(nextValue);
                        if (!/^\d*$/.test(parsed)) return;
                        updateField(voucher.key, "discountValueInput", parsed);
                      }
                    }}
                    placeholder={isPercentage ? "VD: 20" : "VD: 500.000"}
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
                    label="Giảm tối đa (VND)"
                    size="small"
                    value={formatNumberVN(voucher.maxDiscountAmountInput)}
                    onChange={(e) => {
                      const parsed = parseNumberVN(e.target.value);
                      if (!/^\d*$/.test(parsed)) return;
                      updateField(
                        voucher.key,
                        "maxDiscountAmountInput",
                        parsed,
                      );
                    }}
                    placeholder="VD: 100.000"
                    disabled={!isPercentage}
                    fullWidth
                  />
                </Box>

                {/* Hàng 2: 4 ô tiếp theo */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "1fr 1fr 1fr 1fr",
                    },
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <TextField
                    label="Đơn tối thiểu (VND)"
                    size="small"
                    value={formatNumberVN(voucher.minOrderValueInput)}
                    onChange={(e) => {
                      const parsed = parseNumberVN(e.target.value);
                      if (!/^\d*$/.test(parsed)) return;
                      updateField(voucher.key, "minOrderValueInput", parsed);
                    }}
                    placeholder="VD: 500.000"
                    fullWidth
                  />

                  <TextField
                    label="Số lượng mã"
                    size="small"
                    value={voucher.totalQuantityInput}
                    onChange={(e) => {
                      if (!/^\d*$/.test(e.target.value)) return;
                      updateField(
                        voucher.key,
                        "totalQuantityInput",
                        e.target.value,
                      );
                    }}
                    placeholder="VD: 500"
                    fullWidth
                  />

                  <FormControl size="small" fullWidth>
                    <InputLabel>Áp dụng</InputLabel>
                    <Select
                      label="Áp dụng"
                      value={voucher.applyType}
                      onChange={(e) =>
                        updateField(
                          voucher.key,
                          "applyType",
                          e.target.value as VoucherType,
                        )
                      }
                    >
                      {VOUCHER_APPLY_TYPE_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth>
                    <InputLabel>Loại item</InputLabel>
                    <Select
                      label="Loại item"
                      value={voucher.targetItemType}
                      disabled={!isProductVoucher}
                      onChange={(e) =>
                        updateField(
                          voucher.key,
                          "targetItemType",
                          e.target.value as PromotionType,
                        )
                      }
                    >
                      {PROMOTION_TYPE_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Hàng 3: Switch và field bổ sung */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: voucher.isMemberOnly ? "1fr 1fr" : "1fr",
                      md: voucher.isMemberOnly ? "1fr 1fr" : "1fr",
                    },
                    gap: 2,
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={voucher.isMemberOnly}
                          onChange={(e) =>
                            updateField(
                              voucher.key,
                              "isMemberOnly",
                              e.target.checked,
                            )
                          }
                        />
                      }
                      label="Chỉ thành viên"
                    />
                  </Box>

                  {/* maxUsagePerUser - only shown when isMemberOnly is true */}
                  {voucher.isMemberOnly && (
                    <TextField
                      label="Lượt/khách"
                      size="small"
                      value={voucher.maxUsagePerUserInput}
                      onChange={(e) => {
                        if (!/^\d*$/.test(e.target.value)) return;
                        updateField(
                          voucher.key,
                          "maxUsagePerUserInput",
                          e.target.value,
                        );
                      }}
                      placeholder="VD: 1"
                      fullWidth
                    />
                  )}
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </Stack>
    </Paper>
  );
};
