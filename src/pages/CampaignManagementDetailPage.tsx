import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
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
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Sync from "@mui/icons-material/Sync";
import InventoryIcon from "@mui/icons-material/Inventory";
import EventIcon from "@mui/icons-material/Event";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import ImageIcon from "@mui/icons-material/Image";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
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
import {
  inventoryService,
  type BatchDetailResponse,
  type StockResponse,
} from "@/services/inventoryService";
import { productService } from "@/services/productService";
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

// Helper functions for Vietnamese number formatting
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
  // DB lưu thời gian VN nhưng API trả về như UTC (trừ 7h)
  // Cần cộng 7h để hiển thị đúng giờ VN
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
  // Chuyển giờ VN về UTC (trừ 7h) để gửi lên server
  const d = new Date(local);
  d.setHours(d.getHours() - 7);
  return d.toISOString();
};

// ─── Default Forms ────────────────────────────────────────────────

type SelectedCampaignItem = {
  key: string;
  productVariantId: string;
  batchId: string | null;
  productName: string;
  productImageUrl: string | null | undefined;
  variantAttributes: string;
  variantSku: string;
  variantImageUrl: string | null | undefined;
  batchCode: string | null;
  availableQuantity: number;
  basePrice: number | null;
  retailPrice: number | null;
  promotionType: PromotionType;
  discountType: DiscountType;
  discountValue: number;
  maxUsage: number | null;
};

type CachedBatchState = BatchDetailResponse[];

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

  // ─── Item Selection (Stock & Batch) ───────────────────────────
  const [itemDialogTab, setItemDialogTab] = useState<"select" | "selected">(
    "select",
  );
  const [selectedItems, setSelectedItems] = useState<SelectedCampaignItem[]>(
    [],
  );
  const [stockList, setStockList] = useState<StockResponse[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockPage, setStockPage] = useState(0);
  const [stockRowsPerPage, setStockRowsPerPage] = useState(10);
  const [stockTotalCount, setStockTotalCount] = useState(0);
  const [stockSearchInput, setStockSearchInput] = useState("");
  const [stockSearchValue, setStockSearchValue] = useState("");
  const [batchByVariantId, setBatchByVariantId] = useState<
    Record<string, CachedBatchState>
  >({});
  const [variantPricesCache, setVariantPricesCache] = useState<
    Record<string, { basePrice: number | null; retailPrice: number | null }>
  >({});

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
  const [confirmCancelCampaign, setConfirmCancelCampaign] = useState(false);
  const [isCancellingCampaign, setIsCancellingCampaign] = useState(false);

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
    setItemDialogTab("select");
    setSelectedItems([]);
    setStockPage(0);
    setStockRowsPerPage(10);
    setStockSearchInput("");
    setStockSearchValue("");
    setBatchByVariantId({});
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
    // Don't switch to tab mode for editing
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!campaignId) return;
    // Validate: Create mode requires productVariantId
    if (!editingItem && !itemForm.productVariantId.trim()) {
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
          maxUsage: itemForm.batchId ? null : itemForm.maxUsage,
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
          maxUsage: itemForm.batchId ? null : itemForm.maxUsage,
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

  // ─── Stock & Batch Management ────────────────────────────────
  const loadStocks = useCallback(async () => {
    if (!itemDialogOpen) return;

    try {
      setStockLoading(true);
      setStockError(null);

      const response = await inventoryService.getStock({
        PageNumber: stockPage + 1,
        PageSize: stockRowsPerPage,
        SKU: stockSearchValue || undefined,
      });

      setStockList(response.items || []);
      setStockTotalCount(response.totalCount || 0);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách tồn kho";
      setStockError(message);
      showToast(message, "error");
    } finally {
      setStockLoading(false);
    }
  }, [
    itemDialogOpen,
    stockPage,
    stockRowsPerPage,
    stockSearchValue,
    showToast,
  ]);

  useEffect(() => {
    if (itemDialogOpen && itemDialogTab === "select") {
      void loadStocks();
    }
  }, [itemDialogOpen, itemDialogTab, loadStocks]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStockSearchValue(stockSearchInput);
      setStockPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [stockSearchInput]);

  const loadBatchesByVariantId = useCallback(
    async (variantId: string) => {
      setBatchByVariantId((current) => ({
        ...current,
        [variantId]: [],
      }));

      try {
        const response = await inventoryService.getBatchesByVariant(variantId);
        setBatchByVariantId((current) => ({
          ...current,
          [variantId]: response || [],
        }));
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách batch",
          "error",
        );
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (!itemDialogOpen || stockLoading || itemDialogTab !== "select") return;

    const visibleVariantIds = stockList
      .map((stock) => stock.variantId)
      .filter((variantId): variantId is string => Boolean(variantId));

    visibleVariantIds.forEach((variantId) => {
      if (!batchByVariantId[variantId]) {
        void loadBatchesByVariantId(variantId);
      }
    });
  }, [
    batchByVariantId,
    itemDialogOpen,
    loadBatchesByVariantId,
    stockList,
    stockLoading,
    itemDialogTab,
  ]);

  // Load variant prices
  useEffect(() => {
    if (stockList.length === 0 || itemDialogTab !== "select") return;

    const variantIds = stockList
      .map((s) => s.variantId)
      .filter((id): id is string => Boolean(id))
      .filter((id) => !variantPricesCache[id]);

    if (variantIds.length === 0) return;

    const loadPrices = async () => {
      const results = await Promise.allSettled(
        variantIds.map(async (variantId) => {
          const details = await productService.getVariantById(variantId);
          return {
            variantId,
            basePrice: details.basePrice ?? null,
            retailPrice: details.retailPrice ?? null,
          };
        }),
      );

      const newCache: typeof variantPricesCache = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          newCache[result.value.variantId] = {
            basePrice: result.value.basePrice,
            retailPrice: result.value.retailPrice,
          };
        }
      });

      setVariantPricesCache((current) => ({ ...current, ...newCache }));
    };

    void loadPrices();
  }, [stockList, variantPricesCache, itemDialogTab]);

  const addVariantItem = async (stock: StockResponse) => {
    const variantId = stock.variantId;
    if (!variantId) return;

    const itemKey = `${variantId}-all`;
    if (selectedItems.some((item) => item.key === itemKey)) {
      showToast("Sản phẩm đã được thêm", "warning");
      return;
    }

    const cachedPrice = variantPricesCache[variantId];
    const basePrice = cachedPrice?.basePrice ?? null;
    const retailPrice = cachedPrice?.retailPrice ?? null;

    const variantAttributes = [
      stock.concentrationName,
      stock.volumeMl ? `${stock.volumeMl} ml` : null,
    ]
      .filter(Boolean)
      .join(" • ");

    setSelectedItems((current) => [
      ...current,
      {
        key: itemKey,
        productVariantId: variantId,
        batchId: null,
        productName: stock.productName || "Unknown",
        productImageUrl: stock.variantImageUrl,
        variantAttributes,
        variantSku: stock.variantSku || "",
        variantImageUrl: stock.variantImageUrl,
        batchCode: null,
        availableQuantity: stock.availableQuantity ?? 0,
        basePrice,
        retailPrice,
        promotionType: "Regular",
        discountType: "Percentage",
        discountValue: 0,
        maxUsage: null,
      },
    ]);
    showToast("Đã thêm sản phẩm", "success");
  };

  const addBatchItem = async (
    stock: StockResponse,
    batch: BatchDetailResponse,
  ) => {
    const variantId = stock.variantId;
    const batchId = batch.id;

    if (!variantId || !batchId) return;

    const itemKey = `${variantId}-${batchId}`;
    if (selectedItems.some((item) => item.key === itemKey)) {
      showToast("Batch đã được thêm", "warning");
      return;
    }

    const cachedPrice = variantPricesCache[variantId];
    const basePrice = cachedPrice?.basePrice ?? null;
    const retailPrice = cachedPrice?.retailPrice ?? null;

    const variantAttributes = [
      stock.concentrationName,
      stock.volumeMl ? `${stock.volumeMl} ml` : null,
    ]
      .filter(Boolean)
      .join(" • ");

    setSelectedItems((current) => [
      ...current,
      {
        key: itemKey,
        productVariantId: variantId,
        batchId,
        productName: stock.productName || "Unknown",
        productImageUrl: stock.variantImageUrl,
        variantAttributes,
        variantSku: stock.variantSku || "",
        variantImageUrl: stock.variantImageUrl,
        batchCode: batch.batchCode || null,
        availableQuantity: batch.remainingQuantity ?? 0,
        basePrice,
        retailPrice,
        promotionType: "Regular",
        discountType: "Percentage",
        discountValue: 0,
        maxUsage: null,
      },
    ]);
    showToast("Đã thêm batch", "success");
  };

  const removeSelectedItem = (key: string) => {
    setSelectedItems((current) => current.filter((item) => item.key !== key));
  };

  const handleSelectedFieldChange = <K extends keyof SelectedCampaignItem>(
    key: string,
    field: K,
    value: SelectedCampaignItem[K],
  ) => {
    setSelectedItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSelectedDiscountValueChange = (
    key: string,
    value: string,
    discountType: DiscountType,
  ) => {
    let numericValue = 0;
    if (discountType === "Percentage") {
      if (!/^\d*([.,]\d{0,2})?$/.test(value)) return;
      numericValue = value ? Number(value.replace(",", ".")) : 0;
    } else {
      const parsed = parseNumberVN(value);
      if (!/^\d*$/.test(parsed)) return;
      numericValue = parsed ? Number(parsed) : 0;
    }

    setSelectedItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, discountValue: numericValue } : item,
      ),
    );
  };

  const handleSelectedMaxUsageChange = (key: string, value: number | null) => {
    setSelectedItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;

        // Silently reject invalid values without toast
        if (value !== null) {
          // Reject negative values
          if (value < 0) return item;
          // Reject values exceeding available quantity (for variant items without batch)
          if (!item.batchId && value > item.availableQuantity) return item;
        }

        return { ...item, maxUsage: value };
      }),
    );
  };

  const handleSaveSelectedItems = async () => {
    if (!campaignId) return;
    if (selectedItems.length === 0) {
      showToast("Chưa có sản phẩm nào được chọn", "error");
      return;
    }

    // Validate all items
    for (const item of selectedItems) {
      if (!item.discountValue || item.discountValue <= 0) {
        showToast(
          `Vui lòng nhập giá trị giảm cho ${item.productName}`,
          "error",
        );
        return;
      }
    }

    setIsSavingItem(true);
    try {
      // Create all items
      await Promise.all(
        selectedItems.map((item) => {
          const payload: CreateCampaignPromotionItemRequest = {
            productVariantId: item.productVariantId,
            batchId: item.batchId,
            promotionType: item.promotionType,
            discountType: item.discountType,
            discountValue: item.discountValue,
            maxUsage: item.batchId ? null : item.maxUsage,
          };
          return campaignService.createCampaignItem(campaignId, payload);
        }),
      );

      showToast("Thêm sản phẩm thành công", "success");
      setItemDialogOpen(false);
      setSelectedItems([]);
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

  const handleCancelCampaign = async () => {
    if (!campaignId) return;
    setIsCancellingCampaign(true);
    try {
      await campaignService.updateCampaignStatus(campaignId, "Cancelled");
      showToast("Hủy chiến dịch thành công", "success");
      setConfirmCancelCampaign(false);
      void loadDetail();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Hủy chiến dịch thất bại",
        "error",
      );
    } finally {
      setIsCancellingCampaign(false);
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
                  <IconButton
                    size="small"
                    onClick={() => void loadDetail()}
                    disabled={isLoading}
                    aria-label="Tải lại"
                  >
                    <Sync />
                  </IconButton>
                  <Tooltip
                    title={status !== "Paused" ? "Chỉ sửa khi Tạm dừng" : ""}
                  >
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={openEditCampaign}
                        disabled={status !== "Paused"}
                      >
                        Chỉnh sửa
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={
                      status === "Cancelled" || status === "Completed"
                        ? "Không thể hủy chiến dịch này"
                        : ""
                    }
                  >
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => setConfirmCancelCampaign(true)}
                        disabled={
                          status === "Cancelled" || status === "Completed"
                        }
                      >
                        Hủy chiến dịch
                      </Button>
                    </span>
                  </Tooltip>
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
                    disabled={status !== "Paused"}
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
                                <Tooltip
                                  title={
                                    status !== "Paused"
                                      ? "Chỉ sửa khi Tạm dừng"
                                      : "Sửa"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => openEditItem(item)}
                                      disabled={status !== "Paused"}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip
                                  title={
                                    status !== "Paused"
                                      ? "Chỉ xóa khi Tạm dừng"
                                      : "Xóa"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        setConfirmDeleteItemId(item.id || null)
                                      }
                                      disabled={status !== "Paused"}
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
                    disabled={status !== "Paused"}
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
                                <Tooltip
                                  title={
                                    status !== "Paused"
                                      ? "Chỉ sửa khi Tạm dừng"
                                      : "Sửa"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => openEditVoucher(v)}
                                      disabled={status !== "Paused"}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip
                                  title={
                                    status !== "Paused"
                                      ? "Chỉ xóa khi Tạm dừng"
                                      : "Xóa"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        setConfirmDeleteVoucherId(v.id || null)
                                      }
                                      disabled={status !== "Paused"}
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
              disabled={status !== "Paused"}
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
              disabled={status !== "Paused"}
            />
            <FormControl size="small" fullWidth disabled={status !== "Paused"}>
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
              disabled={status !== "Paused"}
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
              disabled={status !== "Paused"}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveCampaign()}
            disabled={isSavingCampaign || status !== "Paused"}
          >
            {isSavingCampaign ? <CircularProgress size={20} /> : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Item Dialog ── */}
      <Dialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        maxWidth={editingItem ? "sm" : "lg"}
        fullWidth
      >
        <DialogTitle>
          {editingItem ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm vào chiến dịch"}
        </DialogTitle>
        {!editingItem && (
          <Tabs
            value={itemDialogTab}
            onChange={(_, newValue) =>
              setItemDialogTab(newValue as "select" | "selected")
            }
            sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}
          >
            <Tab label="Chọn sản phẩm" value="select" />
            <Tab label={`Đã chọn (${selectedItems.length})`} value="selected" />
          </Tabs>
        )}
        <DialogContent
          sx={{ height: editingItem ? "auto" : 600, p: 3, overflow: "auto" }}
        >
          {editingItem ? (
            <Box>
              {/* Edit mode - simple form */}
              <Stack spacing={3}>
                {/* Product info (read-only) */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Sản phẩm
                  </Typography>
                  <TextField
                    fullWidth
                    value={editingItem.name}
                    disabled
                    size="small"
                  />
                </Box>

                {editingItem.batchId && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Batch ID
                    </Typography>
                    <TextField
                      fullWidth
                      value={editingItem.batchId}
                      disabled
                      size="small"
                    />
                  </Box>
                )}

                {/* Editable fields */}
                <FormControl fullWidth size="small">
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
                    {Object.entries(PROMOTION_TYPE_LABEL).map(
                      ([key, label]) => (
                        <MenuItem key={key} value={key}>
                          {label}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
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
                  fullWidth
                  size="small"
                  label="Giá trị giảm"
                  value={
                    itemForm.discountType === "Percentage"
                      ? itemForm.discountValue
                      : formatNumberVN(String(itemForm.discountValue))
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (itemForm.discountType === "Percentage") {
                      const num = Number(val);
                      if (!isNaN(num)) {
                        setItemForm({ ...itemForm, discountValue: num });
                      }
                    } else {
                      const parsed = parseNumberVN(val);
                      const num = Number(parsed);
                      if (!isNaN(num)) {
                        setItemForm({ ...itemForm, discountValue: num });
                      }
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {itemForm.discountType === "Percentage" ? "%" : "VND"}
                      </InputAdornment>
                    ),
                  }}
                />

                {!editingItem.batchId && (
                  <TextField
                    fullWidth
                    size="small"
                    label="Số lượng tối đa"
                    type="number"
                    value={itemForm.maxUsage ?? ""}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        maxUsage: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    placeholder="Không giới hạn"
                  />
                )}
              </Stack>
            </Box>
          ) : itemDialogTab === "select" ? (
            <Box>
              {/* Search bar */}
              <TextField
                size="small"
                placeholder="Tìm kiếm sản phẩm..."
                fullWidth
                value={stockSearchInput}
                onChange={(e) => setStockSearchInput(e.target.value)}
                sx={{ mb: 2 }}
              />

              {stockLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : stockError ? (
                <Alert severity="error">{stockError}</Alert>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Hình ảnh</TableCell>
                          <TableCell>Sản phẩm</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell>Giá</TableCell>
                          <TableCell>Tồn kho</TableCell>
                          <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stockList.map((stock) => {
                          const variantId = stock.variantId;
                          if (!variantId) return null;

                          const price = variantPricesCache[variantId];
                          const batches = batchByVariantId[variantId];
                          const isLoadingBatches = batches === undefined;

                          const variantAttributes = [
                            stock.concentrationName,
                            stock.volumeMl ? `${stock.volumeMl} ml` : null,
                          ]
                            .filter(Boolean)
                            .join(" • ");

                          return (
                            <React.Fragment key={variantId}>
                              <TableRow hover>
                                <TableCell>
                                  <Avatar
                                    src={stock.variantImageUrl}
                                    alt={stock.productName}
                                    variant="rounded"
                                    sx={{ width: 56, height: 56 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>
                                    {stock.productName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {variantAttributes}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {stock.variantSku}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {price ? (
                                    <Typography variant="body2">
                                      {formatNumberVN(
                                        String(
                                          price.retailPrice ||
                                            price.basePrice ||
                                            0,
                                        ),
                                      )}{" "}
                                      VND
                                    </Typography>
                                  ) : (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Đang tải...
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {stock.totalQuantity}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    justifyContent="flex-end"
                                  >
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => addVariantItem(stock)}
                                    >
                                      Thêm sản phẩm
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() =>
                                        void loadBatchesByVariantId(variantId)
                                      }
                                      disabled={isLoadingBatches}
                                    >
                                      {isLoadingBatches
                                        ? "Đang tải..."
                                        : "Xem batch"}
                                    </Button>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                              {/* Batch rows */}
                              {batches && batches.length > 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={6}
                                    sx={{ py: 0, bgcolor: "grey.50" }}
                                  >
                                    <Box p={2}>
                                      <Typography
                                        variant="caption"
                                        fontWeight={600}
                                        color="text.secondary"
                                        mb={1}
                                        display="block"
                                      >
                                        Danh sách batch:
                                      </Typography>
                                      <Stack spacing={1}>
                                        {batches.map((batch) => (
                                          <Paper
                                            key={batch.id}
                                            variant="outlined"
                                            sx={{
                                              p: 1.5,
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 2,
                                            }}
                                          >
                                            <Box flex={1}>
                                              <Typography
                                                variant="body2"
                                                fontWeight={500}
                                              >
                                                Batch: {batch.batchCode}
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                              >
                                                HSD:{" "}
                                                {batch.expiryDate
                                                  ? new Date(
                                                      batch.expiryDate,
                                                    ).toLocaleDateString(
                                                      "vi-VN",
                                                    )
                                                  : "N/A"}{" "}
                                                • Số lượng:{" "}
                                                {batch.remainingQuantity ?? 0}
                                              </Typography>
                                            </Box>
                                            <Button
                                              size="small"
                                              variant="contained"
                                              onClick={() =>
                                                addBatchItem(stock, batch)
                                              }
                                            >
                                              Thêm batch
                                            </Button>
                                          </Paper>
                                        ))}
                                      </Stack>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={stockTotalCount}
                    page={stockPage}
                    onPageChange={(_, newPage) => setStockPage(newPage)}
                    rowsPerPage={stockRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setStockRowsPerPage(Number(e.target.value));
                      setStockPage(0);
                    }}
                    labelRowsPerPage="Số dòng:"
                  />
                </>
              )}
            </Box>
          ) : (
            <Box>
              {selectedItems.length === 0 ? (
                <Alert severity="info">
                  Chưa có sản phẩm nào được chọn. Vui lòng chọn sản phẩm từ tab
                  "Chọn sản phẩm".
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Hình ảnh</TableCell>
                        <TableCell>Sản phẩm</TableCell>
                        <TableCell>Batch</TableCell>
                        <TableCell>Loại KM</TableCell>
                        <TableCell>Loại giảm</TableCell>
                        <TableCell>Giá trị giảm</TableCell>
                        <TableCell>Số lượng tối đa</TableCell>
                        <TableCell align="center">Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedItems.map((item) => (
                        <TableRow key={item.key}>
                          <TableCell sx={{ verticalAlign: "top", py: 1.5 }}>
                            <Avatar
                              src={item.productImageUrl || undefined}
                              alt={item.productName}
                              variant="rounded"
                              sx={{ width: 40, height: 40 }}
                            />
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "top", py: 1.5 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {item.productName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.variantAttributes}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "top", py: 1.5 }}>
                            {item.batchCode ? (
                              <Chip label={item.batchCode} size="small" />
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Tất cả
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "top", py: 1.5 }}>
                            <FormControl
                              size="small"
                              fullWidth
                              sx={{ minWidth: 120 }}
                            >
                              <Select
                                value={item.promotionType}
                                onChange={(e) =>
                                  handleSelectedFieldChange(
                                    item.key,
                                    "promotionType",
                                    e.target.value as PromotionType,
                                  )
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
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "top", py: 1.5 }}>
                            <FormControl
                              size="small"
                              fullWidth
                              sx={{ minWidth: 100 }}
                            >
                              <Select
                                value={item.discountType}
                                onChange={(e) =>
                                  handleSelectedFieldChange(
                                    item.key,
                                    "discountType",
                                    e.target.value as DiscountType,
                                  )
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
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "top", py: 1.5 }}>
                            <TextField
                              size="small"
                              fullWidth
                              value={
                                item.discountType === "Percentage"
                                  ? item.discountValue
                                  : formatNumberVN(String(item.discountValue))
                              }
                              onChange={(e) =>
                                handleSelectedDiscountValueChange(
                                  item.key,
                                  e.target.value,
                                  item.discountType,
                                )
                              }
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    {item.discountType === "Percentage"
                                      ? "%"
                                      : "VND"}
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ minWidth: 120 }}
                            />
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "top", py: 1.5 }}>
                            {item.batchId ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                N/A
                              </Typography>
                            ) : (
                              <Box>
                                <TextField
                                  size="small"
                                  type="number"
                                  fullWidth
                                  value={item.maxUsage ?? ""}
                                  onChange={(e) =>
                                    handleSelectedMaxUsageChange(
                                      item.key,
                                      e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    )
                                  }
                                  placeholder="Không giới hạn"
                                  inputProps={{
                                    min: 0,
                                    max: item.availableQuantity,
                                  }}
                                  sx={{ minWidth: 100 }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: "block", mt: 0.5 }}
                                >
                                  Tồn kho: {item.availableQuantity}
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ verticalAlign: "top", py: 1.5 }}
                          >
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeSelectedItem(item.key)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>Hủy</Button>
          {editingItem ? (
            <Button
              variant="contained"
              onClick={() => void handleSaveItem()}
              disabled={isSavingItem}
            >
              {isSavingItem ? <CircularProgress size={20} /> : "Lưu"}
            </Button>
          ) : (
            itemDialogTab === "selected" &&
            selectedItems.length > 0 && (
              <Button
                variant="contained"
                onClick={() => void handleSaveSelectedItems()}
                disabled={isSavingItem}
              >
                {isSavingItem ? (
                  <CircularProgress size={20} />
                ) : (
                  `Lưu ${selectedItems.length} sản phẩm`
                )}
              </Button>
            )
          )}
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
                  // Allow decimal for percentage
                  if (!/^\d*([.,]\d{0,2})?$/.test(value)) return;
                  setVoucherForm({
                    ...voucherForm,
                    discountValue: value ? Number(value.replace(",", ".")) : 0,
                  });
                } else {
                  // Only digits for fixed amount
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
                    {voucherForm.discountType === "Percentage" ? "%" : "VND"}
                  </InputAdornment>
                ),
              }}
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
              label="Số lượng mã"
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
              placeholder="VD: 100"
              helperText="Để trống = không giới hạn"
            />
            <TextField
              label="Tối đa / người dùng"
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
              placeholder="VD: 1"
              helperText="Để trống = không giới hạn"
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

      {/* ── Confirm Cancel Campaign ── */}
      <Dialog
        open={confirmCancelCampaign}
        onClose={() => !isCancellingCampaign && setConfirmCancelCampaign(false)}
      >
        <DialogTitle>Xác nhận hủy chiến dịch</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn hủy chiến dịch này? Hành động này không thể
            hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmCancelCampaign(false)}
            disabled={isCancellingCampaign}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleCancelCampaign()}
            disabled={isCancellingCampaign}
          >
            {isCancellingCampaign ? (
              <CircularProgress size={20} />
            ) : (
              "Xác nhận hủy"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};
