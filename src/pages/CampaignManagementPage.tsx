import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Add as AddIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  SwapHoriz as StatusIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useToast } from "@/hooks/useToast";
import {
  campaignService,
  type CampaignPromotionItemResponse,
  type CampaignResponse,
  type CampaignStatus,
  type CampaignType,
  type CreateCampaignRequest,
  type DiscountType,
  type PromotionType,
  type VoucherType,
  type UpdateCampaignStatusRequest,
} from "@/services/campaignService";
import {
  inventoryService,
  type BatchDetailResponse,
  type StockResponse,
} from "@/services/inventoryService";

type CampaignStatusTab = "all" | CampaignStatus;
type StockStatusFilter = NonNullable<StockResponse["status"]> | "";
type ExpiryDaysFilter = "" | "30" | "60" | "90";
type CampaignCategoryTab =
  | "all"
  | "men"
  | "women"
  | "unisex"
  | "niche"
  | "giftset";

type SelectedCampaignItem = {
  key: string;
  productVariantId: string;
  batchId: string | null;
  productName: string;
  variantSku: string;
  batchCode: string | null;
  availableQuantity: number;
  promotionType: PromotionType;
  maxUsageInput: string;
};

type CampaignVoucherDraft = {
  key: string;
  code: string;
  discountValueInput: string;
  discountType: DiscountType;
  applyType: VoucherType;
  targetItemType: PromotionType | "";
};

type CachedBatchState = {
  items: BatchDetailResponse[];
  loading: boolean;
  error: string | null;
};

const CAMPAIGN_STATUS_TABS: Array<{ value: CampaignStatusTab; label: string }> =
  [
    { value: "all", label: "Tất cả" },
    { value: "Upcoming", label: "Sắp diễn ra" },
    { value: "Active", label: "Đang diễn ra" },
    { value: "Paused", label: "Tạm dừng" },
    { value: "Completed", label: "Hoàn thành" },
    { value: "Cancelled", label: "Đã hủy" },
  ];

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

const PROMOTION_TYPE_OPTIONS: Array<{ value: PromotionType; label: string }> = [
  { value: "Clearance", label: "Clearance" },
  { value: "NewArrival", label: "New Arrival" },
  { value: "Regular", label: "Regular" },
];

const PROMOTION_TYPE_LABEL: Record<PromotionType, string> = {
  Clearance: "Clearance",
  NewArrival: "New Arrival",
  Regular: "Regular",
};

const DISCOUNT_TYPE_OPTIONS: Array<{ value: DiscountType; label: string }> = [
  { value: "Percentage", label: "Phần trăm (%)" },
  { value: "FixedAmount", label: "Số tiền cố định" },
];

const VOUCHER_APPLY_TYPE_OPTIONS: Array<{ value: VoucherType; label: string }> =
  [
    { value: "Product", label: "Theo sản phẩm" },
    { value: "Order", label: "Theo đơn hàng" },
  ];

const createEmptyVoucherDraft = (): CampaignVoucherDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  code: "",
  discountValueInput: "",
  discountType: "Percentage",
  applyType: "Product",
  targetItemType: "Regular",
});

const INVENTORY_CATEGORY_TAB_ITEMS: Array<{
  key: CampaignCategoryTab;
  label: string;
}> = [
  { key: "all", label: "Tất cả" },
  { key: "men", label: "Nước hoa Nam" },
  { key: "women", label: "Nước hoa Nữ" },
  { key: "unisex", label: "Unisex" },
  { key: "niche", label: "Niche" },
  { key: "giftset", label: "Giftset" },
];

const INVENTORY_CATEGORY_ID_BY_TAB: Record<
  Exclude<CampaignCategoryTab, "all">,
  number
> = {
  women: 1,
  men: 2,
  unisex: 3,
  niche: 4,
  giftset: 5,
};

const EXPIRY_FILTER_OPTIONS: Array<{ value: ExpiryDaysFilter; label: string }> =
  [
    { value: "", label: "Tất cả hạn dùng" },
    { value: "30", label: "Sắp hết hạn <= 30 ngày" },
    { value: "60", label: "Sắp hết hạn <= 60 ngày" },
    { value: "90", label: "Sắp hết hạn <= 90 ngày" },
  ];

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString("vi-VN");
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString("vi-VN");
};

const DEFAULT_END_TIME = "23:59";

const toLocalDateTime = (
  dateValue: string,
  timeValue: string,
  withFraction = false,
) => {
  if (!dateValue || !timeValue) {
    return "";
  }

  return `${dateValue}T${timeValue}:00${withFraction ? ".00" : ""}`;
};

const resolveCategoryIdByTab = (tab: CampaignCategoryTab) => {
  if (tab === "all") {
    return undefined;
  }

  return INVENTORY_CATEGORY_ID_BY_TAB[tab];
};

const getStockStatusDisplay = (stock: StockResponse) => {
  if (stock.status === "OutOfStock") {
    return { label: "Hết hàng", color: "error" as const };
  }

  if (stock.status === "LowStock") {
    return { label: "Sắp hết", color: "warning" as const };
  }

  return { label: "Bình thường", color: "success" as const };
};

export const CampaignManagementPage = () => {
  const { showToast } = useToast();

  const [statusTab, setStatusTab] = useState<CampaignStatusTab>("all");
  const [campaigns, setCampaigns] = useState<CampaignResponse[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaignPage, setCampaignPage] = useState(0);
  const [campaignRowsPerPage, setCampaignRowsPerPage] = useState(10);
  const [campaignTotalCount, setCampaignTotalCount] = useState(0);
  const [campaignSearchInput, setCampaignSearchInput] = useState("");
  const [campaignSearchValue, setCampaignSearchValue] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedCampaignDetail, setSelectedCampaignDetail] =
    useState<CampaignResponse | null>(null);
  const [selectedCampaignItems, setSelectedCampaignItems] = useState<
    CampaignPromotionItemResponse[]
  >([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [deleteConfirmCampaign, setDeleteConfirmCampaign] = useState<CampaignResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusDialogCampaign, setStatusDialogCampaign] = useState<CampaignResponse | null>(null);
  const [statusChangeValue, setStatusChangeValue] = useState<CampaignStatus>("Upcoming");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
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

  const [stockList, setStockList] = useState<StockResponse[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockPage, setStockPage] = useState(0);
  const [stockRowsPerPage, setStockRowsPerPage] = useState(10);
  const [stockTotalCount, setStockTotalCount] = useState(0);
  const [stockSearchInput, setStockSearchInput] = useState("");
  const [stockSearchValue, setStockSearchValue] = useState("");
  const [stockStatusFilter, setStockStatusFilter] =
    useState<StockStatusFilter>("");
  const [expiryDaysFilter, setExpiryDaysFilter] =
    useState<ExpiryDaysFilter>("");
  const [selectedCategoryTab, setSelectedCategoryTab] =
    useState<CampaignCategoryTab>("all");

  const [batchByVariantId, setBatchByVariantId] = useState<
    Record<string, CachedBatchState>
  >({});

  const [selectedItems, setSelectedItems] = useState<SelectedCampaignItem[]>(
    [],
  );
  const [campaignVouchers, setCampaignVouchers] = useState<
    CampaignVoucherDraft[]
  >([createEmptyVoucherDraft()]);

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaignLoading(true);
      setCampaignError(null);

      const response = await campaignService.getCampaigns({
        SearchTerm: campaignSearchValue || undefined,
        Status: statusTab === "all" ? undefined : statusTab,
        PageNumber: campaignPage + 1,
        PageSize: campaignRowsPerPage,
        SortBy: "StartDate",
        SortOrder: "desc",
      });

      setCampaigns(response.items || []);
      setCampaignTotalCount(response.totalCount || 0);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách chiến lược";
      setCampaignError(message);
      showToast(message, "error");
    } finally {
      setCampaignLoading(false);
    }
  }, [
    campaignPage,
    campaignRowsPerPage,
    campaignSearchValue,
    showToast,
    statusTab,
  ]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const loadStocks = useCallback(async () => {
    if (!createDialogOpen) {
      return;
    }

    const selectedCategoryId = resolveCategoryIdByTab(selectedCategoryTab);

    try {
      setStockLoading(true);
      setStockError(null);

      const baseQuery: {
        CategoryId?: number;
        StockStatus?: NonNullable<StockResponse["status"]>;
        DaysUntilExpiry?: number;
        PageNumber: number;
        PageSize: number;
        SortBy: string;
        SortOrder: string;
      } = {
        PageNumber: stockPage + 1,
        PageSize: stockRowsPerPage,
        SortBy: "ProductName",
        SortOrder: "asc",
      };

      if (stockStatusFilter) {
        baseQuery.StockStatus = stockStatusFilter;
      }

      if (selectedCategoryId) {
        baseQuery.CategoryId = selectedCategoryId;
      }

      if (expiryDaysFilter) {
        baseQuery.DaysUntilExpiry = Number(expiryDaysFilter);
      }

      const normalizedSearch = stockSearchValue.trim();

      if (!normalizedSearch) {
        const response = await inventoryService.getStock(baseQuery);
        setStockList(response.items || []);
        setStockTotalCount(response.totalCount || 0);
        return;
      }

      const bySku = await inventoryService.getStock({
        ...baseQuery,
        SKU: normalizedSearch,
      });

      if ((bySku.items || []).length > 0) {
        setStockList(bySku.items || []);
        setStockTotalCount(bySku.totalCount || 0);
        return;
      }

      const byBatchCode = await inventoryService.getStock({
        ...baseQuery,
        BatchCode: normalizedSearch,
      });

      setStockList(byBatchCode.items || []);
      setStockTotalCount(byBatchCode.totalCount || 0);
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
    createDialogOpen,
    expiryDaysFilter,
    selectedCategoryTab,
    showToast,
    stockPage,
    stockRowsPerPage,
    stockSearchValue,
    stockStatusFilter,
  ]);

  useEffect(() => {
    if (!createDialogOpen) {
      return;
    }

    void loadStocks();
  }, [createDialogOpen, loadStocks]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalizedValue = campaignSearchInput.trim();
      setCampaignSearchValue((currentValue) =>
        currentValue === normalizedValue ? currentValue : normalizedValue,
      );
      setCampaignPage((currentPage) => (currentPage === 0 ? currentPage : 0));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [campaignSearchInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalizedValue = stockSearchInput.trim();
      setStockSearchValue((currentValue) =>
        currentValue === normalizedValue ? currentValue : normalizedValue,
      );
      setStockPage((currentPage) => (currentPage === 0 ? currentPage : 0));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [stockSearchInput]);

  const handleOpenCreateDialog = () => {
    setCreateForm({
      name: "",
      description: "",
      type: "FlashSale",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: DEFAULT_END_TIME,
    });
    setIsEndTimeManuallyEdited(false);
    setSelectedItems([]);
    setStockPage(0);
    setStockRowsPerPage(10);
    setStockSearchInput("");
    setStockSearchValue("");
    setStockStatusFilter("");
    setExpiryDaysFilter("");
    setSelectedCategoryTab("all");
    setBatchByVariantId({});
    setCampaignVouchers([createEmptyVoucherDraft()]);
    setCreateDialogOpen(true);
  };

  const addCampaignVoucher = () => {
    setCampaignVouchers((current) => [...current, createEmptyVoucherDraft()]);
  };

  const removeCampaignVoucher = (key: string) => {
    setCampaignVouchers((current) => {
      const next = current.filter((voucher) => voucher.key !== key);
      return next.length > 0 ? next : [createEmptyVoucherDraft()];
    });
  };

  const handleVoucherFieldChange = <K extends keyof CampaignVoucherDraft>(
    key: string,
    field: K,
    value: CampaignVoucherDraft[K],
  ) => {
    setCampaignVouchers((current) =>
      current.map((voucher) => {
        if (voucher.key !== key) {
          return voucher;
        }

        if (field === "applyType") {
          const nextApplyType = value as VoucherType;
          return {
            ...voucher,
            applyType: nextApplyType,
            targetItemType:
              nextApplyType === "Product"
                ? voucher.targetItemType || "Regular"
                : "",
          };
        }

        return {
          ...voucher,
          [field]: value,
        };
      }),
    );
  };

  const loadBatchesByVariantId = useCallback(async (variantId: string) => {
    setBatchByVariantId((current) => ({
      ...current,
      [variantId]: {
        items: current[variantId]?.items || [],
        loading: true,
        error: null,
      },
    }));

    try {
      const response = await inventoryService.getBatchesByVariant(variantId);

      setBatchByVariantId((current) => ({
        ...current,
        [variantId]: {
          items: response,
          loading: false,
          error: null,
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải danh sách lô";
      setBatchByVariantId((current) => ({
        ...current,
        [variantId]: {
          items: [],
          loading: false,
          error: message,
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!createDialogOpen || stockLoading) {
      return;
    }

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
    createDialogOpen,
    loadBatchesByVariantId,
    stockList,
    stockLoading,
  ]);

  const addVariantItem = (stock: StockResponse) => {
    const variantId = stock.variantId;
    if (!variantId) {
      showToast("Variant không hợp lệ", "warning");
      return;
    }

    const itemKey = `${variantId}-all`;
    setSelectedItems((current) => {
      if (current.some((item) => item.key === itemKey)) {
        showToast("Sản phẩm đã được thêm", "warning");
        return current;
      }

      return [
        ...current,
        {
          key: itemKey,
          productVariantId: variantId,
          batchId: null,
          productName: stock.productName || "N/A",
          variantSku: stock.variantSku || "N/A",
          batchCode: null,
          availableQuantity: stock.availableQuantity ?? 0,
          promotionType: "Clearance",
          maxUsageInput: "1",
        },
      ];
    });
  };

  const addBatchItem = (stock: StockResponse, batch: BatchDetailResponse) => {
    const variantId = stock.variantId;
    const batchId = batch.id;

    if (!variantId || !batchId) {
      showToast("Batch hoặc Variant không hợp lệ", "warning");
      return;
    }

    const itemKey = `${variantId}-${batchId}`;

    setSelectedItems((current) => {
      if (current.some((item) => item.key === itemKey)) {
        showToast("Lô đã được thêm", "warning");
        return current;
      }

      return [
        ...current,
        {
          key: itemKey,
          productVariantId: variantId,
          batchId,
          productName: stock.productName || batch.productName || "N/A",
          variantSku: stock.variantSku || batch.variantSku || "N/A",
          batchCode: batch.batchCode || "N/A",
          availableQuantity: batch.remainingQuantity ?? 0,
          promotionType: "Clearance",
          maxUsageInput: "",
        },
      ];
    });
  };

  const removeSelectedItem = (key: string) => {
    setSelectedItems((current) => current.filter((item) => item.key !== key));
  };

  const handleSelectedMaxUsageChange = (key: string, value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setSelectedItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, maxUsageInput: value } : item,
      ),
    );
  };

  const handleSelectedPromotionTypeChange = (
    key: string,
    promotionType: PromotionType,
  ) => {
    setSelectedItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, promotionType } : item,
      ),
    );
  };

  const selectedSummary = useMemo(() => {
    const batchItems = selectedItems.filter((item) => item.batchId);
    const productItems = selectedItems.filter((item) => !item.batchId);

    return {
      total: selectedItems.length,
      batchCount: batchItems.length,
      productCount: productItems.length,
    };
  }, [selectedItems]);

  const selectedPromotionTypes = useMemo(() => {
    const typeSet = new Set<PromotionType>();

    selectedItems.forEach((item) => {
      typeSet.add(item.promotionType);
    });

    return Array.from(typeSet);
  }, [selectedItems]);

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
      showToast("Vui lòng nhập tên chiến lược", "warning");
      return;
    }

    if (!startDateTime || !endDateTime) {
      showToast("Vui lòng nhập thời gian bắt đầu và kết thúc", "warning");
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
      if (item.batchId) {
        return false;
      }

      const parsed = Number(item.maxUsageInput);
      return !Number.isInteger(parsed) || parsed <= 0;
    });

    if (invalidItem) {
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

      if (!code) {
        showToast(`Voucher #${rowNumber}: vui lòng nhập mã voucher`, "warning");
        return;
      }

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

      if (voucher.applyType === "Product") {
        const targetType = voucher.targetItemType;
        if (!targetType) {
          showToast(
            `Voucher #${rowNumber}: vui lòng chọn loại item áp dụng`,
            "warning",
          );
          return;
        }

        if (!selectedPromotionTypes.includes(targetType)) {
          showToast(
            `Voucher #${rowNumber}: chưa có item thuộc loại ${PROMOTION_TYPE_LABEL[targetType]}`,
            "warning",
          );
          return;
        }
      }

      normalizedVoucherCodes.add(code);
      const targetItemType =
        voucher.applyType === "Product" && voucher.targetItemType
          ? voucher.targetItemType
          : undefined;

      parsedVouchers.push({
        code,
        discountValue,
        discountType: voucher.discountType,
        applyType: voucher.applyType,
        targetItemType,
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
        maxUsage: item.batchId ? null : Number(item.maxUsageInput),
      })),
      vouchers: parsedVouchers,
    };

    try {
      setCreateSubmitting(true);
      await campaignService.createCampaign(payload);
      showToast("Tạo chiến lược khuyến mãi thành công", "success");
      setCreateDialogOpen(false);
      void loadCampaigns();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tạo chiến lược";
      showToast(message, "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenCampaignDetail = async (campaignId?: string) => {
    if (!campaignId) {
      return;
    }

    try {
      setDetailDialogOpen(true);
      setDetailLoading(true);
      setDetailError(null);

      const [detail, items] = await Promise.all([
        campaignService.getCampaignById(campaignId),
        campaignService.getCampaignItems(campaignId),
      ]);

      setSelectedCampaignDetail(detail);
      setSelectedCampaignItems(items);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải chi tiết chiến lược";
      setDetailError(message);
      setSelectedCampaignDetail(null);
      setSelectedCampaignItems([]);
      showToast(message, "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseCampaignDetail = () => {
    setDetailDialogOpen(false);
    setSelectedCampaignDetail(null);
    setSelectedCampaignItems([]);
    setDetailError(null);
  };

  const handleDeleteCampaign = async () => {
    if (!deleteConfirmCampaign?.id) return;
    setIsDeleting(true);
    try {
      await campaignService.deleteCampaign(deleteConfirmCampaign.id);
      showToast("Đã xóa chiến lược", "success");
      setDeleteConfirmCampaign(null);
      void loadCampaigns();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể xóa chiến lược", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusDialogCampaign?.id) return;
    setIsUpdatingStatus(true);
    try {
      await campaignService.updateCampaignStatus(statusDialogCampaign.id, statusChangeValue);
      showToast("Đã cập nhật trạng thái", "success");
      setStatusDialogCampaign(null);
      void loadCampaigns();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật trạng thái", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={statusTab}
            onChange={(_, nextValue: CampaignStatusTab) => {
              setStatusTab(nextValue);
              setCampaignPage(0);
            }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            {CAMPAIGN_STATUS_TABS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                md: "1fr auto",
              },
              alignItems: "center",
            }}
          >
            <TextField
              fullWidth
              label="Tìm theo tên chiến lược"
              value={campaignSearchInput}
              onChange={(event) => setCampaignSearchInput(event.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              sx={{ height: 56 }}
            >
              Tạo chiến lược
            </Button>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Tên chiến lược</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Thời gian</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Mô tả</TableCell>
                <TableCell align="center" width={110}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaignLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : campaignError ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Alert severity="error">{campaignError}</Alert>
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không có chiến lược phù hợp.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => {
                  const status = campaign.status || "Upcoming";
                  const type = campaign.type || "FlashSale";

                  return (
                    <TableRow
                      key={
                        campaign.id || `${campaign.name}-${campaign.startDate}`
                      }
                      hover
                      onClick={() => handleOpenCampaignDetail(campaign.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell sx={{ minWidth: 220 }}>
                        <Typography fontWeight={600}>
                          {campaign.name || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>{CAMPAIGN_TYPE_LABEL[type]}</TableCell>
                      <TableCell sx={{ minWidth: 250 }}>
                        <Typography variant="body2">
                          Bắt đầu: {formatDateTime(campaign.startDate)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Kết thúc: {formatDateTime(campaign.endDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={CAMPAIGN_STATUS_COLOR[status]}
                          label={CAMPAIGN_STATUS_LABEL[status]}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {campaign.description || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Đổi trạng thái">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setStatusDialogCampaign(campaign);
                              setStatusChangeValue(campaign.status || "Upcoming");
                            }}
                          >
                            <StatusIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa chiến lược">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteConfirmCampaign(campaign)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={campaignTotalCount}
            page={campaignPage}
            onPageChange={(_, nextPage) => setCampaignPage(nextPage)}
            rowsPerPage={campaignRowsPerPage}
            onRowsPerPageChange={(event) => {
              setCampaignRowsPerPage(Number(event.target.value));
              setCampaignPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Dòng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} của ${count}`
            }
          />
        </TableContainer>

        <Dialog
          open={detailDialogOpen}
          onClose={handleCloseCampaignDetail}
          fullWidth
          maxWidth="lg"
        >
          <DialogTitle>Chi tiết chiến lược</DialogTitle>
          <DialogContent>
            {detailLoading ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
              </Box>
            ) : detailError ? (
              <Alert severity="error" sx={{ mt: 1 }}>
                {detailError}
              </Alert>
            ) : !selectedCampaignDetail ? (
              <Typography sx={{ mt: 1 }} color="text.secondary">
                Không có dữ liệu chiến lược.
              </Typography>
            ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  }}
                >
                  <Typography variant="body2">
                    <strong>Tên:</strong> {selectedCampaignDetail.name || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Loại:</strong>{" "}
                    {
                      CAMPAIGN_TYPE_LABEL[
                        selectedCampaignDetail.type || "FlashSale"
                      ]
                    }
                  </Typography>
                  <Typography variant="body2">
                    <strong>Bắt đầu:</strong>{" "}
                    {formatDateTime(selectedCampaignDetail.startDate)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Kết thúc:</strong>{" "}
                    {formatDateTime(selectedCampaignDetail.endDate)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ gridColumn: { md: "1 / -1" } }}
                  >
                    <strong>Mô tả:</strong>{" "}
                    {selectedCampaignDetail.description || "-"}
                  </Typography>
                </Box>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tên item</TableCell>
                        <TableCell>Variant ID</TableCell>
                        <TableCell>Batch ID</TableCell>
                        <TableCell align="center">Promotion Type</TableCell>
                        <TableCell align="center">Max Usage</TableCell>
                        <TableCell align="center">Current Usage</TableCell>
                        <TableCell align="center">
                          Tự dừng khi hết batch
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedCampaignItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                              Chiến lược chưa có item.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedCampaignItems.map((item) => (
                          <TableRow
                            key={
                              item.id ||
                              `${item.productVariantId}-${item.batchId}`
                            }
                          >
                            <TableCell>{item.name || "N/A"}</TableCell>
                            <TableCell>
                              {item.productVariantId || "N/A"}
                            </TableCell>
                            <TableCell>{item.batchId || "-"}</TableCell>
                            <TableCell align="center">
                              {
                                PROMOTION_TYPE_LABEL[
                                  item.itemType || "Clearance"
                                ]
                              }
                            </TableCell>
                            <TableCell align="center">
                              {item.maxUsage ?? "-"}
                            </TableCell>
                            <TableCell align="center">
                              {item.currentUsage ?? 0}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                color={
                                  item.autoStopWhenBatchEmpty
                                    ? "success"
                                    : "default"
                                }
                                label={
                                  item.autoStopWhenBatchEmpty ? "Có" : "Không"
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCampaignDetail}>Đóng</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog
          open={Boolean(deleteConfirmCampaign)}
          onClose={() => setDeleteConfirmCampaign(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogContent>
            <Typography>
              Bạn có chắc muốn xóa chiến lược{" "}
              <strong>&ldquo;{deleteConfirmCampaign?.name}&rdquo;</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmCampaign(null)} disabled={isDeleting}>Hủy</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteCampaign}
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              Xóa
            </Button>
          </DialogActions>
        </Dialog>

        {/* Status Change Dialog */}
        <Dialog
          open={Boolean(statusDialogCampaign)}
          onClose={() => setStatusDialogCampaign(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Đổi trạng thái chiến lược</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Chiến lược: <strong>{statusDialogCampaign?.name}</strong>
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Trạng thái mới</InputLabel>
              <Select
                value={statusChangeValue}
                label="Trạng thái mới"
                onChange={(e) => setStatusChangeValue(e.target.value as CampaignStatus)}
              >
                {(Object.keys(CAMPAIGN_STATUS_LABEL) as CampaignStatus[]).map((s) => (
                  <MenuItem key={s} value={s}>{CAMPAIGN_STATUS_LABEL[s]}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusDialogCampaign(null)} disabled={isUpdatingStatus}>Hủy</Button>
            <Button
              variant="contained"
              onClick={handleUpdateStatus}
              disabled={isUpdatingStatus}
              startIcon={isUpdatingStatus ? <CircularProgress size={16} /> : <StatusIcon />}
            >
              Cập nhật
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          fullWidth
          maxWidth="xl"
          PaperProps={{
            sx: {
              height: { xs: "92vh", lg: "88vh" },
              maxHeight: { xs: "92vh", lg: "88vh" },
            },
          }}
        >
          <DialogContent
            sx={{
              overflow: "hidden",
              display: "flex",
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                mt: 1,
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  lg: "minmax(0, 1.15fr) minmax(0, 1fr)",
                },
                alignItems: "start",
                minHeight: 0,
                height: "100%",
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  height: "100%",
                }}
              >
                <Stack spacing={2} sx={{ minHeight: 0, flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Chọn hàng / lô để thêm vào chiến lược khuyến mãi
                  </Typography>

                  <Paper variant="outlined">
                    <Tabs
                      value={selectedCategoryTab}
                      onChange={(_, nextValue: CampaignCategoryTab) => {
                        setSelectedCategoryTab(nextValue);
                        setStockPage(0);
                      }}
                      variant="scrollable"
                      scrollButtons="auto"
                      allowScrollButtonsMobile
                    >
                      {INVENTORY_CATEGORY_TAB_ITEMS.map((tab) => (
                        <Tab key={tab.key} value={tab.key} label={tab.label} />
                      ))}
                    </Tabs>
                  </Paper>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "1.3fr 1fr 1fr auto",
                      },
                    }}
                  >
                    <TextField
                      label="SKU / Batch code"
                      value={stockSearchInput}
                      onChange={(event) =>
                        setStockSearchInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setStockSearchValue(stockSearchInput.trim());
                          setStockPage(0);
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={() => {
                                setStockSearchValue(stockSearchInput.trim());
                                setStockPage(0);
                              }}
                            >
                              <SearchIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <FormControl fullWidth>
                      <InputLabel>Trạng thái</InputLabel>
                      <Select
                        value={stockStatusFilter}
                        label="Trạng thái"
                        onChange={(event) => {
                          setStockStatusFilter(
                            event.target.value as StockStatusFilter,
                          );
                          setStockPage(0);
                        }}
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="OutOfStock">Hết hàng</MenuItem>
                        <MenuItem value="LowStock">Sắp hết</MenuItem>
                        <MenuItem value="Normal">Bình thường</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Hạn dùng</InputLabel>
                      <Select
                        value={expiryDaysFilter}
                        label="Hạn dùng"
                        onChange={(event) => {
                          setExpiryDaysFilter(
                            event.target.value as ExpiryDaysFilter,
                          );
                          setStockPage(0);
                        }}
                      >
                        {EXPIRY_FILTER_OPTIONS.map((option) => (
                          <MenuItem
                            key={option.value || "all-expiry"}
                            value={option.value}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Button
                      variant="outlined"
                      startIcon={<ClearIcon />}
                      onClick={() => {
                        setStockSearchInput("");
                        setStockSearchValue("");
                        setStockStatusFilter("");
                        setExpiryDaysFilter("");
                        setSelectedCategoryTab("all");
                        setStockPage(0);
                      }}
                      sx={{ height: 56 }}
                    >
                      Xóa lọc
                    </Button>
                  </Box>

                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{
                      minHeight: 0,
                      flex: 1,
                      overflowY: "auto",
                    }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.50" }}>
                          <TableCell>Sản phẩm</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell align="right">Khả dụng</TableCell>
                          <TableCell align="center">Trạng thái</TableCell>
                          <TableCell align="right" sx={{ width: 120 }}>
                            Thao tác
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stockLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              align="center"
                              sx={{ py: 4 }}
                            >
                              <CircularProgress size={28} />
                            </TableCell>
                          </TableRow>
                        ) : stockError ? (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Alert severity="error">{stockError}</Alert>
                            </TableCell>
                          </TableRow>
                        ) : stockList.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              align="center"
                              sx={{ py: 4 }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Không có dữ liệu tồn kho phù hợp.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          stockList.map((stock) => {
                            const variantId = stock.variantId || "";
                            const batchState = variantId
                              ? batchByVariantId[variantId]
                              : undefined;
                            const stockStatus = getStockStatusDisplay(stock);

                            return (
                              <Fragment key={stock.id || variantId}>
                                <TableRow hover>
                                  <TableCell>
                                    <Typography fontWeight={600}>
                                      {stock.productName || "N/A"}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Variant: {variantId || "N/A"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {stock.variantSku || "N/A"}
                                  </TableCell>
                                  <TableCell align="right">
                                    {stock.availableQuantity ?? 0}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      size="small"
                                      color={stockStatus.color}
                                      label={stockStatus.label}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <Stack
                                      direction="row"
                                      spacing={0.5}
                                      justifyContent="flex-end"
                                    >
                                      <Tooltip title="Thêm item theo sản phẩm">
                                        <IconButton
                                          size="small"
                                          onClick={() => addVariantItem(stock)}
                                          sx={{
                                            bgcolor: "primary.main",
                                            color: "primary.contrastText",
                                            borderRadius: 1.5,
                                            "&:hover": {
                                              bgcolor: "primary.dark",
                                            },
                                          }}
                                        >
                                          <AddIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  </TableCell>
                                </TableRow>

                                <TableRow>
                                  <TableCell
                                    colSpan={5}
                                    sx={{ bgcolor: "grey.50", py: 1.5 }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: "block", px: 1, mb: 1 }}
                                    >
                                      Danh sách lô của SKU{" "}
                                      {stock.variantSku || "N/A"}
                                    </Typography>
                                    {batchState?.loading ? (
                                      <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={1}
                                        sx={{ px: 1 }}
                                      >
                                        <CircularProgress size={18} />
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Đang tải danh sách lô...
                                        </Typography>
                                      </Stack>
                                    ) : batchState?.error ? (
                                      <Alert severity="error">
                                        {batchState.error}
                                      </Alert>
                                    ) : !batchState ||
                                      batchState.items.length === 0 ? (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ px: 1 }}
                                      >
                                        Không có lô nào cho variant này.
                                      </Typography>
                                    ) : (
                                      <TableContainer>
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow>
                                              <TableCell>Batch code</TableCell>
                                              <TableCell>NSX - HSD</TableCell>
                                              <TableCell align="right">
                                                Còn lại
                                              </TableCell>
                                              <TableCell align="center">
                                                Trạng thái
                                              </TableCell>
                                              <TableCell
                                                align="right"
                                                sx={{ width: 90 }}
                                              >
                                                Thêm
                                              </TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {batchState.items.map((batch) => (
                                              <TableRow
                                                key={
                                                  batch.id ||
                                                  `${variantId}-${batch.batchCode}`
                                                }
                                              >
                                                <TableCell>
                                                  {batch.batchCode || "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                  <Typography variant="body2">
                                                    NSX:{" "}
                                                    {formatDate(
                                                      batch.manufactureDate,
                                                    )}
                                                  </Typography>
                                                  <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                  >
                                                    HSD:{" "}
                                                    {formatDate(
                                                      batch.expiryDate,
                                                    )}
                                                  </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                  {batch.remainingQuantity ?? 0}
                                                </TableCell>
                                                <TableCell align="center">
                                                  {batch.isExpired ? (
                                                    <Chip
                                                      size="small"
                                                      color="error"
                                                      label="Hết hạn"
                                                    />
                                                  ) : (batch.daysUntilExpiry ??
                                                      9999) <= 60 ? (
                                                    <Chip
                                                      size="small"
                                                      color="warning"
                                                      variant="outlined"
                                                      label={`Còn ${batch.daysUntilExpiry ?? 0} ngày`}
                                                    />
                                                  ) : (
                                                    <Chip
                                                      size="small"
                                                      color="success"
                                                      variant="outlined"
                                                      label={`Còn ${batch.daysUntilExpiry ?? 0} ngày`}
                                                    />
                                                  )}
                                                </TableCell>
                                                <TableCell align="right">
                                                  <Tooltip title="Thêm item theo lô">
                                                    <IconButton
                                                      size="small"
                                                      onClick={() =>
                                                        addBatchItem(
                                                          stock,
                                                          batch,
                                                        )
                                                      }
                                                      sx={{
                                                        bgcolor: "primary.main",
                                                        color:
                                                          "primary.contrastText",
                                                        borderRadius: 1.5,
                                                        "&:hover": {
                                                          bgcolor:
                                                            "primary.dark",
                                                        },
                                                      }}
                                                    >
                                                      <AddIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    )}
                                  </TableCell>
                                </TableRow>
                              </Fragment>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={stockTotalCount}
                    page={stockPage}
                    onPageChange={(_, nextPage) => setStockPage(nextPage)}
                    rowsPerPage={stockRowsPerPage}
                    onRowsPerPageChange={(event) => {
                      setStockRowsPerPage(Number(event.target.value));
                      setStockPage(0);
                    }}
                    rowsPerPageOptions={[10, 20, 50]}
                    labelRowsPerPage="Dòng mỗi trang:"
                    labelDisplayedRows={({ from, to, count }) =>
                      `${from}-${to} của ${count}`
                    }
                  />
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  minHeight: 0,
                  height: "100%",
                  overflowY: "auto",
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Thông tin chiến lược
                  </Typography>

                  <TextField
                    label="Tên chiến lược"
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                    fullWidth
                  />

                  <TextField
                    label="Mô tả"
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    multiline
                    minRows={2}
                    fullWidth
                  />

                  <FormControl fullWidth>
                    <InputLabel>Loại chiến lược</InputLabel>
                    <Select
                      value={createForm.type}
                      label="Loại chiến lược"
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          type: event.target.value as CampaignType,
                        }))
                      }
                    >
                      <MenuItem value="FlashSale">Flash Sale</MenuItem>
                      <MenuItem value="Clearance">Xả kho</MenuItem>
                    </Select>
                  </FormControl>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    }}
                  >
                    <TextField
                      label="Ngày bắt đầu"
                      type="date"
                      value={createForm.startDate}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                      required
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label="Giờ bắt đầu"
                      type="time"
                      value={createForm.startTime}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
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
                      onChange={(event) => {
                        const nextDate = event.target.value;
                        setCreateForm((current) => ({
                          ...current,
                          endDate: nextDate,
                          endTime: isEndTimeManuallyEdited
                            ? current.endTime
                            : DEFAULT_END_TIME,
                        }));

                        if (!nextDate) {
                          setIsEndTimeManuallyEdited(false);
                        }
                      }}
                      required
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label="Giờ kết thúc"
                      type="time"
                      value={createForm.endTime}
                      onChange={(event) => {
                        setIsEndTimeManuallyEdited(true);
                        setCreateForm((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }));
                      }}
                      required
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 60 }}
                      helperText="Mặc định 23:59 khi chọn ngày kết thúc, có thể chỉnh tay"
                      fullWidth
                    />
                  </Box>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: "grey.50",
                      borderStyle: "dashed",
                    }}
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
                            Voucher theo campaign
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Có thể tạo nhiều voucher cho từng loại item trong
                            cùng đợt sale.
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={addCampaignVoucher}
                        >
                          Thêm voucher
                        </Button>
                      </Stack>

                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Mã voucher</TableCell>
                              <TableCell align="right">Giá trị giảm</TableCell>
                              <TableCell>Kiểu giảm</TableCell>
                              <TableCell>Áp dụng</TableCell>
                              <TableCell>Loại item</TableCell>
                              <TableCell align="center" sx={{ width: 64 }}>
                                Xóa
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {campaignVouchers.map((voucher) => {
                              const isProductVoucher =
                                voucher.applyType === "Product";

                              return (
                                <TableRow key={voucher.key} hover>
                                  <TableCell sx={{ minWidth: 180 }}>
                                    <TextField
                                      size="small"
                                      placeholder="VD: FLASH30"
                                      value={voucher.code}
                                      onChange={(event) =>
                                        handleVoucherFieldChange(
                                          voucher.key,
                                          "code",
                                          event.target.value,
                                        )
                                      }
                                      fullWidth
                                    />
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    sx={{ minWidth: 150 }}
                                  >
                                    <TextField
                                      size="small"
                                      value={voucher.discountValueInput}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        if (
                                          !/^\d*([.,]\d{0,2})?$/.test(nextValue)
                                        ) {
                                          return;
                                        }

                                        handleVoucherFieldChange(
                                          voucher.key,
                                          "discountValueInput",
                                          nextValue,
                                        );
                                      }}
                                      placeholder={
                                        voucher.discountType === "Percentage"
                                          ? "VD: 20"
                                          : "VD: 100000"
                                      }
                                      InputProps={{
                                        endAdornment: (
                                          <InputAdornment position="end">
                                            {voucher.discountType ===
                                            "Percentage"
                                              ? "%"
                                              : "VND"}
                                          </InputAdornment>
                                        ),
                                      }}
                                      fullWidth
                                    />
                                  </TableCell>
                                  <TableCell sx={{ minWidth: 170 }}>
                                    <FormControl size="small" fullWidth>
                                      <Select
                                        value={voucher.discountType}
                                        onChange={(event) =>
                                          handleVoucherFieldChange(
                                            voucher.key,
                                            "discountType",
                                            event.target.value as DiscountType,
                                          )
                                        }
                                      >
                                        {DISCOUNT_TYPE_OPTIONS.map((option) => (
                                          <MenuItem
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                  <TableCell sx={{ minWidth: 150 }}>
                                    <FormControl size="small" fullWidth>
                                      <Select
                                        value={voucher.applyType}
                                        onChange={(event) =>
                                          handleVoucherFieldChange(
                                            voucher.key,
                                            "applyType",
                                            event.target.value as VoucherType,
                                          )
                                        }
                                      >
                                        {VOUCHER_APPLY_TYPE_OPTIONS.map(
                                          (option) => (
                                            <MenuItem
                                              key={option.value}
                                              value={option.value}
                                            >
                                              {option.label}
                                            </MenuItem>
                                          ),
                                        )}
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                  <TableCell sx={{ minWidth: 160 }}>
                                    <FormControl size="small" fullWidth>
                                      <Select
                                        value={voucher.targetItemType}
                                        disabled={!isProductVoucher}
                                        onChange={(event) =>
                                          handleVoucherFieldChange(
                                            voucher.key,
                                            "targetItemType",
                                            event.target.value as PromotionType,
                                          )
                                        }
                                      >
                                        {PROMOTION_TYPE_OPTIONS.map(
                                          (option) => (
                                            <MenuItem
                                              key={option.value}
                                              value={option.value}
                                            >
                                              {option.label}
                                            </MenuItem>
                                          ),
                                        )}
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                  <TableCell align="center">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        removeCampaignVoucher(voucher.key)
                                      }
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Stack>
                  </Paper>

                  <Box>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                      spacing={1}
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle1" fontWeight={700}>
                        Item đã chọn ({selectedSummary.total})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Theo lô: {selectedSummary.batchCount} | Theo SP:{" "}
                        {selectedSummary.productCount}
                      </Typography>
                    </Stack>

                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell>Promotion Type</TableCell>
                            <TableCell>Kiểu</TableCell>
                            <TableCell align="right">Max Usage</TableCell>
                            <TableCell align="center">Xóa</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedItems.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                align="center"
                                sx={{ py: 3 }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Chưa có item nào được chọn.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedItems.map((item) => {
                              const isBatchItem = Boolean(item.batchId);

                              return (
                                <TableRow key={item.key} hover>
                                  <TableCell sx={{ minWidth: 220 }}>
                                    <Typography fontWeight={600}>
                                      {item.productName}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      SKU: {item.variantSku}
                                      {item.batchCode
                                        ? ` | Batch: ${item.batchCode}`
                                        : " | Toàn bộ tồn kho"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ minWidth: 180 }}>
                                    <FormControl fullWidth size="small">
                                      <Select
                                        value={item.promotionType}
                                        onChange={(event) =>
                                          handleSelectedPromotionTypeChange(
                                            item.key,
                                            event.target.value as PromotionType,
                                          )
                                        }
                                      >
                                        {PROMOTION_TYPE_OPTIONS.map(
                                          (option) => (
                                            <MenuItem
                                              key={option.value}
                                              value={option.value}
                                            >
                                              {option.label}
                                            </MenuItem>
                                          ),
                                        )}
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      color={isBatchItem ? "info" : "success"}
                                      label={`${PROMOTION_TYPE_LABEL[item.promotionType]} • ${
                                        isBatchItem
                                          ? "Theo lô"
                                          : "Theo sản phẩm"
                                      }`}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <TextField
                                      size="small"
                                      required={!isBatchItem}
                                      value={item.maxUsageInput}
                                      onChange={(event) =>
                                        handleSelectedMaxUsageChange(
                                          item.key,
                                          event.target.value,
                                        )
                                      }
                                      disabled={isBatchItem}
                                      placeholder={
                                        isBatchItem ? "null" : "Bắt buộc > 0"
                                      }
                                      sx={{ width: 140 }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <IconButton
                                      color="error"
                                      size="small"
                                      onClick={() =>
                                        removeSelectedItem(item.key)
                                      }
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Stack>
              </Paper>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
            <Button
              variant="contained"
              onClick={handleCreateCampaign}
              disabled={createSubmitting}
            >
              {createSubmitting ? "Đang tạo..." : "Tạo chiến lược"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default CampaignManagementPage;
