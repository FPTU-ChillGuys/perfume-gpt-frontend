import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Sync from "@mui/icons-material/Sync";
import InventoryIcon from "@mui/icons-material/Inventory";
import EventIcon from "@mui/icons-material/Event";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import ImageIcon from "@mui/icons-material/Image";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  campaignService,
  type CampaignPromotionItemResponse,
  type CampaignResponse,
  type CampaignStatus,
  type CampaignType,
  type PromotionType,
  type DiscountType,
  type VoucherType,
  type VoucherResponse,
  type CreateCampaignPromotionItemRequest,
  type UpdateCampaignPromotionItemRequest,
  type CreateCampaignVoucherRequest,
  type UpdateCampaignVoucherRequest,
} from "@/services/campaignService";
import { useToast } from "@/hooks/useToast";

// ─── Constants ────────────────────────────────────────────────────

const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  Upcoming: "Sắp diễn ra",
  Active: "Đang diễn ra",
  Paused: "Tạm dừng",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
};

const CAMPAIGN_STATUS_COLOR: Record<CampaignStatus, ChipProps["color"]> = {
  Upcoming: "info",
  Active: "success",
  Paused: "warning",
  Completed: "default",
  Cancelled: "error",
};

const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  FlashSale: "Flash Sale",
  Clearance: "Xả kho",
};

const PROMOTION_TYPE_LABEL: Record<PromotionType, string> = {
  Clearance: "Xả kho",
  NewArrival: "Hàng mới về",
  Regular: "Thông thường",
};

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  Percentage: "Phần trăm",
  FixedAmount: "Số tiền cố định",
};

const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  Order: "Đơn hàng",
  Product: "Sản phẩm",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  date.setHours(date.getHours() + 7);
  return date.toLocaleString("vi-VN");
};

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))}đ`;

const toLocalDatetimeString = (isoDate?: string | null) => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  d.setHours(d.getHours() + 7);
  return d.toISOString().slice(0, 16);
};

const fromLocalDatetimeString = (local: string) => {
  if (!local) return undefined;
  const d = new Date(local);
  d.setHours(d.getHours() - 7);
  return d.toISOString();
};

// ─── Default Forms ────────────────────────────────────────────────

type ItemFormData = {
  productVariantId: string;
  batchId: string;
  promotionType: PromotionType;
  discountType: DiscountType;
  discountValue: number;
  maxUsage: number | null;
};

const defaultItemForm: ItemFormData = {
  productVariantId: "",
  batchId: "",
  promotionType: "Regular",
  discountType: "Percentage",
  discountValue: 0,
  maxUsage: null,
};

type VoucherFormData = {
  code: string;
  discountValue: number;
  targetItemType: PromotionType;
  discountType: DiscountType;
  applyType: VoucherType;
  maxDiscountAmount: number | null;
  minOrderValue: number;
  totalQuantity: number | null;
  maxUsagePerUser: number | null;
};

const defaultVoucherForm: VoucherFormData = {
  code: "",
  discountValue: 0,
  targetItemType: "Regular",
  discountType: "Percentage",
  applyType: "Order",
  maxDiscountAmount: null,
  minOrderValue: 0,
  totalQuantity: null,
  maxUsagePerUser: null,
};

type CampaignFormData = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  type: CampaignType;
};

// ─── Component ────────────────────────────────────────────────────

export const CampaignManagementDetailPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { campaignId } = useParams<{ campaignId: string }>();

  const backState = location.state as
    | { statusTab?: string; page?: number; rowsPerPage?: number }
    | undefined;

  const handleBack = () => {
    navigate("/admin/campaigns", {
      state: {
        statusTab: backState?.statusTab ?? "all",
        page: backState?.page ?? 0,
        rowsPerPage: backState?.rowsPerPage ?? 10,
      },
    });
  };

  // ─── Data State ───────────────────────────────────────────────
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [items, setItems] = useState<CampaignPromotionItemResponse[]>([]);
  const [vouchers, setVouchers] = useState<VoucherResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Campaign Edit Dialog ─────────────────────────────────────
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState<CampaignFormData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    type: "FlashSale",
  });
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  // ─── Item Dialog ──────────────────────────────────────────────
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<CampaignPromotionItemResponse | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>(defaultItemForm);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(
    null,
  );

  // ─── Voucher Dialog ───────────────────────────────────────────
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherResponse | null>(
    null,
  );
  const [voucherForm, setVoucherForm] =
    useState<VoucherFormData>(defaultVoucherForm);
  const [isSavingVoucher, setIsSavingVoucher] = useState(false);
  const [confirmDeleteVoucherId, setConfirmDeleteVoucherId] = useState<
    string | null
  >(null);

  // ─── Load Data ────────────────────────────────────────────────
  const loadDetail = useCallback(async () => {
    if (!campaignId) {
      setError("Không tìm thấy ID chiến dịch");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const [campaignData, itemsData, vouchersData] = await Promise.all([
        campaignService.getCampaignById(campaignId),
        campaignService.getCampaignItems(campaignId),
        campaignService.getCampaignVouchers(campaignId),
      ]);
      setCampaign(campaignData);
      setItems(itemsData);
      setVouchers(vouchersData);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể tải chi tiết chiến dịch";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, showToast]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const status = campaign?.status || "Upcoming";
  const type = campaign?.type || "FlashSale";

  // ─── Campaign Edit Handlers ───────────────────────────────────
  const openEditCampaign = () => {
    if (!campaign) return;
    setCampaignForm({
      name: campaign.name || "",
      description: campaign.description || "",
      startDate: toLocalDatetimeString(campaign.startDate),
      endDate: toLocalDatetimeString(campaign.endDate),
      type: campaign.type || "FlashSale",
    });
    setCampaignDialogOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!campaignId || !campaign) return;
    if (!campaignForm.name.trim()) {
      showToast("Tên chiến dịch không được để trống", "error");
      return;
    }
    setIsSavingCampaign(true);
    try {
      await campaignService.updateCampaign(campaignId, {
        name: campaignForm.name,
        description: campaignForm.description || null,
        startDate: fromLocalDatetimeString(campaignForm.startDate),
        endDate: fromLocalDatetimeString(campaignForm.endDate),
        type: campaignForm.type,
        items: items.map((it) => ({
          id: it.id,
          productVariantId: it.productVariantId || "",
          batchId: it.batchId,
          promotionType: it.itemType,
          discountType: it.discountType,
          discountValue: it.discountValue,
          maxUsage: it.maxUsage,
        })),
        vouchers: vouchers.map((v) => ({
          id: v.id,
          code: v.code,
          discountValue: v.discountValue,
          targetItemType: v.targetItemType,
          discountType: v.discountType,
          applyType: v.applyType,
          maxDiscountAmount: v.maxDiscountAmount,
          minOrderValue: v.minOrderValue ?? 0,
          totalQuantity: v.totalQuantity,
          maxUsagePerUser: v.maxUsagePerUser,
        })),
      });
      showToast("Cập nhật chiến dịch thành công", "success");
      setCampaignDialogOpen(false);
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Cập nhật chiến dịch thất bại",
        "error",
      );
    } finally {
      setIsSavingCampaign(false);
    }
  };

  // ─── Item Handlers ────────────────────────────────────────────
  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm(defaultItemForm);
    setItemDialogOpen(true);
  };

  const openEditItem = (item: CampaignPromotionItemResponse) => {
    setEditingItem(item);
    setItemForm({
      productVariantId: item.productVariantId || "",
      batchId: item.batchId || "",
      promotionType: item.itemType || "Regular",
      discountType: item.discountType || "Percentage",
      discountValue: item.discountValue ?? 0,
      maxUsage: item.maxUsage ?? null,
    });
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!campaignId) return;
    if (!itemForm.productVariantId.trim()) {
      showToast("Product Variant ID không được để trống", "error");
      return;
    }
    setIsSavingItem(true);
    try {
      if (editingItem?.id) {
        const payload: UpdateCampaignPromotionItemRequest = {
          id: editingItem.id,
          productVariantId: itemForm.productVariantId,
          batchId: itemForm.batchId || null,
          promotionType: itemForm.promotionType,
          discountType: itemForm.discountType,
          discountValue: itemForm.discountValue,
          maxUsage: itemForm.maxUsage,
        };
        await campaignService.updateCampaignItem(
          campaignId,
          editingItem.id,
          payload,
        );
        showToast("Cập nhật sản phẩm thành công", "success");
      } else {
        const payload: CreateCampaignPromotionItemRequest = {
          productVariantId: itemForm.productVariantId,
          batchId: itemForm.batchId || null,
          promotionType: itemForm.promotionType,
          discountType: itemForm.discountType,
          discountValue: itemForm.discountValue,
          maxUsage: itemForm.maxUsage,
        };
        await campaignService.createCampaignItem(campaignId, payload);
        showToast("Thêm sản phẩm thành công", "success");
      }
      setItemDialogOpen(false);
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Lưu sản phẩm thất bại",
        "error",
      );
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!campaignId) return;
    try {
      await campaignService.deleteCampaignItem(campaignId, itemId);
      showToast("Xóa sản phẩm thành công", "success");
      setConfirmDeleteItemId(null);
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Xóa sản phẩm thất bại",
        "error",
      );
    }
  };

  // ─── Voucher Handlers ─────────────────────────────────────────
  const openCreateVoucher = () => {
    setEditingVoucher(null);
    setVoucherForm(defaultVoucherForm);
    setVoucherDialogOpen(true);
  };

  const openEditVoucher = (voucher: VoucherResponse) => {
    setEditingVoucher(voucher);
    setVoucherForm({
      code: voucher.code || "",
      discountValue: voucher.discountValue ?? 0,
      targetItemType: voucher.targetItemType || "Regular",
      discountType: voucher.discountType || "Percentage",
      applyType: voucher.applyType || "Order",
      maxDiscountAmount: voucher.maxDiscountAmount ?? null,
      minOrderValue: voucher.minOrderValue ?? 0,
      totalQuantity: voucher.totalQuantity ?? null,
      maxUsagePerUser: voucher.maxUsagePerUser ?? null,
    });
    setVoucherDialogOpen(true);
  };

  const handleSaveVoucher = async () => {
    if (!campaignId) return;
    if (!voucherForm.code.trim()) {
      showToast("Mã voucher không được để trống", "error");
      return;
    }
    setIsSavingVoucher(true);
    try {
      if (editingVoucher?.id) {
        const payload: UpdateCampaignVoucherRequest = {
          id: editingVoucher.id,
          code: voucherForm.code,
          discountValue: voucherForm.discountValue,
          targetItemType: voucherForm.targetItemType,
          discountType: voucherForm.discountType,
          applyType: voucherForm.applyType,
          maxDiscountAmount: voucherForm.maxDiscountAmount,
          minOrderValue: voucherForm.minOrderValue,
          totalQuantity: voucherForm.totalQuantity,
          maxUsagePerUser: voucherForm.maxUsagePerUser,
        };
        await campaignService.updateCampaignVoucher(
          campaignId,
          editingVoucher.id,
          payload,
        );
        showToast("Cập nhật voucher thành công", "success");
      } else {
        const payload: CreateCampaignVoucherRequest = {
          code: voucherForm.code,
          discountValue: voucherForm.discountValue,
          targetItemType: voucherForm.targetItemType,
          discountType: voucherForm.discountType,
          applyType: voucherForm.applyType,
          maxDiscountAmount: voucherForm.maxDiscountAmount,
          minOrderValue: voucherForm.minOrderValue,
          totalQuantity: voucherForm.totalQuantity,
          maxUsagePerUser: voucherForm.maxUsagePerUser,
        };
        await campaignService.createCampaignVoucher(campaignId, payload);
        showToast("Thêm voucher thành công", "success");
      }
      setVoucherDialogOpen(false);
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Lưu voucher thất bại",
        "error",
      );
    } finally {
      setIsSavingVoucher(false);
    }
  };

  const handleDeleteVoucher = async (voucherId: string) => {
    if (!campaignId) return;
    try {
      await campaignService.deleteCampaignVoucher(campaignId, voucherId);
      showToast("Xóa voucher thành công", "success");
      setConfirmDeleteVoucherId(null);
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Xóa voucher thất bại",
        "error",
      );
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ overflow: "hidden", borderRadius: 2 }}>
          {isLoading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight={420}
            >
              <CircularProgress />
            </Box>
          ) : error || !campaign ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {error ?? "Không tìm thấy chiến dịch"}
              </Alert>
              <Button variant="outlined" onClick={handleBack}>
                TRỞ LẠI
              </Button>
            </Box>
          ) : (
            <Box>
              {/* ── Header ── */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  px: 3,
                  py: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBack}
                  sx={{ color: "text.secondary", textTransform: "none" }}
                >
                  TRỞ LẠI
                </Button>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={openEditCampaign}
                  >
                    Chỉnh sửa
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => void loadDetail()}
                    disabled={isLoading}
                    aria-label="Tải lại"
                  >
                    <Sync />
                  </IconButton>
                </Stack>
              </Box>

              {/* ── Campaign Info ── */}
              <Box sx={{ px: 3, py: 2.5 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    Thông tin chiến dịch
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Tên chiến dịch
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {campaign.name || "N/A"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Loại chiến dịch
                    </Typography>
                    <Chip
                      size="small"
                      label={CAMPAIGN_TYPE_LABEL[type]}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Trạng thái
                    </Typography>
                    <Chip
                      size="small"
                      color={CAMPAIGN_STATUS_COLOR[status]}
                      label={CAMPAIGN_STATUS_LABEL[status]}
                    />
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Mô tả
                    </Typography>
                    <Typography variant="body2">
                      {campaign.description || "-"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* ── Time Info ── */}
              <Box sx={{ px: 3, py: 2.5 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <EventIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Thời gian
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Bắt đầu
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {formatDateTime(campaign.startDate)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Kết thúc
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {formatDateTime(campaign.endDate)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* ── Items Section ── */}
              <Box sx={{ px: 3, py: 2.5 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <InventoryIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Sản phẩm trong chiến dịch ({items.length})
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateItem}
                  >
                    Thêm sản phẩm
                  </Button>
                </Stack>

                {items.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      Chiến dịch chưa có sản phẩm.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ borderRadius: 1.5 }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.50" }}>
                          <TableCell>Sản phẩm</TableCell>
                          <TableCell>Batch</TableCell>
                          <TableCell align="center">Loại KM</TableCell>
                          <TableCell align="center">Loại giảm</TableCell>
                          <TableCell align="right">Giá trị giảm</TableCell>
                          <TableCell align="center">SL tối đa</TableCell>
                          <TableCell align="center">Đã dùng</TableCell>
                          <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item) => {
                          const itemType = item.itemType || "Regular";
                          const discountType =
                            item.discountType || "Percentage";

                          return (
                            <TableRow
                              key={
                                item.id ||
                                `${item.productVariantId}-${item.batchId}`
                              }
                              hover
                            >
                              <TableCell>
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={1.5}
                                >
                                  <Box
                                    sx={{
                                      width: 56,
                                      height: 56,
                                      bgcolor: "grey.100",
                                      borderRadius: 1,
                                      border: "1px solid",
                                      borderColor: "divider",
                                      flexShrink: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <ImageIcon
                                      sx={{ color: "grey.400", fontSize: 24 }}
                                    />
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      fontWeight={500}
                                      sx={{
                                        maxWidth: 200,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {item.name || "N/A"}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      ID: {item.productVariantId || "-"}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  color={
                                    item.batchId ? "inherit" : "text.secondary"
                                  }
                                >
                                  {item.batchId || "Không có"}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={PROMOTION_TYPE_LABEL[itemType]}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {DISCOUNT_TYPE_LABEL[discountType]}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  color="error.main"
                                >
                                  {discountType === "Percentage"
                                    ? `${item.discountValue ?? 0}%`
                                    : formatCurrency(item.discountValue)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {item.maxUsage ?? "-"}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {item.currentUsage ?? 0}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Sửa">
                                  <IconButton
                                    size="small"
                                    onClick={() => openEditItem(item)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      setConfirmDeleteItemId(item.id || null)
                                    }
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
                )}
              </Box>

              <Divider />

              {/* ── Vouchers Section ── */}
              <Box sx={{ px: 3, py: 2.5 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <LocalOfferIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Voucher ({vouchers.length})
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateVoucher}
                  >
                    Thêm voucher
                  </Button>
                </Stack>

                {vouchers.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      Chiến dịch chưa có voucher.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ borderRadius: 1.5 }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.50" }}>
                          <TableCell>Mã</TableCell>
                          <TableCell align="center">Loại áp dụng</TableCell>
                          <TableCell align="center">Loại giảm</TableCell>
                          <TableCell align="right">Giá trị giảm</TableCell>
                          <TableCell align="right">Giảm tối đa</TableCell>
                          <TableCell align="right">Đơn tối thiểu</TableCell>
                          <TableCell align="center">SL</TableCell>
                          <TableCell align="center">Còn lại</TableCell>
                          <TableCell align="center">Hết hạn</TableCell>
                          <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vouchers.map((v) => {
                          const vDiscountType = v.discountType || "Percentage";
                          return (
                            <TableRow key={v.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {v.code}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={
                                    VOUCHER_TYPE_LABEL[v.applyType || "Order"]
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {DISCOUNT_TYPE_LABEL[vDiscountType]}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  color="error.main"
                                >
                                  {vDiscountType === "Percentage"
                                    ? `${v.discountValue ?? 0}%`
                                    : formatCurrency(v.discountValue)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {v.maxDiscountAmount != null
                                    ? formatCurrency(v.maxDiscountAmount)
                                    : "-"}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {formatCurrency(v.minOrderValue)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {v.totalQuantity ?? "∞"}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {v.remainingQuantity ?? "-"}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {v.isExpired ? (
                                  <Chip
                                    label="Hết hạn"
                                    color="error"
                                    size="small"
                                  />
                                ) : (
                                  <Typography variant="body2">
                                    {formatDateTime(v.expiryDate)}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Sửa">
                                  <IconButton
                                    size="small"
                                    onClick={() => openEditVoucher(v)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      setConfirmDeleteVoucherId(v.id || null)
                                    }
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
                )}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ── Campaign Edit Dialog ── */}
      <Dialog
        open={campaignDialogOpen}
        onClose={() => setCampaignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chỉnh sửa chiến dịch</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên chiến dịch"
              size="small"
              fullWidth
              required
              value={campaignForm.name}
              onChange={(e) =>
                setCampaignForm({ ...campaignForm, name: e.target.value })
              }
            />
            <TextField
              label="Mô tả"
              size="small"
              fullWidth
              multiline
              rows={3}
              value={campaignForm.description}
              onChange={(e) =>
                setCampaignForm({
                  ...campaignForm,
                  description: e.target.value,
                })
              }
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Loại chiến dịch</InputLabel>
              <Select
                value={campaignForm.type}
                label="Loại chiến dịch"
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    type: e.target.value as CampaignType,
                  })
                }
              >
                {Object.entries(CAMPAIGN_TYPE_LABEL).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Bắt đầu"
              type="datetime-local"
              size="small"
              fullWidth
              value={campaignForm.startDate}
              onChange={(e) =>
                setCampaignForm({
                  ...campaignForm,
                  startDate: e.target.value,
                })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Kết thúc"
              type="datetime-local"
              size="small"
              fullWidth
              value={campaignForm.endDate}
              onChange={(e) =>
                setCampaignForm({ ...campaignForm, endDate: e.target.value })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveCampaign()}
            disabled={isSavingCampaign}
          >
            {isSavingCampaign ? <CircularProgress size={20} /> : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Item Dialog ── */}
      <Dialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Product Variant ID"
              size="small"
              fullWidth
              required
              value={itemForm.productVariantId}
              onChange={(e) =>
                setItemForm({
                  ...itemForm,
                  productVariantId: e.target.value,
                })
              }
            />
            <TextField
              label="Batch ID (tùy chọn)"
              size="small"
              fullWidth
              value={itemForm.batchId}
              onChange={(e) =>
                setItemForm({ ...itemForm, batchId: e.target.value })
              }
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Loại khuyến mãi</InputLabel>
              <Select
                value={itemForm.promotionType}
                label="Loại khuyến mãi"
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    promotionType: e.target.value as PromotionType,
                  })
                }
              >
                {Object.entries(PROMOTION_TYPE_LABEL).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Loại giảm giá</InputLabel>
              <Select
                value={itemForm.discountType}
                label="Loại giảm giá"
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    discountType: e.target.value as DiscountType,
                  })
                }
              >
                {Object.entries(DISCOUNT_TYPE_LABEL).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Giá trị giảm"
              type="number"
              size="small"
              fullWidth
              value={itemForm.discountValue}
              onChange={(e) =>
                setItemForm({
                  ...itemForm,
                  discountValue: Number(e.target.value),
                })
              }
            />
            <TextField
              label="Số lượng tối đa (để trống = không giới hạn)"
              type="number"
              size="small"
              fullWidth
              value={itemForm.maxUsage ?? ""}
              onChange={(e) =>
                setItemForm({
                  ...itemForm,
                  maxUsage: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveItem()}
            disabled={isSavingItem}
          >
            {isSavingItem ? <CircularProgress size={20} /> : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm Delete Item ── */}
      <Dialog
        open={!!confirmDeleteItemId}
        onClose={() => setConfirmDeleteItemId(null)}
      >
        <DialogTitle>Xác nhận xóa sản phẩm</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa sản phẩm này khỏi chiến dịch?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteItemId(null)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() =>
              confirmDeleteItemId && void handleDeleteItem(confirmDeleteItemId)
            }
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Voucher Dialog ── */}
      <Dialog
        open={voucherDialogOpen}
        onClose={() => setVoucherDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingVoucher ? "Chỉnh sửa voucher" : "Thêm voucher"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Mã voucher"
              size="small"
              fullWidth
              required
              value={voucherForm.code}
              onChange={(e) =>
                setVoucherForm({ ...voucherForm, code: e.target.value })
              }
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Loại áp dụng</InputLabel>
              <Select
                value={voucherForm.applyType}
                label="Loại áp dụng"
                onChange={(e) =>
                  setVoucherForm({
                    ...voucherForm,
                    applyType: e.target.value as VoucherType,
                  })
                }
              >
                {Object.entries(VOUCHER_TYPE_LABEL).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Nhóm sản phẩm áp dụng</InputLabel>
              <Select
                value={voucherForm.targetItemType}
                label="Nhóm sản phẩm áp dụng"
                onChange={(e) =>
                  setVoucherForm({
                    ...voucherForm,
                    targetItemType: e.target.value as PromotionType,
                  })
                }
              >
                {Object.entries(PROMOTION_TYPE_LABEL).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Loại giảm giá</InputLabel>
              <Select
                value={voucherForm.discountType}
                label="Loại giảm giá"
                onChange={(e) =>
                  setVoucherForm({
                    ...voucherForm,
                    discountType: e.target.value as DiscountType,
                  })
                }
              >
                {Object.entries(DISCOUNT_TYPE_LABEL).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Giá trị giảm"
              type="number"
              size="small"
              fullWidth
              value={voucherForm.discountValue}
              onChange={(e) =>
                setVoucherForm({
                  ...voucherForm,
                  discountValue: Number(e.target.value),
                })
              }
            />
            <TextField
              label="Giảm tối đa (để trống = không giới hạn)"
              type="number"
              size="small"
              fullWidth
              value={voucherForm.maxDiscountAmount ?? ""}
              onChange={(e) =>
                setVoucherForm({
                  ...voucherForm,
                  maxDiscountAmount: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
            <TextField
              label="Giá trị đơn tối thiểu"
              type="number"
              size="small"
              fullWidth
              required
              value={voucherForm.minOrderValue}
              onChange={(e) =>
                setVoucherForm({
                  ...voucherForm,
                  minOrderValue: Number(e.target.value),
                })
              }
            />
            <TextField
              label="Số lượng tổng (để trống = không giới hạn)"
              type="number"
              size="small"
              fullWidth
              value={voucherForm.totalQuantity ?? ""}
              onChange={(e) =>
                setVoucherForm({
                  ...voucherForm,
                  totalQuantity: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <TextField
              label="Tối đa / người dùng (để trống = không giới hạn)"
              type="number"
              size="small"
              fullWidth
              value={voucherForm.maxUsagePerUser ?? ""}
              onChange={(e) =>
                setVoucherForm({
                  ...voucherForm,
                  maxUsagePerUser: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoucherDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveVoucher()}
            disabled={isSavingVoucher}
          >
            {isSavingVoucher ? <CircularProgress size={20} /> : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm Delete Voucher ── */}
      <Dialog
        open={!!confirmDeleteVoucherId}
        onClose={() => setConfirmDeleteVoucherId(null)}
      >
        <DialogTitle>Xác nhận xóa voucher</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa voucher này khỏi chiến dịch?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteVoucherId(null)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() =>
              confirmDeleteVoucherId &&
              void handleDeleteVoucher(confirmDeleteVoucherId)
            }
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};
