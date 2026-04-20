import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useToast } from "@/hooks/useToast";
import {
  campaignService,
  type CampaignType,
  type CreateCampaignRequest,
  type DiscountType,
  type PromotionType,
} from "@/services/campaignService";
import { BulkConfigModal, type SplitBulkConfigValues } from "./BulkConfigModal";
import {
  BulkItemSelector,
  type SelectedCampaignItem,
} from "./BulkItemSelector";
import { VoucherForm } from "./VoucherForm";
import {
  createEmptyVoucherDraft,
  type CampaignVoucherDraft,
} from "./campaignTypes";

// ─── Constants ──────────────────────────────────────────────────────

const PROMOTION_TYPE_LABEL: Record<PromotionType, string> = {
  Clearance: "Xả kho",
  NewArrival: "Hàng mới về",
  Regular: "Thông thường",
};

const PROMOTION_TYPE_OPTIONS: Array<{ value: PromotionType; label: string }> = [
  { value: "Clearance", label: "Xả kho" },
  { value: "NewArrival", label: "Hàng mới về" },
  { value: "Regular", label: "Thông thường" },
];

const DISCOUNT_TYPE_OPTIONS: Array<{ value: DiscountType; label: string }> = [
  { value: "Percentage", label: "Phần trăm (%)" },
  { value: "FixedAmount", label: "Số tiền cố định" },
];

const DEFAULT_END_TIME = "23:59";

const toLocalDateTime = (
  dateValue: string,
  timeValue: string,
  withFraction = false,
) => {
  if (!dateValue || !timeValue) return "";
  const localDate = new Date(`${dateValue}T${timeValue}:00`);
  localDate.setHours(localDate.getHours() - 7);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  const hours = String(localDate.getHours()).padStart(2, "0");
  const minutes = String(localDate.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:00${withFraction ? ".00" : ""}`;
};

const formatNumberVN = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("vi-VN");
};

const parseNumberVN = (value: string): string => {
  return value.replace(/\./g, "");
};

// ─── Types ──────────────────────────────────────────────────────────

type CreateTab = "info" | "items" | "vouchers";
type ItemsSubTab = "all" | "product" | "batch";

type CampaignCreateViewProps = {
  onBack: () => void;
  onCreated: () => void;
};

// ─── Component ──────────────────────────────────────────────────────

export const CampaignCreateView = ({
  onBack,
  onCreated,
}: CampaignCreateViewProps) => {
  const { showToast } = useToast();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<CreateTab>("info");

  // ── Form state ──
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    type: "FlashSale" as CampaignType,
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: DEFAULT_END_TIME,
  });
  const [isEndTimeManuallyEdited, setIsEndTimeManuallyEdited] = useState(false);

  // ── Items state ──
  const [selectedItems, setSelectedItems] = useState<SelectedCampaignItem[]>(
    [],
  );
  const [itemSelectorOpen, setItemSelectorOpen] = useState(false);
  const [itemsSubTab, setItemsSubTab] = useState<ItemsSubTab>("all");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(0);
  const [itemsRowsPerPage, setItemsRowsPerPage] = useState(10);

  // ── Voucher state ──
  const [campaignVouchers, setCampaignVouchers] = useState<
    CampaignVoucherDraft[]
  >([createEmptyVoucherDraft()]);

  // ── Submission state ──
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // ── Derived data ──
  const selectedSummary = useMemo(() => {
    const batchItems = selectedItems.filter((item) => item.batchId);
    const productItems = selectedItems.filter((item) => !item.batchId);
    return {
      total: selectedItems.length,
      batchCount: batchItems.length,
      productCount: productItems.length,
    };
  }, [selectedItems]);

  const filteredSelectedItems = useMemo(() => {
    if (itemsSubTab === "product")
      return selectedItems.filter((item) => !item.batchId);
    if (itemsSubTab === "batch")
      return selectedItems.filter((item) => Boolean(item.batchId));
    return selectedItems;
  }, [selectedItems, itemsSubTab]);

  const selectedPromotionTypes = useMemo(() => {
    const typeSet = new Set<PromotionType>();
    selectedItems.forEach((item) => typeSet.add(item.promotionType));
    return Array.from(typeSet);
  }, [selectedItems]);

  // ── Validation ──
  const isInfoValid =
    createForm.name.trim().length > 0 &&
    createForm.startDate.length > 0 &&
    createForm.startTime.length > 0 &&
    createForm.endDate.length > 0 &&
    createForm.endTime.length > 0;

  const isItemsValid = selectedItems.length > 0;

  const canCreate = isInfoValid && isItemsValid;

  // ── Handlers ──

  const removeSelectedItem = (key: string) => {
    setSelectedItems((current) => current.filter((item) => item.key !== key));
  };

  const handleSelectedItemFieldChange = (
    key: string,
    field: keyof SelectedCampaignItem,
    value: string,
  ) => {
    setSelectedItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleBulkEditApply = (config: SplitBulkConfigValues) => {
    setSelectedItems((current) =>
      current.map((item) => {
        const isBatch = Boolean(item.batchId);
        const section = isBatch ? config.batch : config.product;
        if (!section) return item;
        return {
          ...item,
          promotionType: section.promotionType,
          discountType: section.discountType,
          discountValueInput: section.discountValue,
          maxUsageInput: isBatch
            ? item.maxUsageInput
            : "maxUsage" in section
              ? (section as { maxUsage: string }).maxUsage
              : item.maxUsageInput,
        };
      }),
    );
    setBulkEditOpen(false);
  };

  const paginatedItems = useMemo(() => {
    const start = itemsPage * itemsRowsPerPage;
    return filteredSelectedItems.slice(start, start + itemsRowsPerPage);
  }, [filteredSelectedItems, itemsPage, itemsRowsPerPage]);

  const handleCreateCampaign = async () => {
    const name = createForm.name.trim();
    const startDateTime = toLocalDateTime(
      createForm.startDate,
      createForm.startTime,
    );
    const endDateTime = toLocalDateTime(
      createForm.endDate,
      createForm.endTime,
      true,
    );

    if (!name) {
      showToast("Vui lòng nhập tên chiến dịch", "warning");
      return;
    }

    if (!startDateTime || !endDateTime) {
      showToast("Vui lòng nhập thời gian bắt đầu và kết thúc", "warning");
      return;
    }

    const now = new Date();
    const startDateTimeObj = new Date(startDateTime);
    startDateTimeObj.setHours(startDateTimeObj.getHours() + 7);
    if (startDateTimeObj.getTime() < now.getTime()) {
      showToast(
        "Thời gian bắt đầu không được nhỏ hơn thời gian hiện tại",
        "warning",
      );
      return;
    }

    if (new Date(endDateTime).getTime() <= new Date(startDateTime).getTime()) {
      showToast("Thời gian kết thúc phải lớn hơn thời gian bắt đầu", "warning");
      return;
    }

    if (selectedItems.length === 0) {
      showToast("Vui lòng chọn ít nhất một item khuyến mãi", "warning");
      return;
    }

    const invalidItem = selectedItems.find((item) => {
      if (!item.batchId) {
        const parsed = Number(item.maxUsageInput);
        if (!Number.isInteger(parsed) || parsed <= 0) return true;
      }
      const discountValue = Number(item.discountValueInput.replace(",", "."));
      if (!Number.isFinite(discountValue) || discountValue <= 0) return true;
      if (item.discountType === "Percentage" && discountValue > 100)
        return true;
      return false;
    });

    if (invalidItem) {
      const discountValue = Number(
        invalidItem.discountValueInput.replace(",", "."),
      );
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        showToast(
          `Item SKU ${invalidItem.variantSku}: Giá trị giảm phải lớn hơn 0`,
          "warning",
        );
        return;
      }
      if (invalidItem.discountType === "Percentage" && discountValue > 100) {
        showToast(
          `Item SKU ${invalidItem.variantSku}: Giảm phần trăm không được vượt quá 100`,
          "warning",
        );
        return;
      }
      showToast(
        `Max Usage bắt buộc > 0 cho item SKU ${invalidItem.variantSku} (không chọn lô)`,
        "warning",
      );
      return;
    }

    const normalizedVoucherCodes = new Set<string>();
    const parsedVouchers: NonNullable<CreateCampaignRequest["vouchers"]> = [];

    for (const [index, voucher] of campaignVouchers.entries()) {
      const rowNumber = index + 1;
      const code = voucher.code.trim().toUpperCase();
      const discountValue = Number(
        voucher.discountValueInput.replace(",", "."),
      );
      const minOrderValue = Number(
        voucher.minOrderValueInput.replace(",", "."),
      );
      const maxDiscountAmount = voucher.maxDiscountAmountInput.trim()
        ? Number(voucher.maxDiscountAmountInput.replace(",", "."))
        : null;
      const totalQuantity = voucher.totalQuantityInput.trim()
        ? Number(voucher.totalQuantityInput)
        : null;
      const maxUsagePerUser = voucher.maxUsagePerUserInput.trim()
        ? Number(voucher.maxUsagePerUserInput)
        : null;

      if (!code) continue;

      if (normalizedVoucherCodes.has(code)) {
        showToast(`Voucher #${rowNumber}: mã voucher bị trùng`, "warning");
        return;
      }

      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        showToast(
          `Voucher #${rowNumber}: giá trị giảm phải lớn hơn 0`,
          "warning",
        );
        return;
      }

      if (voucher.discountType === "Percentage" && discountValue > 100) {
        showToast(
          `Voucher #${rowNumber}: giảm phần trăm không được vượt quá 100`,
          "warning",
        );
        return;
      }

      if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
        showToast(
          `Voucher #${rowNumber}: giá trị đơn tối thiểu không hợp lệ`,
          "warning",
        );
        return;
      }

      if (
        maxDiscountAmount !== null &&
        (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)
      ) {
        showToast(
          `Voucher #${rowNumber}: mức giảm tối đa không hợp lệ`,
          "warning",
        );
        return;
      }

      if (
        totalQuantity !== null &&
        (!Number.isInteger(totalQuantity) || totalQuantity < 1)
      ) {
        showToast(
          `Voucher #${rowNumber}: số lượng mã phát hành không hợp lệ`,
          "warning",
        );
        return;
      }

      if (
        maxUsagePerUser === null ||
        !Number.isInteger(maxUsagePerUser) ||
        maxUsagePerUser < 1
      ) {
        showToast(
          `Voucher #${rowNumber}: vui lòng điền số lượt/khách hợp lệ (>= 1)`,
          "warning",
        );
        return;
      }

      if (voucher.applyType === "Product") {
        const targetType = voucher.targetItemType;
        if (!targetType) {
          showToast(
            `Voucher #${rowNumber}: vui lòng chọn loại item áp dụng`,
            "warning",
          );
          return;
        }
        if (!selectedPromotionTypes.includes(targetType as PromotionType)) {
          showToast(
            `Voucher #${rowNumber}: chưa có item thuộc loại ${PROMOTION_TYPE_LABEL[targetType as PromotionType]}`,
            "warning",
          );
          return;
        }
      }

      normalizedVoucherCodes.add(code);
      const targetItemType =
        voucher.applyType === "Product" && voucher.targetItemType
          ? (voucher.targetItemType as PromotionType)
          : undefined;

      parsedVouchers.push({
        code,
        discountValue,
        discountType: voucher.discountType,
        applyType: voucher.applyType,
        targetItemType,
        minOrderValue,
        maxDiscountAmount,
        totalQuantity,
        maxUsagePerUser,
        isMemberOnly: voucher.isMemberOnly,
      });
    }

    const payload: CreateCampaignRequest = {
      name,
      description: createForm.description.trim() || null,
      startDate: startDateTime,
      endDate: endDateTime,
      type: createForm.type,
      items: selectedItems.map((item) => ({
        productVariantId: item.productVariantId,
        batchId: item.batchId,
        promotionType: item.promotionType,
        discountType: item.discountType,
        discountValue: Number(item.discountValueInput.replace(",", ".")),
        maxUsage: item.batchId ? null : Number(item.maxUsageInput),
      })),
      vouchers: parsedVouchers,
    };

    try {
      setCreateSubmitting(true);
      await campaignService.createCampaign(payload);
      showToast("Tạo chiến dịch khuyến mãi thành công", "success");
      onCreated();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tạo chiến dịch khuyến mãi";
      showToast(message, "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Render ──

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ color: "text.secondary", textTransform: "none" }}
          >
            TRỞ LẠI
          </Button>
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v: CreateTab) => setActiveTab(v)}
          variant="fullWidth"
        >
          <Tab
            value="info"
            label="1. Thông tin chung"
            icon={
              isInfoValid ? (
                <Chip label="✓" size="small" color="success" />
              ) : undefined
            }
            iconPosition="end"
          />
          <Tab
            value="items"
            label={`2. Sản phẩm (${selectedSummary.total})`}
            icon={
              isItemsValid ? (
                <Chip label="✓" size="small" color="success" />
              ) : undefined
            }
            iconPosition="end"
          />
          <Tab value="vouchers" label={`3. Voucher`} />
        </Tabs>
      </Paper>

      {/* Tab content */}
      <Box
        sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        {/* ── Tab 1: General Info ── */}
        {activeTab === "info" && (
          <Paper
            variant="outlined"
            sx={{ p: 3, flex: 1, minHeight: 0, overflowY: "auto" }}
          >
            <Stack spacing={2.5}>
              <TextField
                label="Tên chiến dịch"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, name: e.target.value }))
                }
                required
                fullWidth
              />

              <TextField
                label="Mô tả"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, description: e.target.value }))
                }
                multiline
                minRows={3}
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Loại chiến dịch</InputLabel>
                <Select
                  value={createForm.type}
                  label="Loại chiến dịch"
                  onChange={(e) =>
                    setCreateForm((c) => ({
                      ...c,
                      type: e.target.value as CampaignType,
                    }))
                  }
                >
                  <MenuItem value="FlashSale">Flash Sale</MenuItem>
                  <MenuItem value="Clearance">Xả kho</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>
                Thời gian chiến dịch
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                }}
              >
                <TextField
                  label="Ngày bắt đầu"
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) =>
                    setCreateForm((c) => ({ ...c, startDate: e.target.value }))
                  }
                  required
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Giờ bắt đầu"
                  type="time"
                  value={createForm.startTime}
                  onChange={(e) =>
                    setCreateForm((c) => ({ ...c, startTime: e.target.value }))
                  }
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 60 }}
                  fullWidth
                />
                <TextField
                  label="Ngày kết thúc"
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setCreateForm((c) => ({
                      ...c,
                      endDate: nextDate,
                      endTime: isEndTimeManuallyEdited
                        ? c.endTime
                        : DEFAULT_END_TIME,
                    }));
                    if (!nextDate) setIsEndTimeManuallyEdited(false);
                  }}
                  required
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Giờ kết thúc"
                  type="time"
                  value={createForm.endTime}
                  onChange={(e) => {
                    setIsEndTimeManuallyEdited(true);
                    setCreateForm((c) => ({ ...c, endTime: e.target.value }));
                  }}
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 60 }}
                  helperText="Mặc định 23:59 khi chọn ngày kết thúc"
                  fullWidth
                />
              </Box>
            </Stack>
          </Paper>
        )}

        {/* ── Tab 2: Items ── */}
        {activeTab === "items" && (
          <Paper
            variant="outlined"
            sx={{ p: 3, flex: 1, minHeight: 0, overflowY: "auto" }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="flex-end"
              spacing={1}
            >
              {selectedItems.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SettingsIcon />}
                  onClick={() => setBulkEditOpen(true)}
                >
                  Cấu hình chung ({selectedItems.length})
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setItemSelectorOpen(true)}
              >
                Thêm sản phẩm
              </Button>
            </Stack>

            {/* Sub-tabs: All / Product / Batch */}
            <Tabs
              value={itemsSubTab}
              onChange={(_, v: ItemsSubTab) => {
                setItemsSubTab(v);
                setItemsPage(0);
              }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2 }}
            >
              <Tab value="all" label={`Tất cả (${selectedSummary.total})`} />
              <Tab
                value="product"
                label={`Theo sản phẩm (${selectedSummary.productCount})`}
              />
              <Tab
                value="batch"
                label={`Theo lô (${selectedSummary.batchCount})`}
              />
            </Tabs>

            {filteredSelectedItems.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{ p: 4, textAlign: "center", bgcolor: "grey.50" }}
              >
                <Typography variant="body2" color="text.secondary">
                  {selectedItems.length === 0
                    ? 'Chưa có sản phẩm nào. Bấm "Thêm sản phẩm" để chọn.'
                    : itemsSubTab === "product"
                      ? "Không có sản phẩm (toàn bộ tồn kho) nào."
                      : "Không có lô nào."}
                </Typography>
              </Paper>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ width: 48 }}>#</TableCell>
                        <TableCell sx={{ width: 56 }}>Ảnh</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>Sản phẩm</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Loại KM</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Kiểu giảm</TableCell>
                        <TableCell sx={{ minWidth: 130 }}>
                          Giá trị giảm
                        </TableCell>
                        <TableCell sx={{ minWidth: 100 }}>SL tối đa</TableCell>
                        <TableCell align="center" sx={{ width: 60 }}>
                          Xóa
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedItems.map((item, index) => {
                        const isBatchItem = Boolean(item.batchId);
                        return (
                          <TableRow key={item.key} hover>
                            <TableCell>
                              {itemsPage * itemsRowsPerPage + index + 1}
                            </TableCell>
                            <TableCell>
                              <Avatar
                                src={item.variantImageUrl || undefined}
                                alt={item.productName}
                                variant="rounded"
                                sx={{ width: 40, height: 40 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {item.productName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                component="div"
                              >
                                SKU: {item.variantSku}
                                {isBatchItem ? (
                                  <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    component="span"
                                  >
                                    {" | Lô: "}
                                    {item.batchCode}
                                  </Typography>
                                ) : (
                                  " | Toàn bộ tồn kho"
                                )}
                              </Typography>
                              {item.basePrice != null && (
                                <Typography
                                  variant="caption"
                                  color="error.main"
                                  component="div"
                                >
                                  {item.basePrice.toLocaleString("vi-VN")} ₫
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={item.promotionType}
                                  onChange={(e) =>
                                    handleSelectedItemFieldChange(
                                      item.key,
                                      "promotionType",
                                      e.target.value,
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
                            </TableCell>
                            <TableCell>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={item.discountType}
                                  onChange={(e) => {
                                    const newDiscountType = e.target
                                      .value as DiscountType;
                                    setSelectedItems((current) =>
                                      current.map((itm) =>
                                        itm.key === item.key
                                          ? {
                                              ...itm,
                                              discountType: newDiscountType,
                                              discountValueInput: "",
                                            }
                                          : itm,
                                      ),
                                    );
                                  }}
                                >
                                  {DISCOUNT_TYPE_OPTIONS.map((o) => (
                                    <MenuItem key={o.value} value={o.value}>
                                      {o.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={
                                  item.discountType === "Percentage"
                                    ? item.discountValueInput
                                    : formatNumberVN(item.discountValueInput)
                                }
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  if (item.discountType === "Percentage") {
                                    if (!/^\d*([.,]\d{0,2})?$/.test(inputValue))
                                      return;
                                    if (
                                      inputValue !== "" &&
                                      Number(inputValue.replace(",", ".")) > 100
                                    )
                                      return;
                                    handleSelectedItemFieldChange(
                                      item.key,
                                      "discountValueInput",
                                      inputValue,
                                    );
                                  } else {
                                    const parsed = parseNumberVN(inputValue);
                                    if (!/^\d*$/.test(parsed)) return;
                                    handleSelectedItemFieldChange(
                                      item.key,
                                      "discountValueInput",
                                      parsed,
                                    );
                                  }
                                }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      {item.discountType === "Percentage"
                                        ? "%"
                                        : "₫"}
                                    </InputAdornment>
                                  ),
                                }}
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              {isBatchItem ? (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ textAlign: "center" }}
                                >
                                  –
                                </Typography>
                              ) : (
                                <TextField
                                  size="small"
                                  value={formatNumberVN(item.maxUsageInput)}
                                  onChange={(e) => {
                                    const parsed = parseNumberVN(
                                      e.target.value,
                                    );
                                    if (!/^\d*$/.test(parsed)) return;
                                    handleSelectedItemFieldChange(
                                      item.key,
                                      "maxUsageInput",
                                      parsed,
                                    );
                                  }}
                                  placeholder="> 0"
                                  fullWidth
                                />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Xóa">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeSelectedItem(item.key)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={filteredSelectedItems.length}
                  page={itemsPage}
                  onPageChange={(_, p) => setItemsPage(p)}
                  rowsPerPage={itemsRowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setItemsRowsPerPage(Number(e.target.value));
                    setItemsPage(0);
                  }}
                  rowsPerPageOptions={[10, 20, 50]}
                  labelRowsPerPage="Dòng/trang:"
                  labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} của ${count}`
                  }
                />
              </>
            )}

            {/* Bulk config modal for editing existing items */}
            <BulkConfigModal
              open={bulkEditOpen}
              productCount={selectedSummary.productCount}
              batchCount={selectedSummary.batchCount}
              onClose={() => setBulkEditOpen(false)}
              onApply={handleBulkEditApply}
            />

            {/* Item selector dialog */}
            <Dialog
              open={itemSelectorOpen}
              onClose={() => setItemSelectorOpen(false)}
              maxWidth="lg"
              fullWidth
              PaperProps={{ sx: { height: "85vh" } }}
            >
              <DialogTitle>
                Chọn sản phẩm / lô để thêm vào chiến dịch
              </DialogTitle>
              <DialogContent
                sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
              >
                <BulkItemSelector
                  selectedItems={selectedItems}
                  onSelectedItemsChange={(items) => {
                    setSelectedItems(items);
                    setItemSelectorOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </Paper>
        )}

        {/* ── Tab 3: Vouchers ── */}
        {activeTab === "vouchers" && (
          <Paper
            variant="outlined"
            sx={{ p: 3, flex: 1, minHeight: 0, overflowY: "auto" }}
          >
            <VoucherForm
              vouchers={campaignVouchers}
              onVouchersChange={setCampaignVouchers}
            />
          </Paper>
        )}
      </Box>

      {/* Bottom bar with create button (always visible) */}
      <Paper
        elevation={3}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          mt: 2,
          borderRadius: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          {!isInfoValid && (
            <Chip
              label="Thiếu thông tin chung"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {!isItemsValid && (
            <Chip
              label="Chưa chọn sản phẩm"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {canCreate && (
            <Chip label="Sẵn sàng tạo" size="small" color="success" />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button onClick={onBack}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleCreateCampaign}
            disabled={!canCreate || createSubmitting}
            startIcon={
              createSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : undefined
            }
          >
            {createSubmitting ? "Đang tạo..." : "Tạo chiến dịch"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
