import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import Sync from "@mui/icons-material/Sync";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PersonIcon from "@mui/icons-material/Person";
import PublicIcon from "@mui/icons-material/Public";
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
  type UpdateCampaignPromotionItemRequest,
  type CreateCampaignVoucherRequest,
  type UpdateCampaignVoucherRequest,
} from "@/services/campaignService";
import {
  BulkItemSelector,
  type SelectedCampaignItem,
} from "@/components/admin/campaign/BulkItemSelector";
import {
  BulkConfigModal,
  type SplitBulkConfigValues,
} from "@/components/admin/campaign/BulkConfigModal";
import { useToast } from "@/hooks/useToast";

// ─── Constants ────────────────────────────────────────────────────────

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

const PROMOTION_TYPE_OPTIONS: Array<{ value: PromotionType; label: string }> = [
  { value: "Clearance", label: "Xả kho" },
  { value: "NewArrival", label: "Hàng mới về" },
  { value: "Regular", label: "Thông thường" },
];

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  Percentage: "Phần trăm",
  FixedAmount: "Số tiền cố định",
};

const DISCOUNT_TYPE_OPTIONS: Array<{ value: DiscountType; label: string }> = [
  { value: "Percentage", label: "Phần trăm (%)" },
  { value: "FixedAmount", label: "Số tiền cố định" },
];

const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  Order: "Đơn hàng",
  Product: "Sản phẩm",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  date.setHours(date.getHours() + 7);
  const d = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const t = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${d} ${t}`;
};

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))}đ`;

const formatNumberVN = (value: string | number): string => {
  const strValue = String(value);
  const digitsOnly = strValue.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("vi-VN");
};

const parseNumberVN = (value: string): string => {
  return value.replace(/\./g, "");
};

const toLocalDatetimeString = (isoDate?: string | null) => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  d.setHours(d.getHours() + 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromLocalDatetimeString = (local: string) => {
  if (!local) return undefined;
  // Pass the local datetime-local value directly as ISO string.
  // The server (UTC+7) interprets the received string as local time and converts to UTC itself.
  return local.length === 16 ? `${local}:00` : local;
};

// ─── Types ───────────────────────────────────────────────────────────

type DetailTab = "info" | "items" | "vouchers";
type ItemsSubTab = "all" | "product" | "batch";

type VoucherFormData = {
  code: string;
  discountValue: number;
  targetItemType: PromotionType | null;
  discountType: DiscountType;
  applyType: VoucherType;
  maxDiscountAmount: number | null;
  minOrderValue: number;
  totalQuantity: number | null;
  maxUsagePerUser: number | null;
  isMemberOnly: boolean;
};

const defaultVoucherForm: VoucherFormData = {
  code: "",
  discountValue: 0,
  targetItemType: null,
  discountType: "Percentage",
  applyType: "Order",
  maxDiscountAmount: null,
  minOrderValue: 0,
  totalQuantity: null,
  maxUsagePerUser: null,
  isMemberOnly: true,
};

type CampaignFormData = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  type: CampaignType;
};

// ─── Component ───────────────────────────────────────────────────────

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

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<DetailTab>("info");

  // ── Data State ──
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [items, setItems] = useState<CampaignPromotionItemResponse[]>([]);
  const [vouchers, setVouchers] = useState<VoucherResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Campaign Edit State ──
  const [campaignForm, setCampaignForm] = useState<CampaignFormData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    type: "FlashSale",
  });
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // ── Items Tab State ──
  const [itemsSubTab, setItemsSubTab] = useState<ItemsSubTab>("all");
  const [itemsPage, setItemsPage] = useState(0);
  const [itemsRowsPerPage, setItemsRowsPerPage] = useState(10);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemForm, setEditingItemForm] = useState<{
    promotionType: PromotionType;
    discountType: DiscountType;
    discountValue: number;
    maxUsage: number | null;
  } | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(
    null,
  );
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // ── Add Item Selector ──
  const [itemSelectorOpen, setItemSelectorOpen] = useState(false);
  const [addingItems, setAddingItems] = useState(false);

  // ── Voucher Dialog ──
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
  const [confirmTogglePause, setConfirmTogglePause] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  // ── Load Data ──
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
  const canEdit = status === "Paused" || status === "Upcoming";

  // ── Derived item data ──
  const filteredItems = useMemo(() => {
    if (itemsSubTab === "product") return items.filter((i) => !i.batchId);
    if (itemsSubTab === "batch") return items.filter((i) => Boolean(i.batchId));
    return items;
  }, [items, itemsSubTab]);

  const paginatedItems = useMemo(() => {
    const start = itemsPage * itemsRowsPerPage;
    return filteredItems.slice(start, start + itemsRowsPerPage);
  }, [filteredItems, itemsPage, itemsRowsPerPage]);

  const itemsSummary = useMemo(() => {
    const batchCount = items.filter((i) => Boolean(i.batchId)).length;
    const productCount = items.filter((i) => !i.batchId).length;
    return { total: items.length, batchCount, productCount };
  }, [items]);

  // Already-added keys for preventing duplicates in add-item selector
  const alreadyAddedKeys = useMemo(() => {
    return items.map((i) => {
      const vid = i.productVariantId || "";
      const bid = i.batchId;
      return bid ? `${vid}-${bid}` : `${vid}-all`;
    });
  }, [items]);

  // Build pseudo SelectedCampaignItem[] to pass to BulkItemSelector as "already selected"
  const existingAsSelected = useMemo((): SelectedCampaignItem[] => {
    return items.map((i) => {
      const vid = i.productVariantId || "";
      const bid = i.batchId;
      return {
        key: bid ? `${vid}-${bid}` : `${vid}-all`,
        productVariantId: vid,
        batchId: bid || null,
        productName: i.productName || "N/A",
        variantSku: i.sku || "",
        variantImageUrl: i.primaryImageUrl,
        batchCode: i.batchCode || null,
        availableQuantity: 0,
        basePrice: null,
        retailPrice: null,
        promotionType: i.itemType || "Regular",
        discountType: i.discountType || "Percentage",
        discountValueInput: String(i.discountValue ?? 0),
        maxUsageInput: String(i.maxUsage ?? ""),
      };
    });
  }, [items]);

  // ── Campaign Edit Handlers ──
  const openEditCampaign = () => {
    if (!campaign) return;
    setCampaignForm({
      name: campaign.name || "",
      description: campaign.description || "",
      startDate: toLocalDatetimeString(campaign.startDate),
      endDate: toLocalDatetimeString(campaign.endDate),
      type: campaign.type || "FlashSale",
    });
    setIsEditingInfo(true);
    setActiveTab("info");
  };

  const cancelEditInfo = () => {
    setIsEditingInfo(false);
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
          targetItemType:
            (v.applyType || "Order") === "Order" ? null : v.targetItemType,
          discountType: v.discountType,
          applyType: v.applyType,
          maxDiscountAmount: v.maxDiscountAmount,
          minOrderValue: v.minOrderValue ?? 0,
          totalQuantity: v.totalQuantity,
          maxUsagePerUser: v.maxUsagePerUser,
          isMemberOnly: v.isMemberOnly,
        })) as UpdateCampaignVoucherRequest[],
      });
      showToast("Cập nhật chiến dịch thành công", "success");
      setIsEditingInfo(false);
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

  // ── Item Inline Edit ──
  const startEditItem = (item: CampaignPromotionItemResponse) => {
    setEditingItemId(item.id || null);
    setEditingItemForm({
      promotionType: item.itemType || "Regular",
      discountType: item.discountType || "Percentage",
      discountValue: item.discountValue ?? 0,
      maxUsage: item.maxUsage ?? null,
    });
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditingItemForm(null);
  };

  const handleSaveInlineItem = async (item: CampaignPromotionItemResponse) => {
    if (!campaignId || !item.id || !editingItemForm) return;
    setIsSavingItem(true);
    try {
      const payload: UpdateCampaignPromotionItemRequest = {
        id: item.id,
        productVariantId: item.productVariantId || "",
        batchId: item.batchId || null,
        promotionType: editingItemForm.promotionType,
        discountType: editingItemForm.discountType,
        discountValue: editingItemForm.discountValue,
        maxUsage: item.batchId ? null : editingItemForm.maxUsage,
      };
      await campaignService.updateCampaignItem(campaignId, item.id, payload);
      showToast("Cập nhật sản phẩm thành công", "success");
      cancelEditItem();
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Cập nhật sản phẩm thất bại",
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

  // ── Add Items from BulkItemSelector ──
  const handleAddSelectedItems = async (newItems: SelectedCampaignItem[]) => {
    if (!campaignId) return;
    // Filter out items that already exist
    const toAdd = newItems.filter((ni) => !alreadyAddedKeys.includes(ni.key));
    if (toAdd.length === 0) {
      showToast("Không có sản phẩm mới để thêm", "warning");
      return;
    }
    setAddingItems(true);
    try {
      await Promise.all(
        toAdd.map((item) =>
          campaignService.createCampaignItem(campaignId, {
            productVariantId: item.productVariantId,
            batchId: item.batchId,
            promotionType: item.promotionType,
            discountType: item.discountType,
            discountValue:
              Number(item.discountValueInput.replace(",", ".")) || 0,
            maxUsage: item.batchId
              ? null
              : item.maxUsageInput
                ? Number(item.maxUsageInput)
                : null,
          }),
        ),
      );
      showToast(`Thêm ${toAdd.length} sản phẩm thành công`, "success");
      setItemSelectorOpen(false);
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Thêm sản phẩm thất bại",
        "error",
      );
    } finally {
      setAddingItems(false);
    }
  };

  // ── Bulk Config for existing items ──
  const handleBulkEditApply = async (config: SplitBulkConfigValues) => {
    if (!campaignId) return;
    setBulkEditOpen(false);
    setIsSavingItem(true);
    try {
      const updates: Promise<string>[] = [];
      for (const item of items) {
        const isBatch = Boolean(item.batchId);
        const section = isBatch ? config.batch : config.product;
        if (!section) continue;

        const payload: UpdateCampaignPromotionItemRequest = {
          id: item.id,
          productVariantId: item.productVariantId || "",
          batchId: item.batchId || null,
          promotionType: section.promotionType,
          discountType: section.discountType,
          discountValue: Number(section.discountValue.replace(",", ".")) || 0,
          maxUsage: isBatch
            ? null
            : "maxUsage" in section &&
                (section as { maxUsage: string }).maxUsage
              ? Number((section as { maxUsage: string }).maxUsage)
              : item.maxUsage,
        };
        if (item.id) {
          updates.push(
            campaignService.updateCampaignItem(campaignId, item.id, payload),
          );
        }
      }
      await Promise.all(updates);
      showToast("Cập nhật cấu hình đồng loạt thành công", "success");
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Cập nhật cấu hình thất bại",
        "error",
      );
    } finally {
      setIsSavingItem(false);
    }
  };

  // ── Voucher Handlers ──
  const handleCopyVoucherCode = async (code?: string | null) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      showToast("Đã sao chép mã voucher", "success");
    } catch {
      showToast("Không thể sao chép mã voucher", "error");
    }
  };

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
      targetItemType:
        (voucher.applyType || "Order") === "Order"
          ? null
          : voucher.targetItemType || "Regular",
      discountType: voucher.discountType || "Percentage",
      applyType: voucher.applyType || "Order",
      maxDiscountAmount: voucher.maxDiscountAmount ?? null,
      minOrderValue: voucher.minOrderValue ?? 0,
      totalQuantity: voucher.totalQuantity ?? null,
      maxUsagePerUser: voucher.maxUsagePerUser ?? null,
      isMemberOnly: voucher.isMemberOnly ?? false,
    });
    setVoucherDialogOpen(true);
  };

  const handleSaveVoucher = async () => {
    if (!campaignId) return;
    if (!voucherForm.code.trim()) {
      showToast("Mã voucher không được để trống", "error");
      return;
    }
    if (!voucherForm.maxUsagePerUser || voucherForm.maxUsagePerUser < 1) {
      showToast(
        "Vui lòng nhập số lượt sử dụng tối đa mỗi khách (>= 1)",
        "error",
      );
      return;
    }
    if (
      voucherForm.discountType === "Percentage" &&
      (voucherForm.discountValue <= 0 || voucherForm.discountValue > 100)
    ) {
      showToast("Giảm phần trăm phải từ 1 đến 100", "error");
      return;
    }
    if (voucherForm.applyType === "Product" && !voucherForm.targetItemType) {
      showToast("Vui lòng chọn nhóm sản phẩm áp dụng", "error");
      return;
    }
    setIsSavingVoucher(true);
    try {
      if (editingVoucher?.id) {
        const payload = {
          code: voucherForm.code,
          discountValue: voucherForm.discountValue,
          targetItemType:
            voucherForm.applyType === "Order"
              ? null
              : (voucherForm.targetItemType ?? undefined),
          discountType: voucherForm.discountType,
          applyType: voucherForm.applyType,
          maxDiscountAmount: voucherForm.maxDiscountAmount,
          minOrderValue: voucherForm.minOrderValue,
          totalQuantity: voucherForm.totalQuantity,
          maxUsagePerUser: voucherForm.maxUsagePerUser,
          isMemberOnly: voucherForm.isMemberOnly,
        } as UpdateCampaignVoucherRequest;
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
          targetItemType:
            voucherForm.applyType === "Order"
              ? null
              : (voucherForm.targetItemType ?? "Regular"),
          discountType: voucherForm.discountType,
          applyType: voucherForm.applyType,
          maxDiscountAmount: voucherForm.maxDiscountAmount,
          minOrderValue: voucherForm.minOrderValue,
          totalQuantity: voucherForm.totalQuantity,
          maxUsagePerUser: voucherForm.maxUsagePerUser,
          isMemberOnly: voucherForm.isMemberOnly,
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

  const handleTogglePause = async () => {
    if (!campaignId) return;
    const newStatus: CampaignStatus = status === "Active" ? "Paused" : "Active";
    setIsTogglingPause(true);
    try {
      await campaignService.updateCampaignStatus(campaignId, newStatus);
      showToast(
        newStatus === "Paused"
          ? "Đã tạm dừng chiến dịch"
          : "Đã tiếp tục chiến dịch",
        "success",
      );
      setConfirmTogglePause(false);
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Cập nhật trạng thái thất bại",
        "error",
      );
    } finally {
      setIsTogglingPause(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
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
          <>
            {/* Header */}
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
                <IconButton
                  size="small"
                  onClick={() => void loadDetail()}
                  disabled={isLoading}
                >
                  <Sync />
                </IconButton>
                <Typography variant="body1" fontWeight={600}>
                  {campaign.name || "Chi tiết chiến dịch"}
                </Typography>
                <Divider orientation="vertical" flexItem />
                <Chip
                  size="small"
                  color={CAMPAIGN_STATUS_COLOR[status]}
                  label={CAMPAIGN_STATUS_LABEL[status]}
                />
                <Chip
                  size="small"
                  label={CAMPAIGN_TYPE_LABEL[type]}
                  color="primary"
                  variant="outlined"
                />
                <Divider orientation="vertical" flexItem />
                {(status === "Active" || status === "Paused") && (
                  <Tooltip
                    title={
                      status === "Active"
                        ? "Tạm dừng chiến dịch"
                        : "Tiếp tục chiến dịch"
                    }
                  >
                    <IconButton
                      size="small"
                      color={status === "Active" ? "warning" : "success"}
                      onClick={() => setConfirmTogglePause(true)}
                      disabled={isTogglingPause}
                    >
                      {status === "Active" ? (
                        <PauseIcon fontSize="small" />
                      ) : (
                        <PlayArrowIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Box>

            {/* Tabs */}
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, v: DetailTab) => setActiveTab(v)}
                variant="fullWidth"
              >
                <Tab value="info" label="1. Thông tin chung" />
                <Tab
                  value="items"
                  label={`2. Sản phẩm (${itemsSummary.total})`}
                />
                <Tab
                  value="vouchers"
                  label={`3. Voucher (${vouchers.length})`}
                />
              </Tabs>
            </Paper>

            {/* Tab content */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* ── Tab 1: Info ── */}
              {activeTab === "info" && (
                <Paper
                  variant="outlined"
                  sx={{ p: 3, flex: 1, minHeight: 0, overflowY: "auto" }}
                >
                  {/* Action bar */}
                  <Stack
                    direction="row"
                    justifyContent="flex-end"
                    spacing={1}
                    sx={{ mb: 2 }}
                  >
                    {isEditingInfo ? (
                      <>
                        <Button
                          variant="outlined"
                          onClick={cancelEditInfo}
                          disabled={isSavingCampaign}
                        >
                          Hủy
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={
                            isSavingCampaign ? (
                              <CircularProgress size={16} />
                            ) : (
                              <SaveIcon />
                            )
                          }
                          onClick={() => void handleSaveCampaign()}
                          disabled={isSavingCampaign}
                        >
                          Lưu
                        </Button>
                      </>
                    ) : (
                      <Tooltip
                        title={
                          !canEdit
                            ? "Chỉ sửa khi Tạm dừng hoặc Sắp diễn ra"
                            : ""
                        }
                      >
                        <span>
                          <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={openEditCampaign}
                            disabled={!canEdit}
                          >
                            Chỉnh sửa
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>

                  <Stack spacing={2.5}>
                    {/* Campaign name */}
                    <TextField
                      label="Tên chiến dịch"
                      value={
                        isEditingInfo ? campaignForm.name : campaign.name || ""
                      }
                      onChange={(e) =>
                        setCampaignForm({
                          ...campaignForm,
                          name: e.target.value,
                        })
                      }
                      required
                      fullWidth
                      slotProps={{
                        input: { readOnly: !isEditingInfo },
                      }}
                    />

                    {/* Campaign type */}
                    <FormControl fullWidth disabled={!isEditingInfo}>
                      <InputLabel>Loại chiến dịch</InputLabel>
                      <Select
                        value={
                          isEditingInfo
                            ? campaignForm.type
                            : campaign.type || "FlashSale"
                        }
                        label="Loại chiến dịch"
                        onChange={(e) =>
                          setCampaignForm({
                            ...campaignForm,
                            type: e.target.value as CampaignType,
                          })
                        }
                        readOnly={!isEditingInfo}
                      >
                        {Object.entries(CAMPAIGN_TYPE_LABEL).map(
                          ([key, label]) => (
                            <MenuItem key={key} value={key}>
                              {label}
                            </MenuItem>
                          ),
                        )}
                      </Select>
                    </FormControl>

                    {/* Status (read-only always) */}
                    <TextField
                      label="Trạng thái"
                      value={CAMPAIGN_STATUS_LABEL[status]}
                      fullWidth
                      slotProps={{ input: { readOnly: true } }}
                    />

                    {/* Date/time section */}
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{ mt: 1 }}
                    >
                      Thời gian chiến dịch
                    </Typography>

                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "1fr 1fr",
                        },
                      }}
                    >
                      <TextField
                        label="Bắt đầu"
                        type={isEditingInfo ? "datetime-local" : "text"}
                        fullWidth
                        value={
                          isEditingInfo
                            ? campaignForm.startDate
                            : formatDateTime(campaign.startDate)
                        }
                        onChange={(e) =>
                          setCampaignForm({
                            ...campaignForm,
                            startDate: e.target.value,
                          })
                        }
                        slotProps={{
                          inputLabel: { shrink: true },
                          input: { readOnly: !isEditingInfo },
                        }}
                      />
                      <TextField
                        label="Kết thúc"
                        type={isEditingInfo ? "datetime-local" : "text"}
                        fullWidth
                        value={
                          isEditingInfo
                            ? campaignForm.endDate
                            : formatDateTime(campaign.endDate)
                        }
                        onChange={(e) =>
                          setCampaignForm({
                            ...campaignForm,
                            endDate: e.target.value,
                          })
                        }
                        slotProps={{
                          inputLabel: { shrink: true },
                          input: { readOnly: !isEditingInfo },
                        }}
                      />
                    </Box>

                    {/* Description */}
                    <TextField
                      label="Mô tả"
                      value={
                        isEditingInfo
                          ? campaignForm.description
                          : campaign.description || ""
                      }
                      onChange={(e) =>
                        setCampaignForm({
                          ...campaignForm,
                          description: e.target.value,
                        })
                      }
                      multiline
                      minRows={4}
                      fullWidth
                      slotProps={{
                        input: { readOnly: !isEditingInfo },
                      }}
                    />
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
                    {items.length > 0 && canEdit && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<SettingsIcon />}
                        onClick={() => setBulkEditOpen(true)}
                      >
                        Cấu hình chung ({items.length})
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setItemSelectorOpen(true)}
                      disabled={!canEdit}
                    >
                      Thêm sản phẩm
                    </Button>
                  </Stack>

                  {/* Sub-tabs */}
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
                    <Tab value="all" label={`Tất cả (${itemsSummary.total})`} />
                    <Tab
                      value="product"
                      label={`Theo sản phẩm (${itemsSummary.productCount})`}
                    />
                    <Tab
                      value="batch"
                      label={`Theo lô (${itemsSummary.batchCount})`}
                    />
                  </Tabs>

                  {filteredItems.length === 0 ? (
                    <Paper
                      variant="outlined"
                      sx={{ p: 4, textAlign: "center", bgcolor: "grey.50" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {items.length === 0
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
                              <TableCell sx={{ minWidth: 180 }}>
                                Sản phẩm
                              </TableCell>
                              <TableCell sx={{ minWidth: 120 }}>
                                Loại KM
                              </TableCell>
                              <TableCell sx={{ minWidth: 120 }}>
                                Kiểu giảm
                              </TableCell>
                              <TableCell sx={{ minWidth: 130 }}>
                                Giá trị giảm
                              </TableCell>
                              <TableCell sx={{ minWidth: 100 }}>
                                SL tối đa
                              </TableCell>
                              <TableCell align="center" sx={{ minWidth: 80 }}>
                                Đã dùng
                              </TableCell>
                              <TableCell align="center" sx={{ width: 100 }}>
                                Thao tác
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paginatedItems.map((item, index) => {
                              const isEditing = editingItemId === item.id;
                              const isBatchItem = Boolean(item.batchId);
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
                                    {itemsPage * itemsRowsPerPage + index + 1}
                                  </TableCell>
                                  <TableCell>
                                    <Avatar
                                      src={item.primaryImageUrl || undefined}
                                      alt={item.productName}
                                      variant="rounded"
                                      sx={{ width: 40, height: 40 }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                    >
                                      {item.productName || "N/A"}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      component="div"
                                    >
                                      SKU: {item.sku || "-"}
                                      {isBatchItem ? (
                                        <Typography
                                          variant="caption"
                                          fontWeight={700}
                                          component="span"
                                        >
                                          {" | Lô: "}
                                          {item.batchCode || item.batchId}
                                        </Typography>
                                      ) : (
                                        " | Toàn bộ tồn kho"
                                      )}
                                    </Typography>
                                  </TableCell>

                                  {/* Promotion Type */}
                                  <TableCell>
                                    {isEditing && editingItemForm ? (
                                      <FormControl fullWidth size="small">
                                        <Select
                                          value={editingItemForm.promotionType}
                                          onChange={(e) =>
                                            setEditingItemForm({
                                              ...editingItemForm,
                                              promotionType: e.target
                                                .value as PromotionType,
                                            })
                                          }
                                        >
                                          {PROMOTION_TYPE_OPTIONS.map((o) => (
                                            <MenuItem
                                              key={o.value}
                                              value={o.value}
                                            >
                                              {o.label}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    ) : (
                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label={PROMOTION_TYPE_LABEL[itemType]}
                                      />
                                    )}
                                  </TableCell>

                                  {/* Discount Type */}
                                  <TableCell>
                                    {isEditing && editingItemForm ? (
                                      <FormControl fullWidth size="small">
                                        <Select
                                          value={editingItemForm.discountType}
                                          onChange={(e) =>
                                            setEditingItemForm({
                                              ...editingItemForm,
                                              discountType: e.target
                                                .value as DiscountType,
                                              discountValue: 0,
                                            })
                                          }
                                        >
                                          {DISCOUNT_TYPE_OPTIONS.map((o) => (
                                            <MenuItem
                                              key={o.value}
                                              value={o.value}
                                            >
                                              {o.label}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    ) : (
                                      <Typography variant="body2">
                                        {DISCOUNT_TYPE_LABEL[discountType]}
                                      </Typography>
                                    )}
                                  </TableCell>

                                  {/* Discount Value */}
                                  <TableCell>
                                    {isEditing && editingItemForm ? (
                                      <TextField
                                        size="small"
                                        value={
                                          editingItemForm.discountType ===
                                          "Percentage"
                                            ? editingItemForm.discountValue
                                            : formatNumberVN(
                                                String(
                                                  editingItemForm.discountValue,
                                                ),
                                              )
                                        }
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (
                                            editingItemForm.discountType ===
                                            "Percentage"
                                          ) {
                                            const num = Number(val);
                                            if (isNaN(num) || num > 100) return;
                                            setEditingItemForm({
                                              ...editingItemForm,
                                              discountValue: num,
                                            });
                                          } else {
                                            const parsed = parseNumberVN(val);
                                            const num = Number(parsed);
                                            if (!isNaN(num))
                                              setEditingItemForm({
                                                ...editingItemForm,
                                                discountValue: num,
                                              });
                                          }
                                        }}
                                        InputProps={{
                                          endAdornment: (
                                            <InputAdornment position="end">
                                              {editingItemForm.discountType ===
                                              "Percentage"
                                                ? "%"
                                                : "VND"}
                                            </InputAdornment>
                                          ),
                                        }}
                                        fullWidth
                                      />
                                    ) : (
                                      <Typography
                                        variant="body2"
                                        fontWeight={600}
                                        color="error.main"
                                      >
                                        {discountType === "Percentage"
                                          ? `${item.discountValue ?? 0}%`
                                          : formatCurrency(item.discountValue)}
                                      </Typography>
                                    )}
                                  </TableCell>

                                  {/* Max Usage */}
                                  <TableCell>
                                    {isEditing && editingItemForm ? (
                                      isBatchItem ? (
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
                                          type="number"
                                          value={editingItemForm.maxUsage ?? ""}
                                          onChange={(e) =>
                                            setEditingItemForm({
                                              ...editingItemForm,
                                              maxUsage: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                            })
                                          }
                                          placeholder="Không giới hạn"
                                          fullWidth
                                        />
                                      )
                                    ) : (
                                      <Typography variant="body2">
                                        {item.maxUsage ?? "-"}
                                      </Typography>
                                    )}
                                  </TableCell>

                                  {/* Current Usage */}
                                  <TableCell align="center">
                                    <Typography variant="body2">
                                      {item.currentUsage ?? 0}
                                    </Typography>
                                  </TableCell>

                                  {/* Actions */}
                                  <TableCell align="center">
                                    {isEditing ? (
                                      <Stack
                                        direction="row"
                                        spacing={0.5}
                                        justifyContent="center"
                                      >
                                        <Button
                                          size="small"
                                          variant="contained"
                                          onClick={() =>
                                            void handleSaveInlineItem(item)
                                          }
                                          disabled={isSavingItem}
                                        >
                                          {isSavingItem ? (
                                            <CircularProgress size={16} />
                                          ) : (
                                            "Lưu"
                                          )}
                                        </Button>
                                        <Button
                                          size="small"
                                          onClick={cancelEditItem}
                                        >
                                          Hủy
                                        </Button>
                                      </Stack>
                                    ) : (
                                      <>
                                        <Tooltip
                                          title={
                                            !canEdit
                                              ? "Chỉ sửa khi Tạm dừng hoặc Sắp diễn ra"
                                              : "Sửa"
                                          }
                                        >
                                          <span>
                                            <IconButton
                                              size="small"
                                              onClick={() =>
                                                startEditItem(item)
                                              }
                                              disabled={!canEdit}
                                            >
                                              <EditIcon fontSize="small" />
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                        <Tooltip
                                          title={
                                            !canEdit
                                              ? "Chỉ xóa khi Tạm dừng hoặc Sắp diễn ra"
                                              : "Xóa"
                                          }
                                        >
                                          <span>
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={() =>
                                                setConfirmDeleteItemId(
                                                  item.id || null,
                                                )
                                              }
                                              disabled={!canEdit}
                                            >
                                              <DeleteIcon fontSize="small" />
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                      </>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <TablePagination
                        component="div"
                        count={filteredItems.length}
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
                </Paper>
              )}

              {/* ── Tab 3: Vouchers ── */}
              {activeTab === "vouchers" && (
                <Paper
                  variant="outlined"
                  sx={{ p: 3, flex: 1, minHeight: 0, overflowY: "auto" }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 2 }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                    ></Stack>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={openCreateVoucher}
                      disabled={!canEdit}
                    >
                      Thêm voucher
                    </Button>
                  </Stack>

                  {vouchers.length === 0 ? (
                    <Paper
                      variant="outlined"
                      sx={{ p: 4, textAlign: "center", bgcolor: "grey.50" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Chiến dịch chưa có voucher.
                      </Typography>
                    </Paper>
                  ) : (
                    <TableContainer
                      component={Paper}
                      sx={{ borderRadius: 2, overflow: "hidden" }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow
                            sx={{
                              bgcolor: "grey.100",
                              "& th": {
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "text.secondary",
                                borderBottom: "2px solid",
                                borderColor: "divider",
                                py: 1.5,
                                whiteSpace: "nowrap",
                              },
                            }}
                          >
                            <TableCell>Mã</TableCell>
                            <TableCell>Loại áp dụng</TableCell>
                            <TableCell>Loại giảm</TableCell>
                            <TableCell>Giá trị giảm</TableCell>
                            <TableCell>Giảm tối đa</TableCell>
                            <TableCell>Đơn tối thiểu</TableCell>
                            <TableCell>Số lượng</TableCell>
                            <TableCell align="center">Đối tượng</TableCell>
                            <TableCell>Hết hạn</TableCell>
                            <TableCell align="center">Thao tác</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {vouchers.map((v) => {
                            const vDiscountType =
                              v.discountType || "Percentage";
                            return (
                              <TableRow
                                key={v.id}
                                hover
                                sx={{ "&:last-child td": { border: 0 } }}
                              >
                                <TableCell>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      fontFamily="monospace"
                                      sx={{ letterSpacing: "0.04em" }}
                                    >
                                      {v.code}
                                    </Typography>
                                    <Tooltip title="Sao chép mã">
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          void handleCopyVoucherCode(v.code)
                                        }
                                        sx={{
                                          p: 0.25,
                                          color: "text.secondary",
                                        }}
                                      >
                                        <ContentCopyIcon
                                          sx={{ fontSize: 13 }}
                                        />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={
                                      VOUCHER_TYPE_LABEL[v.applyType || "Order"]
                                    }
                                    color={
                                      v.applyType === "Product"
                                        ? "secondary"
                                        : "primary"
                                    }
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: "0.7rem",
                                      minWidth: 88,
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={
                                      vDiscountType === "Percentage"
                                        ? "Phần trăm"
                                        : "Cố định"
                                    }
                                    color={
                                      vDiscountType === "Percentage"
                                        ? "info"
                                        : "default"
                                    }
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: "0.7rem",
                                      minWidth: 88,
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
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
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {v.maxDiscountAmount != null
                                      ? formatCurrency(v.maxDiscountAmount)
                                      : "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {formatCurrency(v.minOrderValue)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 0.25,
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                    >
                                      {new Intl.NumberFormat("vi-VN").format(
                                        v.remainingQuantity ?? 0,
                                      )}
                                      <Typography
                                        component="span"
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {" "}
                                        /{" "}
                                        {v.totalQuantity != null
                                          ? new Intl.NumberFormat(
                                              "vi-VN",
                                            ).format(v.totalQuantity)
                                          : "∞"}
                                      </Typography>
                                    </Typography>
                                    {v.totalQuantity != null && (
                                      <Box
                                        sx={{
                                          height: 3,
                                          borderRadius: 2,
                                          bgcolor: "grey.200",
                                          overflow: "hidden",
                                          width: 60,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            height: "100%",
                                            width: `${Math.min(100, ((v.remainingQuantity ?? 0) / Math.max(v.totalQuantity, 1)) * 100)}%`,
                                            bgcolor:
                                              (v.remainingQuantity ?? 0) === 0
                                                ? "error.main"
                                                : (v.remainingQuantity ?? 0) /
                                                      v.totalQuantity <
                                                    0.2
                                                  ? "warning.main"
                                                  : "success.main",
                                            borderRadius: 2,
                                          }}
                                        />
                                      </Box>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    size="small"
                                    icon={
                                      v.isMemberOnly ? (
                                        <PersonIcon
                                          sx={{ fontSize: "14px !important" }}
                                        />
                                      ) : (
                                        <PublicIcon
                                          sx={{ fontSize: "14px !important" }}
                                        />
                                      )
                                    }
                                    label={
                                      v.isMemberOnly ? "Thành viên" : "Tất cả"
                                    }
                                    color={
                                      v.isMemberOnly ? "secondary" : "default"
                                    }
                                    variant="outlined"
                                    sx={{ fontSize: "0.68rem", minWidth: 100 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {v.isExpired ? (
                                    <Chip
                                      label="Hết hạn"
                                      color="error"
                                      size="small"
                                    />
                                  ) : (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ whiteSpace: "nowrap" }}
                                    >
                                      {formatDateTime(v.expiryDate)}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ whiteSpace: "nowrap" }}
                                >
                                  <Tooltip
                                    title={
                                      !canEdit
                                        ? "Chỉ sửa khi Tạm dừng hoặc Sắp diễn ra"
                                        : "Chỉnh sửa"
                                    }
                                  >
                                    <span>
                                      <IconButton
                                        size="small"
                                        onClick={() => openEditVoucher(v)}
                                        disabled={!canEdit}
                                        sx={{
                                          color: "primary.main",
                                          "&:hover": { bgcolor: "primary.50" },
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip
                                    title={
                                      !canEdit
                                        ? "Chỉ xóa khi Tạm dừng hoặc Sắp diễn ra"
                                        : "Xóa"
                                    }
                                  >
                                    <span>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                          setConfirmDeleteVoucherId(
                                            v.id || null,
                                          )
                                        }
                                        disabled={!canEdit}
                                        sx={{
                                          "&:hover": { bgcolor: "error.50" },
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* ── BulkConfigModal for existing items ── */}
      <BulkConfigModal
        open={bulkEditOpen}
        productCount={itemsSummary.productCount}
        batchCount={itemsSummary.batchCount}
        onClose={() => setBulkEditOpen(false)}
        onApply={(config) => void handleBulkEditApply(config)}
      />

      {/* ── Add Item Selector Dialog ── */}
      <Dialog
        open={itemSelectorOpen}
        onClose={() => !addingItems && setItemSelectorOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: "85vh" } }}
      >
        <DialogTitle>Chọn sản phẩm / lô để thêm vào chiến dịch</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <BulkItemSelector
            selectedItems={existingAsSelected}
            onSelectedItemsChange={(allItems) => {
              // Only add NEW items (not already in campaign)
              const newItems = allItems.filter(
                (ni) => !alreadyAddedKeys.includes(ni.key),
              );
              if (newItems.length > 0) {
                void handleAddSelectedItems(newItems);
              } else {
                setItemSelectorOpen(false);
              }
            }}
          />
        </DialogContent>
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
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            pb: 1.5,
          }}
        >
          <Typography variant="h6" fontWeight={700} component="span">
            {editingVoucher ? "Chỉnh sửa voucher" : "Thêm voucher mới"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5}>
            {/* ── Section 1: Thông tin cơ bản ── */}
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                fontWeight={700}
                letterSpacing={1}
              >
                Thông tin cơ bản
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={2}>
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
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5,
                  }}
                >
                  <FormControl size="small" fullWidth>
                    <InputLabel>Loại giảm giá</InputLabel>
                    <Select
                      value={voucherForm.discountType}
                      label="Loại giảm giá"
                      onChange={(e) =>
                        setVoucherForm({
                          ...voucherForm,
                          discountType: e.target.value as DiscountType,
                          discountValue: 0,
                        })
                      }
                    >
                      {Object.entries(DISCOUNT_TYPE_LABEL).map(
                        ([key, label]) => (
                          <MenuItem key={key} value={key}>
                            {label}
                          </MenuItem>
                        ),
                      )}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Giá trị giảm"
                    size="small"
                    fullWidth
                    required
                    value={
                      voucherForm.discountType === "Percentage"
                        ? voucherForm.discountValue
                        : formatNumberVN(voucherForm.discountValue)
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (voucherForm.discountType === "Percentage") {
                        if (!/^\d*([.,]\d{0,2})?$/.test(value)) return;
                        const num = value ? Number(value.replace(",", ".")) : 0;
                        if (num > 100) return;
                        setVoucherForm({ ...voucherForm, discountValue: num });
                      } else {
                        const parsed = parseNumberVN(value);
                        if (!/^\d*$/.test(parsed)) return;
                        setVoucherForm({
                          ...voucherForm,
                          discountValue: parsed ? Number(parsed) : 0,
                        });
                      }
                    }}
                    placeholder={
                      voucherForm.discountType === "Percentage"
                        ? "VD: 10.5"
                        : "VD: 50.000"
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {voucherForm.discountType === "Percentage"
                            ? "%"
                            : "VND"}
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            {/* ── Section 2: Loại áp dụng ── */}
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                fontWeight={700}
                letterSpacing={1}
              >
                Loại áp dụng
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Loại áp dụng</InputLabel>
                  <Select
                    value={voucherForm.applyType}
                    label="Loại áp dụng"
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        applyType: e.target.value as VoucherType,
                        targetItemType:
                          e.target.value === "Order"
                            ? null
                            : (voucherForm.targetItemType ?? "Regular"),
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
                {voucherForm.applyType === "Product" && (
                  <FormControl size="small" fullWidth required>
                    <InputLabel>Nhóm sản phẩm áp dụng</InputLabel>
                    <Select
                      value={voucherForm.targetItemType ?? ""}
                      label="Nhóm sản phẩm áp dụng"
                      onChange={(e) =>
                        setVoucherForm({
                          ...voucherForm,
                          targetItemType: e.target.value as PromotionType,
                        })
                      }
                    >
                      {Object.entries(PROMOTION_TYPE_LABEL).map(
                        ([key, label]) => (
                          <MenuItem key={key} value={key}>
                            {label}
                          </MenuItem>
                        ),
                      )}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            </Box>

            {/* ── Section 3: Điều kiện áp dụng ── */}
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                fontWeight={700}
                letterSpacing={1}
              >
                Điều kiện áp dụng
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5,
                  }}
                >
                  <TextField
                    label="Đơn tối thiểu (VND)"
                    size="small"
                    fullWidth
                    required
                    value={formatNumberVN(voucherForm.minOrderValue)}
                    onChange={(e) => {
                      const parsed = parseNumberVN(e.target.value);
                      if (!/^\d*$/.test(parsed)) return;
                      setVoucherForm({
                        ...voucherForm,
                        minOrderValue: parsed ? Number(parsed) : 0,
                      });
                    }}
                    placeholder="VD: 500.000"
                  />
                  <TextField
                    label="Giảm tối đa (VND)"
                    size="small"
                    fullWidth
                    value={
                      voucherForm.maxDiscountAmount
                        ? formatNumberVN(voucherForm.maxDiscountAmount)
                        : ""
                    }
                    onChange={(e) => {
                      const parsed = parseNumberVN(e.target.value);
                      if (parsed && !/^\d*$/.test(parsed)) return;
                      setVoucherForm({
                        ...voucherForm,
                        maxDiscountAmount: parsed ? Number(parsed) : null,
                      });
                    }}
                    placeholder="VD: 100.000"
                    helperText="Để trống = không giới hạn"
                    disabled={voucherForm.discountType === "FixedAmount"}
                  />
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5,
                  }}
                >
                  <TextField
                    label="Số lượng mã"
                    type="number"
                    size="small"
                    fullWidth
                    value={voucherForm.totalQuantity ?? ""}
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        totalQuantity: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    placeholder="VD: 100"
                    helperText="Để trống = không giới hạn"
                  />
                  <TextField
                    label="Tối đa / người dùng"
                    type="number"
                    size="small"
                    fullWidth
                    required
                    value={voucherForm.maxUsagePerUser ?? ""}
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        maxUsagePerUser: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    placeholder="VD: 1"
                    helperText="Số lượt tối đa mỗi khách"
                  />
                </Box>
              </Stack>
            </Box>

            {/* ── Section 4: Đối tượng ── */}
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                fontWeight={700}
                letterSpacing={1}
              >
                Đối tượng
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={voucherForm.isMemberOnly}
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        isMemberOnly: e.target.checked,
                      })
                    }
                  />
                }
                label="Chỉ dành cho thành viên (Member Only)"
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            px: 3,
            py: 1.5,
            gap: 1,
          }}
        >
          <Button
            onClick={() => setVoucherDialogOpen(false)}
            variant="outlined"
            color="inherit"
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveVoucher()}
            disabled={isSavingVoucher}
            sx={{ minWidth: 90 }}
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

      {/* ── Confirm Pause/Resume Campaign ── */}
      <Dialog
        open={confirmTogglePause}
        onClose={() => !isTogglingPause && setConfirmTogglePause(false)}
      >
        <DialogTitle>
          {status === "Active" ? "Xác nhận tạm dừng" : "Xác nhận tiếp tục"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {status === "Active"
              ? "Bạn có chắc muốn tạm dừng chiến dịch này?"
              : "Bạn có chắc muốn tiếp tục chạy chiến dịch này?"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmTogglePause(false)}
            disabled={isTogglingPause}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color={status === "Active" ? "warning" : "success"}
            onClick={() => void handleTogglePause()}
            disabled={isTogglingPause}
          >
            {isTogglingPause ? (
              <CircularProgress size={20} />
            ) : status === "Active" ? (
              "Tạm dừng"
            ) : (
              "Tiếp tục"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};
