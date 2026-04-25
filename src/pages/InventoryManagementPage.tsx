import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
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
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  ContentCopy as ContentCopyIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayArrowIcon,
  Inventory2 as Inventory2Icon,
  WarningAmber as WarningAmberIcon,
  Category as CategoryIcon,
  ViewList as ViewListIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  inventoryService,
  type BatchDetailResponse,
  type InventorySummaryResponse,
  type StockResponse,
} from "@/services/inventoryService";
import { useAuth } from "@/hooks/useAuth";
import {
  stockAdjustmentService,
  type StockAdjustmentDetailResponse,
  type StockAdjustmentListItem,
  type StockAdjustmentReason,
  type StockAdjustmentResponse,
  type StockAdjustmentStatus,
} from "@/services/stockAdjustmentService";
import { useToast } from "@/hooks/useToast";

type StockStatusFilter = NonNullable<StockResponse["status"]> | "";
type ExpiryDaysFilter = "" | "30" | "60" | "90";
type InventoryTab = "inventory" | "adjustments";
type InventoryCategoryTab =
  | "all"
  | "men"
  | "women"
  | "unisex"
  | "niche"
  | "giftset";
type VerifyDetailDraft = {
  detailId: string;
  approvedQuantity: string;
  note: string;
};

const INVENTORY_CATEGORY_TAB_ITEMS: Array<{
  key: InventoryCategoryTab;
  label: string;
}> = [
  { key: "all", label: "Tất cả" },
  { key: "men", label: "Nước hoa Nam" },
  { key: "women", label: "Nước hoa Nữ" },
  { key: "unisex", label: "Unisex" },
  { key: "niche", label: "Niche" },
  { key: "giftset", label: "Gifset" },
];

const INVENTORY_CATEGORY_ID_BY_TAB: Record<
  Exclude<InventoryCategoryTab, "all">,
  number
> = {
  women: 1,
  men: 2,
  unisex: 3,
  niche: 4,
  giftset: 5,
};

const resolveCategoryIdByTab = (tab: InventoryCategoryTab) => {
  if (tab === "all") {
    return undefined;
  }

  return INVENTORY_CATEGORY_ID_BY_TAB[tab];
};

const ADJUSTMENT_REASON_OPTIONS: StockAdjustmentReason[] = [
  "Damage",
  "Expired",
  "Theft",
  "Loss",
  "Found",
  "Correction",
  "Return",
  "Other",
];

const ADJUSTMENT_STATUS_OPTIONS: Array<StockAdjustmentStatus | ""> = [
  "",
  "Pending",
  "InProgress",
  "Completed",
  "Cancelled",
];

const statusLabelMap: Record<StockAdjustmentStatus, string> = {
  Pending: "Chờ duyệt",
  InProgress: "Đang xử lý",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
};

const reasonLabelMap: Record<StockAdjustmentReason, string> = {
  Damage: "Hư hại",
  Expired: "Hết hạn",
  Theft: "Thất thoát",
  Loss: "Mất mát",
  Found: "Tìm thấy",
  Correction: "Điều chỉnh",
  Return: "Hoàn trả",
  Other: "Khác",
};

const EXPIRY_FILTER_OPTIONS: Array<{ value: ExpiryDaysFilter; label: string }> =
  [
    { value: "", label: "Tất cả hạn dùng" },
    { value: "30", label: "Sắp hết hạn <= 30 ngày" },
    { value: "60", label: "Sắp hết hạn <= 60 ngày" },
    { value: "90", label: "Sắp hết hạn <= 90 ngày" },
  ];

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("vi-VN");
};

const getStockStatus = (stock: StockResponse) => {
  if (stock.status === "OutOfStock") {
    return { label: "Hết hàng", color: "error" as const };
  }

  if (stock.status === "LowStock") {
    return { label: "Sắp hết", color: "warning" as const };
  }

  if (stock.status === "Normal") {
    return { label: "Bình thường", color: "success" as const };
  }

  const availableQuantity = stock.availableQuantity ?? 0;
  const threshold = stock.lowStockThreshold ?? 0;

  if (availableQuantity <= 0) {
    return { label: "Hết hàng", color: "error" as const };
  }

  if (availableQuantity < threshold) {
    return { label: "Sắp hết", color: "warning" as const };
  }

  return { label: "Bình thường", color: "success" as const };
};

export const InventoryManagementPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isStaff = user?.role === "staff";
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState<InventoryTab>("inventory");
  const [selectedCategoryTab, setSelectedCategoryTab] =
    useState<InventoryCategoryTab>("all");

  const [summary, setSummary] = useState<InventorySummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [stocks, setStocks] = useState<StockResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [stockStatusFilter, setStockStatusFilter] =
    useState<StockStatusFilter>("");
  const [expiryDaysFilter, setExpiryDaysFilter] =
    useState<ExpiryDaysFilter>("");
  const [batchByVariantId, setBatchByVariantId] = useState<
    Record<
      string,
      {
        items: BatchDetailResponse[];
        loading: boolean;
        error: string | null;
      }
    >
  >({});

  const [adjustments, setAdjustments] = useState<StockAdjustmentListItem[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
  const [adjustmentPage, setAdjustmentPage] = useState(0);
  const [adjustmentRowsPerPage, setAdjustmentRowsPerPage] = useState(10);
  const [adjustmentTotalCount, setAdjustmentTotalCount] = useState(0);
  const [pendingAdjustmentCount, setPendingAdjustmentCount] = useState(0);
  const [adjustmentStatusFilter, setAdjustmentStatusFilter] = useState<
    StockAdjustmentStatus | ""
  >("");
  const [adjustmentReasonFilter, setAdjustmentReasonFilter] = useState<
    StockAdjustmentReason | ""
  >("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createPayload, setCreatePayload] = useState({
    variantId: "",
    batchId: "",
    adjustmentQuantity: "1",
    reason: "Damage" as StockAdjustmentReason,
    note: "",
  });

  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [selectedAdjustmentDetail, setSelectedAdjustmentDetail] =
    useState<StockAdjustmentResponse | null>(null);
  const [verifyDetailDrafts, setVerifyDetailDrafts] = useState<
    VerifyDetailDraft[]
  >([]);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    setPage(0);
  }, [selectedCategoryTab]);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const response = await inventoryService.getSummary();
      setSummary(response);
    } catch (summaryError) {
      console.error("Failed to load inventory summary:", summaryError);
      showToastRef.current("Không thể tải thống kê kho", "error");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadStock = useCallback(async () => {
    const selectedCategoryId = resolveCategoryIdByTab(selectedCategoryTab);

    try {
      setLoading(true);
      setError(null);

      const baseQuery: {
        CategoryId?: number;
        StockStatus?: NonNullable<StockResponse["status"]>;
        DaysUntilExpiry?: number;
        PageNumber: number;
        PageSize: number;
        SortBy: string;
        SortOrder: string;
      } = {
        PageNumber: page + 1,
        PageSize: rowsPerPage,
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

      const normalizedSearchValue = searchValue.trim();

      if (!normalizedSearchValue) {
        const response = await inventoryService.getStock(baseQuery);
        setStocks(response.items || []);
        setTotalCount(response.totalCount || 0);
        return;
      }

      const skuResponse = await inventoryService.getStock({
        ...baseQuery,
        SKU: normalizedSearchValue,
      });

      if ((skuResponse.items || []).length > 0) {
        setStocks(skuResponse.items || []);
        setTotalCount(skuResponse.totalCount || 0);
        return;
      }

      const batchCodeResponse = await inventoryService.getStock({
        ...baseQuery,
        BatchCode: normalizedSearchValue,
      });

      setStocks(batchCodeResponse.items || []);
      setTotalCount(batchCodeResponse.totalCount || 0);
    } catch (stockError) {
      console.error("Failed to load stock:", stockError);
      const message =
        stockError instanceof Error
          ? stockError.message
          : "Không thể tải danh sách tồn kho";
      setError(message);
      showToastRef.current(message, "error");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    searchValue,
    stockStatusFilter,
    selectedCategoryTab,
    expiryDaysFilter,
  ]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const loadAdjustments = useCallback(async () => {
    try {
      setAdjustmentsLoading(true);
      setAdjustmentsError(null);

      const [response, pendingResponse] = await Promise.all([
        stockAdjustmentService.getAdjustments({
          PageNumber: adjustmentPage + 1,
          PageSize: adjustmentRowsPerPage,
          Status: adjustmentStatusFilter || undefined,
          Reason: adjustmentReasonFilter || undefined,
          SortBy: "CreatedAt",
          SortOrder: "desc",
        }),
        stockAdjustmentService.getAdjustments({
          PageNumber: 1,
          PageSize: 1,
          Status: "Pending",
          SortBy: "CreatedAt",
          SortOrder: "desc",
        }),
      ]);

      setAdjustments(response.items || []);
      setAdjustmentTotalCount(response.totalCount || 0);
      setPendingAdjustmentCount(pendingResponse.totalCount || 0);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách stock adjustment";
      setAdjustmentsError(message);
      setPendingAdjustmentCount(0);
      showToastRef.current(message, "error");
    } finally {
      setAdjustmentsLoading(false);
    }
  }, [
    adjustmentPage,
    adjustmentReasonFilter,
    adjustmentRowsPerPage,
    adjustmentStatusFilter,
  ]);

  useEffect(() => {
    if (activeTab !== "adjustments") {
      return;
    }

    void loadAdjustments();
  }, [activeTab, loadAdjustments]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalizedInput = searchInput.trim();
      setSearchValue((current) => {
        if (current === normalizedInput) {
          return current;
        }
        return normalizedInput;
      });
      setPage((currentPage) => (currentPage === 0 ? currentPage : 0));
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const handleSearch = () => {
    setPage(0);
    setSearchValue(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchValue("");
    setStockStatusFilter("");
    setExpiryDaysFilter("");
    setPage(0);
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
    } catch (batchLoadError) {
      const message =
        batchLoadError instanceof Error
          ? batchLoadError.message
          : "Không thể tải danh sách batch";

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
    if (activeTab !== "inventory" || loading) {
      return;
    }

    const visibleVariantIds = stocks
      .map((stock) => stock.variantId)
      .filter((variantId): variantId is string => Boolean(variantId));

    visibleVariantIds.forEach((variantId) => {
      if (!batchByVariantId[variantId]) {
        void loadBatchesByVariantId(variantId);
      }
    });
  }, [activeTab, batchByVariantId, loadBatchesByVariantId, loading, stocks]);

  const resetCreatePayload = () => {
    setCreatePayload({
      variantId: "",
      batchId: "",
      adjustmentQuantity: "1",
      reason: "Damage",
      note: "",
    });
  };

  const openCreateRequestDialog = (prefill?: {
    variantId?: string;
    batchId?: string;
    reason?: StockAdjustmentReason;
  }) => {
    setCreatePayload((current) => ({
      ...current,
      variantId: prefill?.variantId || current.variantId || "",
      batchId: prefill?.batchId || current.batchId || "",
      reason: prefill?.reason || current.reason,
      adjustmentQuantity: "1",
      note: "",
    }));
    setCreateDialogOpen(true);
  };

  const handleCreateAdjustment = async () => {
    const variantId = createPayload.variantId.trim();
    const batchId = createPayload.batchId.trim();
    const quantity = Number(createPayload.adjustmentQuantity);

    if (!variantId || !batchId || !Number.isFinite(quantity) || quantity <= 0) {
      showToast(
        isStaff
          ? 'Vui lòng tạo request từ nút "Tạo request" trong chi tiết batch để hệ thống tự gắn VariantId và BatchId'
          : "Vui lòng nhập VariantId, BatchId và số lượng hợp lệ",
        "warning",
      );
      return;
    }

    try {
      setCreateSubmitting(true);
      const nowIso = new Date().toISOString();

      await stockAdjustmentService.createAdjustment({
        adjustmentDate: nowIso,
        reason: createPayload.reason,
        note: createPayload.note || null,
        adjustmentDetails: [
          {
            variantId,
            batchId,
            adjustmentQuantity: quantity,
            note: createPayload.note || null,
          },
        ],
      });

      showToast("Tạo request stock adjustment thành công", "success");
      setCreateDialogOpen(false);
      resetCreatePayload();

      if (activeTab === "adjustments") {
        void loadAdjustments();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tạo request";
      showToast(message, "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenVerifyDialog = async (adjustmentId?: string) => {
    if (!adjustmentId) {
      return;
    }

    try {
      setVerifyLoading(true);
      const detail =
        await stockAdjustmentService.getAdjustmentById(adjustmentId);
      setSelectedAdjustmentDetail(detail);
      setVerifyDetailDrafts(
        (detail?.adjustmentDetails || [])
          .filter(
            (item): item is StockAdjustmentDetailResponse & { id: string } =>
              Boolean(item.id),
          )
          .map((item) => ({
            detailId: item.id,
            approvedQuantity: String(
              detail?.status === "Pending"
                ? (item.adjustmentQuantity ?? 0)
                : (item.approvedQuantity ?? item.adjustmentQuantity ?? 0),
            ),
            note: "",
          })),
      );
      setVerifyDialogOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải chi tiết adjustment";
      showToast(message, "error");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCloseVerifyDialog = () => {
    setVerifyDialogOpen(false);
    setSelectedAdjustmentDetail(null);
    setVerifyDetailDrafts([]);
  };

  const handleVerifyDetailDraftChange = (
    detailId: string,
    key: "note",
    value: string,
  ) => {
    setVerifyDetailDrafts((current) =>
      current.map((item) =>
        item.detailId === detailId ? { ...item, [key]: value } : item,
      ),
    );
  };

  const handleCreateQuantityStep = (step: number) => {
    setCreatePayload((current) => {
      const currentQuantity = Math.max(
        1,
        Number.parseInt(current.adjustmentQuantity, 10) || 1,
      );
      const nextQuantity = Math.max(1, currentQuantity + step);

      return {
        ...current,
        adjustmentQuantity: String(nextQuantity),
      };
    });
  };

  const handleVerifyQuantityStep = (
    detailId: string,
    step: number,
    maxQuantity: number,
  ) => {
    setVerifyDetailDrafts((current) =>
      current.map((item) => {
        if (item.detailId !== detailId) {
          return item;
        }

        const currentQuantity = Math.max(
          0,
          Number.parseInt(item.approvedQuantity, 10) || 0,
        );
        const upperBound = Math.max(0, maxQuantity);
        const nextQuantity = Math.min(
          upperBound,
          Math.max(0, currentQuantity + step),
        );

        return {
          ...item,
          approvedQuantity: String(nextQuantity),
        };
      }),
    );
  };

  const handleVerifyAdjustment = async () => {
    if (!selectedAdjustmentDetail?.id) {
      return;
    }

    if (selectedAdjustmentDetail.status !== "InProgress") {
      showToast(
        "Chỉ có thể xác nhận duyệt khi request ở trạng thái Đang xử lý",
        "warning",
      );
      return;
    }

    const details: StockAdjustmentDetailResponse[] =
      selectedAdjustmentDetail.adjustmentDetails || [];

    if (!details.length) {
      showToast("Không có detail để duyệt", "warning");
      return;
    }

    const detailMap = new Map(
      details
        .filter(
          (detail): detail is StockAdjustmentDetailResponse & { id: string } =>
            Boolean(detail.id),
        )
        .map((detail) => [detail.id, detail]),
    );

    const verifyPayloadDetails = verifyDetailDrafts
      .filter((draft) => detailMap.has(draft.detailId))
      .map((draft) => {
        const relatedDetail = detailMap.get(draft.detailId);
        const approvedQuantity = Number(draft.approvedQuantity);
        const requestQuantity = relatedDetail?.adjustmentQuantity ?? 0;

        return {
          detailId: draft.detailId,
          approvedQuantity,
          requestQuantity,
          note: draft.note.trim() || null,
          sku: relatedDetail?.variantSku || "N/A",
        };
      });

    if (!verifyPayloadDetails.length) {
      showToast("Không có detail hợp lệ để duyệt", "warning");
      return;
    }

    const invalidQuantityItem = verifyPayloadDetails.find(
      (item) =>
        !Number.isFinite(item.approvedQuantity) ||
        !Number.isInteger(item.approvedQuantity) ||
        item.approvedQuantity < 0 ||
        item.approvedQuantity > item.requestQuantity,
    );

    if (invalidQuantityItem) {
      showToast(
        `SL duyệt không hợp lệ cho SKU ${invalidQuantityItem.sku}. Giá trị phải từ 0 đến ${invalidQuantityItem.requestQuantity}.`,
        "warning",
      );
      return;
    }

    try {
      setVerifySubmitting(true);

      await stockAdjustmentService.verifyAdjustment(
        selectedAdjustmentDetail.id,
        {
          adjustmentDetails: verifyPayloadDetails.map((item) => ({
            detailId: item.detailId,
            approvedQuantity: item.approvedQuantity,
            note: item.note,
          })),
        },
      );

      showToast("Duyệt request thành công", "success");
      handleCloseVerifyDialog();
      void loadAdjustments();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể duyệt request";
      showToast(message, "error");
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleUpdateAdjustmentStatus = async (
    nextStatus: Extract<StockAdjustmentStatus, "InProgress" | "Cancelled">,
  ) => {
    if (!selectedAdjustmentDetail?.id) {
      return;
    }

    try {
      setStatusSubmitting(true);

      await stockAdjustmentService.updateAdjustmentStatus(
        selectedAdjustmentDetail.id,
        { status: nextStatus },
      );

      const latestDetail = await stockAdjustmentService.getAdjustmentById(
        selectedAdjustmentDetail.id,
      );

      setSelectedAdjustmentDetail(latestDetail);

      if (nextStatus === "InProgress") {
        showToast("Request đã chuyển sang Đang xử lý", "success");
      } else {
        showToast("Request đã được hủy", "success");
      }

      void loadAdjustments();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái request";
      showToast(message, "error");
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleCopyVariantId = async (variantId?: string) => {
    if (!variantId) {
      showToast("Không có mã sản phẩm để sao chép", "warning");
      return;
    }

    try {
      await navigator.clipboard.writeText(variantId);
      showToast("Đã sao chép mã sản phẩm", "success");
    } catch {
      showToast("Không thể sao chép mã sản phẩm", "error");
    }
  };

  const summaryCards = [
    {
      title: "Tổng variant",
      value: summary?.totalVariants ?? 0,
      icon: <CategoryIcon color="primary" />,
    },
    {
      title: "Tổng tồn khả dụng",
      value: summary?.totalStockQuantity ?? 0,
      icon: <Inventory2Icon color="success" />,
    },
    {
      title: "Sản phẩm sắp hết",
      value: summary?.lowStockVariantsCount ?? 0,
      icon: <WarningAmberIcon color="warning" />,
    },
    {
      title: "Tổng lô",
      value: summary?.totalBatches ?? 0,
      icon: <ViewListIcon color="info" />,
    },
    {
      title: "Lô hết hạn",
      value: summary?.expiredBatchesCount ?? 0,
      icon: <WarningAmberIcon color="error" />,
    },
    {
      title: "Lô sắp hết hạn",
      value: summary?.expiringSoonCount ?? 0,
      icon: <WarningAmberIcon sx={{ color: "#f59e0b" }} />,
    },
  ];

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value: InventoryTab) => setActiveTab(value)}
            variant="fullWidth"
          >
            <Tab value="inventory" label="Kho hàng" />
            <Tab
              value="adjustments"
              label={
                isAdmin ? (
                  <Badge
                    color="error"
                    badgeContent={pendingAdjustmentCount}
                    invisible={pendingAdjustmentCount <= 0}
                    sx={{
                      "& .MuiBadge-badge": {
                        right: -16,
                      },
                    }}
                  >
                    Điều chỉnh số lượng
                  </Badge>
                ) : (
                  "Điều chỉnh số lượng"
                )
              }
            />
          </Tabs>
        </Paper>

        {activeTab === "inventory" && (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
                gap: 2,
                mb: 3,
              }}
            >
              {summaryCards.map((card) => (
                <Paper key={card.title} sx={{ p: 2.5, borderRadius: 2 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    mb={1}
                  >
                    {card.icon}
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </Stack>
                  {summaryLoading ? (
                    <Skeleton variant="text" width={80} height={40} />
                  ) : (
                    <Typography variant="h5" fontWeight={700}>
                      {card.value}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>

            <Paper variant="outlined" sx={{ mb: 3 }}>
              <Tabs
                value={selectedCategoryTab}
                onChange={(_, value: InventoryCategoryTab) =>
                  setSelectedCategoryTab(value)
                }
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
              >
                {INVENTORY_CATEGORY_TAB_ITEMS.map((tab) => (
                  <Tab key={tab.key} value={tab.key} label={tab.label} />
                ))}
              </Tabs>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "1fr 220px 240px auto",
                  },
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <TextField
                  fullWidth
                  label="Tìm SKU hoặc Batch code"
                  placeholder="Nhập SKU hoặc Batch code"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={handleSearch} edge="end">
                          <SearchIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControl fullWidth>
                  <InputLabel>Lọc trạng thái</InputLabel>
                  <Select
                    value={stockStatusFilter}
                    label="Lọc trạng thái"
                    onChange={(event) => {
                      setStockStatusFilter(
                        event.target.value as StockStatusFilter,
                      );
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="OutOfStock">Hết hàng</MenuItem>
                    <MenuItem value="LowStock">Sắp hết</MenuItem>
                    <MenuItem value="Normal">Bình thường</MenuItem>
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
                      setPage(0);
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
                  onClick={handleClearFilters}
                  sx={{ height: 56 }}
                >
                  Xóa lọc
                </Button>
              </Box>
            </Paper>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>Ảnh</TableCell>
                    <TableCell>Sản phẩm / Lô</TableCell>
                    <TableCell>Mã SKU / Mã Lô</TableCell>
                    <TableCell>Mã sản phẩm</TableCell>
                    <TableCell align="right">Tổng nhập</TableCell>
                    <TableCell align="right">Khả dụng / Còn lại</TableCell>
                    <TableCell align="right">Ngưỡng thấp / NSX - HSD</TableCell>
                    <TableCell align="center">Trạng thái</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Alert severity="error">{error}</Alert>
                      </TableCell>
                    </TableRow>
                  ) : stocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Không có dữ liệu tồn kho phù hợp.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stocks.map((stock, stockIndex) => {
                      const currentVariantId = stock.variantId || "";
                      const batchState = currentVariantId
                        ? batchByVariantId[currentVariantId]
                        : undefined;

                      return (
                        <Fragment key={stock.id || stock.variantId}>
                          {stockIndex > 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                sx={{
                                  p: 0,
                                  borderBottom: "none",
                                  bgcolor: "background.default",
                                }}
                              >
                                <Box sx={{ height: 10 }} />
                              </TableCell>
                            </TableRow>
                          )}

                          <TableRow
                            hover
                            sx={{
                              bgcolor: "background.paper",
                              "& td": {
                                borderBottom: "none",
                              },
                            }}
                          >
                            <TableCell>
                              <Box
                                sx={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: 1.5,
                                  overflow: "hidden",
                                  border: "1px solid",
                                  borderColor: "divider",
                                  bgcolor: "grey.100",
                                  display: "grid",
                                  placeItems: "center",
                                }}
                              >
                                {stock.variantImageUrl ? (
                                  <Box
                                    component="img"
                                    src={stock.variantImageUrl}
                                    alt={
                                      stock.productName ||
                                      stock.variantSku ||
                                      "Variant image"
                                    }
                                    sx={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.disabled"
                                    sx={{ fontSize: 11 }}
                                  >
                                    Ảnh
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {stock.productName || "N/A"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {stock.concentrationName || ""}
                                {stock.volumeMl ? ` • ${stock.volumeMl}ml` : ""}
                              </Typography>
                            </TableCell>
                            <TableCell>{stock.variantSku || "N/A"}</TableCell>
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: "inline-block",
                                    maxWidth: 150,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    cursor: stock.variantId
                                      ? "pointer"
                                      : "default",
                                    textDecoration: stock.variantId
                                      ? "underline"
                                      : "none",
                                    textDecorationStyle: "dotted",
                                  }}
                                  title={stock.variantId || ""}
                                  onClick={() =>
                                    handleCopyVariantId(
                                      stock.variantId || undefined,
                                    )
                                  }
                                >
                                  {stock.variantId || "N/A"}
                                </Typography>
                                {stock.variantId && (
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleCopyVariantId(
                                        stock.variantId || undefined,
                                      )
                                    }
                                    sx={{ p: 0.25 }}
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell align="right">
                              {stock.totalQuantity ?? 0}
                            </TableCell>
                            <TableCell align="right">
                              {stock.availableQuantity ?? 0}
                            </TableCell>
                            <TableCell align="right">
                              {stock.lowStockThreshold ?? 0}
                            </TableCell>
                            <TableCell align="center">
                              {(() => {
                                const status = getStockStatus(stock);
                                return (
                                  <Chip
                                    size="small"
                                    color={status.color}
                                    label={status.label}
                                  />
                                );
                              })()}
                            </TableCell>
                          </TableRow>

                          {batchState?.loading ? (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                sx={{
                                  bgcolor: "grey.50",
                                  borderBottom: "none",
                                  borderLeft: "3px solid",
                                  borderColor: "grey.300",
                                }}
                              >
                                <Box
                                  sx={{
                                    py: 1.5,
                                    display: "flex",
                                    justifyContent: "center",
                                  }}
                                >
                                  <CircularProgress size={20} />
                                </Box>
                              </TableCell>
                            </TableRow>
                          ) : batchState?.error ? (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                sx={{
                                  bgcolor: "grey.50",
                                  borderBottom: "none",
                                  borderLeft: "3px solid",
                                  borderColor: "grey.300",
                                }}
                              >
                                <Alert severity="error">
                                  {batchState.error}
                                </Alert>
                              </TableCell>
                            </TableRow>
                          ) : !batchState || batchState.items.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                sx={{
                                  bgcolor: "grey.50",
                                  borderBottom: "none",
                                  borderLeft: "3px solid",
                                  borderColor: "grey.300",
                                }}
                              >
                                <Alert severity="info">
                                  Chưa có batch cho variant này.
                                </Alert>
                              </TableCell>
                            </TableRow>
                          ) : (
                            batchState.items.map((batch) => (
                              <TableRow
                                key={batch.id}
                                sx={{
                                  bgcolor: "grey.50",
                                  "& td": {
                                    borderBottom: "none",
                                  },
                                  "& td:first-of-type": {
                                    borderLeft: "3px solid",
                                    borderColor: "grey.300",
                                  },
                                  "&:hover": { bgcolor: "grey.100" },
                                }}
                              >
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label="Batch"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {stock.productName || "N/A"}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Lô của SKU {stock.variantSku || "N/A"}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {batch.batchCode || "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    variant="caption"
                                    color="text.disabled"
                                  >
                                    -
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  {batch.importQuantity ?? 0}
                                </TableCell>
                                <TableCell align="right">
                                  {batch.remainingQuantity ?? 0}
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    NSX: {formatDate(batch.manufactureDate)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    HSD: {formatDate(batch.expiryDate)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    justifyContent="center"
                                    alignItems="center"
                                    flexWrap="wrap"
                                  >
                                    {batch.isExpired ? (
                                      <Chip
                                        size="small"
                                        color="error"
                                        label="Hết hạn"
                                      />
                                    ) : (batch.daysUntilExpiry ?? 9999) <=
                                      60 ? (
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
                                    {isStaff && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() =>
                                          openCreateRequestDialog({
                                            variantId:
                                              stock.variantId || undefined,
                                            batchId: batch.id || undefined,
                                            reason: "Damage",
                                          })
                                        }
                                        disabled={!stock.variantId || !batch.id}
                                      >
                                        Tạo request
                                      </Button>
                                    )}
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ))
                          )}

                          <TableRow>
                            <TableCell
                              colSpan={8}
                              sx={{
                                p: 0,
                                borderBottom: "none",
                                bgcolor: "background.default",
                              }}
                            >
                              <Box sx={{ height: 6 }} />
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(Number(event.target.value));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="Dòng mỗi trang:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} của ${count}`
                }
              />
            </TableContainer>
          </>
        )}

        {activeTab === "adjustments" && (
          <>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: isStaff ? "1fr 1fr auto" : "1fr 1fr",
                  },
                  gap: 2,
                }}
              >
                <FormControl fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={adjustmentStatusFilter}
                    label="Trạng thái"
                    onChange={(event) => {
                      setAdjustmentStatusFilter(
                        event.target.value as StockAdjustmentStatus | "",
                      );
                      setAdjustmentPage(0);
                    }}
                  >
                    {ADJUSTMENT_STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status || "all"} value={status}>
                        {status ? statusLabelMap[status] : "Tất cả"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Lý do</InputLabel>
                  <Select
                    value={adjustmentReasonFilter}
                    label="Lý do"
                    onChange={(event) => {
                      setAdjustmentReasonFilter(
                        event.target.value as StockAdjustmentReason | "",
                      );
                      setAdjustmentPage(0);
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    {ADJUSTMENT_REASON_OPTIONS.map((reason) => (
                      <MenuItem key={reason} value={reason}>
                        {reasonLabelMap[reason]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Paper>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>Mã request</TableCell>
                    <TableCell>Người tạo</TableCell>
                    <TableCell>Ngày tạo</TableCell>
                    <TableCell>Lý do</TableCell>
                    <TableCell align="center">Số lượng điều chỉnh</TableCell>
                    <TableCell align="center">Trạng thái</TableCell>
                    <TableCell align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adjustmentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : adjustmentsError ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Alert severity="error">{adjustmentsError}</Alert>
                      </TableCell>
                    </TableRow>
                  ) : adjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Chưa có stock adjustment request.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    adjustments.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>{item.id?.slice(0, 8) || "N/A"}</TableCell>
                        <TableCell>{item.createdByName || "N/A"}</TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>
                          {item.reason ? reasonLabelMap[item.reason] : "N/A"}
                        </TableCell>
                        <TableCell align="center">
                          {item.totalItems ?? 0}
                        </TableCell>
                        <TableCell align="center">
                          {item.status ? (
                            <Chip
                              size="small"
                              color={
                                item.status === "Completed"
                                  ? "success"
                                  : item.status === "Cancelled"
                                    ? "error"
                                    : "warning"
                              }
                              label={statusLabelMap[item.status]}
                            />
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {isAdmin ? (
                            <Button
                              size="small"
                              variant={
                                item.status === "Pending" ||
                                item.status === "InProgress"
                                  ? "contained"
                                  : "outlined"
                              }
                              onClick={() => handleOpenVerifyDialog(item.id)}
                              disabled={verifyLoading}
                            >
                              Xem chi tiết
                            </Button>
                          ) : isStaff ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenVerifyDialog(item.id)}
                              disabled={verifyLoading}
                            >
                              Xem chi tiết
                            </Button>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              -
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <TablePagination
                component="div"
                count={adjustmentTotalCount}
                page={adjustmentPage}
                onPageChange={(_, nextPage) => setAdjustmentPage(nextPage)}
                rowsPerPage={adjustmentRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setAdjustmentRowsPerPage(Number(event.target.value));
                  setAdjustmentPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="Dòng mỗi trang:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} của ${count}`
                }
              />
            </TableContainer>

            <Dialog
              open={verifyDialogOpen}
              onClose={handleCloseVerifyDialog}
              fullWidth
              maxWidth="xl"
            >
              <DialogTitle>
                {isAdmin
                  ? "Duyệt Stock Adjustment"
                  : "Chi tiết Stock Adjustment"}
              </DialogTitle>
              <DialogContent>
                {!selectedAdjustmentDetail ? (
                  <CircularProgress />
                ) : (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Mã request: {selectedAdjustmentDetail.id}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Trạng thái:{" "}
                          {
                            statusLabelMap[
                              selectedAdjustmentDetail.status || "Pending"
                            ]
                          }
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Người tạo:{" "}
                          {selectedAdjustmentDetail.createdByName || "N/A"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Người duyệt:{" "}
                          {selectedAdjustmentDetail.verifiedByName || "N/A"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Lý do:{" "}
                          {
                            reasonLabelMap[
                              selectedAdjustmentDetail.reason || "Other"
                            ]
                          }
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Ngày điều chỉnh:{" "}
                          {formatDate(selectedAdjustmentDetail.adjustmentDate)}
                        </Typography>
                      </Grid>
                      <Grid size={12}>
                        <Alert severity="info" sx={{ py: 0.5 }}>
                          Ghi chú request:{" "}
                          {selectedAdjustmentDetail.note || "N/A"}
                        </Alert>
                      </Grid>
                    </Grid>

                    <TableContainer sx={{ maxHeight: 420, overflowX: "auto" }}>
                      <Table
                        size="small"
                        stickyHeader
                        sx={{
                          tableLayout: "fixed",
                          minWidth: isAdmin ? 1550 : 1160,
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 190 }}>
                              Chi tiết ID
                            </TableCell>
                            <TableCell sx={{ width: 260 }}>Sản phẩm</TableCell>
                            <TableCell sx={{ width: 170 }}>SKU</TableCell>
                            <TableCell sx={{ width: 190 }}>Batch</TableCell>
                            <TableCell align="center" sx={{ width: 110 }}>
                              SL request
                            </TableCell>
                            <TableCell sx={{ width: 240 }}>
                              Ghi chú request (detail)
                            </TableCell>
                            {isAdmin && (
                              <TableCell align="center" sx={{ width: 190 }}>
                                SL duyệt
                              </TableCell>
                            )}
                            {isAdmin && (
                              <TableCell sx={{ width: 300 }}>
                                Ghi chú duyệt
                              </TableCell>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(
                            selectedAdjustmentDetail.adjustmentDetails || []
                          ).map((detail, index) => {
                            const detailId = detail.id || "";
                            const draft = verifyDetailDrafts.find(
                              (item) => item.detailId === detailId,
                            );
                            const maxApprovedQuantity = Math.max(
                              0,
                              detail.adjustmentQuantity ?? 0,
                            );
                            const currentApprovedQuantity = Math.min(
                              maxApprovedQuantity,
                              Math.max(
                                0,
                                Number.parseInt(
                                  draft?.approvedQuantity || "0",
                                  10,
                                ) || 0,
                              ),
                            );
                            const canEditVerify =
                              isAdmin &&
                              selectedAdjustmentDetail.status === "InProgress";
                            const disableVerifyEditing =
                              !isAdmin ||
                              !detailId ||
                              selectedAdjustmentDetail.status !==
                                "InProgress" ||
                              verifySubmitting ||
                              statusSubmitting;

                            return (
                              <TableRow key={detail.id || index}>
                                <TableCell
                                  sx={{
                                    fontFamily: "monospace",
                                    verticalAlign: "top",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {detail.id || "N/A"}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    verticalAlign: "top",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {detail.productName || "N/A"}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontFamily: "monospace",
                                    verticalAlign: "top",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {detail.variantSku || "N/A"}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontFamily: "monospace",
                                    verticalAlign: "top",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {detail.batchCode || "N/A"}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ verticalAlign: "top" }}
                                >
                                  {detail.adjustmentQuantity ?? 0}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    verticalAlign: "top",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {detail.note || "N/A"}
                                </TableCell>
                                {isAdmin && (
                                  <TableCell
                                    align="center"
                                    sx={{ verticalAlign: "top" }}
                                  >
                                    {canEditVerify ? (
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        justifyContent="center"
                                      >
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            detailId &&
                                            handleVerifyQuantityStep(
                                              detailId,
                                              -1,
                                              maxApprovedQuantity,
                                            )
                                          }
                                          disabled={
                                            disableVerifyEditing ||
                                            currentApprovedQuantity <= 0
                                          }
                                        >
                                          <RemoveIcon fontSize="small" />
                                        </IconButton>
                                        <TextField
                                          size="small"
                                          value={String(
                                            currentApprovedQuantity,
                                          )}
                                          slotProps={{
                                            input: {
                                              readOnly: true,
                                            },
                                          }}
                                          sx={{ width: 90 }}
                                        />
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            detailId &&
                                            handleVerifyQuantityStep(
                                              detailId,
                                              1,
                                              maxApprovedQuantity,
                                            )
                                          }
                                          disabled={
                                            disableVerifyEditing ||
                                            currentApprovedQuantity >=
                                              maxApprovedQuantity
                                          }
                                        >
                                          <AddIcon fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    ) : (
                                      <Typography variant="body2">
                                        {detail.approvedQuantity ?? 0}
                                      </Typography>
                                    )}
                                  </TableCell>
                                )}
                                {isAdmin && (
                                  <TableCell sx={{ verticalAlign: "top" }}>
                                    {canEditVerify ? (
                                      <TextField
                                        size="small"
                                        value={draft?.note || ""}
                                        onChange={(event) =>
                                          detailId &&
                                          handleVerifyDetailDraftChange(
                                            detailId,
                                            "note",
                                            event.target.value,
                                          )
                                        }
                                        fullWidth
                                        placeholder="Nhập ghi chú cho phần duyệt"
                                        disabled={disableVerifyEditing}
                                      />
                                    ) : (
                                      <Typography
                                        variant="body2"
                                        sx={{ wordBreak: "break-word" }}
                                      >
                                        {detail.note || "N/A"}
                                      </Typography>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Stack>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseVerifyDialog}>Đóng</Button>
                {isAdmin && selectedAdjustmentDetail?.status === "Pending" && (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleUpdateAdjustmentStatus("InProgress")}
                    disabled={statusSubmitting || verifySubmitting}
                  >
                    {statusSubmitting ? "Đang xử lý..." : "Bắt đầu duyệt"}
                  </Button>
                )}
                {isAdmin &&
                  selectedAdjustmentDetail?.status === "InProgress" && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => handleUpdateAdjustmentStatus("Cancelled")}
                      disabled={statusSubmitting || verifySubmitting}
                    >
                      {statusSubmitting ? "Đang xử lý..." : "Hủy yêu cầu"}
                    </Button>
                  )}
                {isAdmin &&
                  selectedAdjustmentDetail?.status === "InProgress" && (
                    <Button
                      variant="contained"
                      onClick={handleVerifyAdjustment}
                      disabled={
                        verifySubmitting ||
                        statusSubmitting ||
                        !selectedAdjustmentDetail ||
                        verifyDetailDrafts.length === 0 ||
                        selectedAdjustmentDetail.status !== "InProgress"
                      }
                    >
                      {verifySubmitting ? "Đang duyệt..." : "Xác nhận duyệt"}
                    </Button>
                  )}
              </DialogActions>
            </Dialog>
          </>
        )}

        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Tạo yêu cầu điều chỉnh sô lượng sản phẩm</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {!isStaff && (
                <>
                  <TextField
                    label="ID Sản phẩm"
                    value={createPayload.variantId}
                    onChange={(event) =>
                      setCreatePayload((current) => ({
                        ...current,
                        variantId: event.target.value,
                      }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Batch ID"
                    value={createPayload.batchId}
                    onChange={(event) =>
                      setCreatePayload((current) => ({
                        ...current,
                        batchId: event.target.value,
                      }))
                    }
                    fullWidth
                  />
                </>
              )}
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Số lượng điều chỉnh
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton
                    onClick={() => handleCreateQuantityStep(-1)}
                    disabled={
                      createSubmitting ||
                      (Number.parseInt(createPayload.adjustmentQuantity, 10) ||
                        1) <= 1
                    }
                  >
                    <RemoveIcon />
                  </IconButton>
                  <TextField
                    value={createPayload.adjustmentQuantity}
                    slotProps={{
                      input: {
                        readOnly: true,
                      },
                    }}
                    sx={{ width: 120 }}
                  />
                  <IconButton
                    onClick={() => handleCreateQuantityStep(1)}
                    disabled={createSubmitting}
                  >
                    <AddIcon />
                  </IconButton>
                </Stack>
              </Box>
              <FormControl fullWidth>
                <InputLabel>Lý do</InputLabel>
                <Select
                  value={createPayload.reason}
                  label="Lý do"
                  onChange={(event) =>
                    setCreatePayload((current) => ({
                      ...current,
                      reason: event.target.value as StockAdjustmentReason,
                    }))
                  }
                >
                  {ADJUSTMENT_REASON_OPTIONS.map((reason) => (
                    <MenuItem key={reason} value={reason}>
                      {reasonLabelMap[reason]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Ghi chú"
                value={createPayload.note}
                onChange={(event) =>
                  setCreatePayload((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
            <Button
              onClick={handleCreateAdjustment}
              variant="contained"
              disabled={
                createSubmitting ||
                (isStaff &&
                  (!createPayload.variantId.trim() ||
                    !createPayload.batchId.trim()))
              }
            >
              {createSubmitting ? "Đang tạo..." : "Tạo yêu cầu"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};
