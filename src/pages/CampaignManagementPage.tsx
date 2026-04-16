import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Search as SearchIcon,
  Delete as DeleteIcon,
  SwapHoriz as StatusIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useToast } from "@/hooks/useToast";
import {
  campaignService,
  type CampaignResponse,
  type CampaignStatus,
  type CampaignType,
  type CreateCampaignRequest,
  type DiscountType,
  type PromotionType,
} from "@/services/campaignService";
import {
  BulkConfigModal,
  BulkItemSelector,
  VoucherForm,
  createEmptyVoucherDraft,
  type BulkConfigValues,
  type SelectedCampaignItem,
  type CampaignVoucherDraft,
} from "@/components/admin/campaign";

type CampaignStatusTab = "all" | CampaignStatus;
type PageViewMode = "list" | "create";

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

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }

  // Backend stores in UTC, add 7 hours to display in Vietnam time (UTC+7)
  const date = new Date(value);
  date.setHours(date.getHours() + 7);
  return date.toLocaleString("vi-VN");
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

  // Create a Date object from the local date/time inputs
  const localDate = new Date(`${dateValue}T${timeValue}:00`);
  // Subtract 7 hours to convert from Vietnam time (UTC+7) to UTC for backend storage
  localDate.setHours(localDate.getHours() - 7);

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  const hours = String(localDate.getHours()).padStart(2, "0");
  const minutes = String(localDate.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:00${withFraction ? ".00" : ""}`;
};

// Helper functions for number formatting
const formatNumberVN = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("vi-VN");
};

const parseNumberVN = (value: string): string => {
  return value.replace(/\./g, "");
};

export const CampaignManagementPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const backState = location.state as
    | {
        statusTab?: CampaignStatusTab;
        page?: number;
        rowsPerPage?: number;
      }
    | undefined;

  const [pageView, setPageView] = useState<PageViewMode>("list");
  const [statusTab, setStatusTab] = useState<CampaignStatusTab>(
    backState?.statusTab ?? "all",
  );
  const [campaigns, setCampaigns] = useState<CampaignResponse[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaignPage, setCampaignPage] = useState(backState?.page ?? 0);
  const [campaignRowsPerPage, setCampaignRowsPerPage] = useState(
    backState?.rowsPerPage ?? 10,
  );
  const [campaignTotalCount, setCampaignTotalCount] = useState(0);
  const [campaignSearchInput, setCampaignSearchInput] = useState("");
  const [campaignSearchValue, setCampaignSearchValue] = useState("");

  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [deleteConfirmCampaign, setDeleteConfirmCampaign] =
    useState<CampaignResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusDialogCampaign, setStatusDialogCampaign] =
    useState<CampaignResponse | null>(null);
  const [statusChangeValue, setStatusChangeValue] =
    useState<CampaignStatus>("Upcoming");
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
  const [selectedItemsTab, setSelectedItemsTab] = useState<
    "all" | "product" | "batch"
  >("all");
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);

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
          : "Không thể tải danh sách chiến dịch";
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

  const isCreateView = pageView === "create";

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
    setCampaignVouchers([createEmptyVoucherDraft()]);
    setPageView("create");
  };

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
    if (selectedItemsTab === "product")
      return selectedItems.filter((item) => !item.batchId);
    if (selectedItemsTab === "batch")
      return selectedItems.filter((item) => Boolean(item.batchId));
    return selectedItems;
  }, [selectedItems, selectedItemsTab]);

  const selectedPromotionTypes = useMemo(() => {
    const typeSet = new Set<PromotionType>();
    selectedItems.forEach((item) => typeSet.add(item.promotionType));
    return Array.from(typeSet);
  }, [selectedItems]);

  const handleBulkEditApply = (config: BulkConfigValues) => {
    const targetKeys = new Set(filteredSelectedItems.map((item) => item.key));
    setSelectedItems((current) =>
      current.map((item) => {
        if (!targetKeys.has(item.key)) return item;
        return {
          ...item,
          promotionType: config.promotionType,
          discountType: config.discountType,
          discountValueInput: config.discountValue,
          maxUsageInput: item.batchId ? item.maxUsageInput : config.maxUsage,
        };
      }),
    );
    setBulkEditModalOpen(false);
  };

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
      showToast("Vui lòng nhập tên chiến dịch", "warning");
      return;
    }

    if (!startDateTime || !endDateTime) {
      showToast("Vui lòng nhập thời gian bắt đầu và kết thúc", "warning");
      return;
    }

    // Check start time must be >= current time
    const now = new Date();
    const startDateTimeObj = new Date(startDateTime);
    // Add 7 hours back because toLocalDateTime subtracted 7
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
      // Validate maxUsage for non-batch items
      if (!item.batchId) {
        const parsed = Number(item.maxUsageInput);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return true;
        }
      }

      // Validate discountValue
      const discountValue = Number(item.discountValueInput.replace(",", "."));
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return true;
      }

      // Validate percentage not exceeding 100
      if (item.discountType === "Percentage" && discountValue > 100) {
        return true;
      }

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
      const maxUsagePerUser =
        voucher.isMemberOnly && voucher.maxUsagePerUserInput.trim()
          ? Number(voucher.maxUsagePerUserInput)
          : null;

      // Skip voucher with empty code (voucher is optional)
      if (!code) {
        continue;
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
        maxUsagePerUser !== null &&
        (!Number.isInteger(maxUsagePerUser) || maxUsagePerUser < 1)
      ) {
        showToast(
          `Voucher #${rowNumber}: số lần sử dụng/khách không hợp lệ`,
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
      showToast("Tạo chiến dịch khuyến mãi thành công", "success");
      setPageView("list");
      void loadCampaigns();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tạo chiến dịch khuyến mãi";
      showToast(message, "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenCampaignDetail = (campaignId?: string) => {
    if (!campaignId) {
      return;
    }

    navigate(`/admin/campaigns/${campaignId}`, {
      state: {
        statusTab,
        page: campaignPage,
        rowsPerPage: campaignRowsPerPage,
      },
    });
  };

  const handleDeleteCampaign = async () => {
    if (!deleteConfirmCampaign?.id) return;
    setIsDeleting(true);
    try {
      await campaignService.deleteCampaign(deleteConfirmCampaign.id);
      showToast("Đã xóa chiến dịch", "success");
      setDeleteConfirmCampaign(null);
      void loadCampaigns();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể xóa chiến dịch",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePausePlay = async (campaign: CampaignResponse) => {
    if (!campaign.id) return;
    const newStatus: CampaignStatus =
      campaign.status === "Active" ? "Paused" : "Active";
    setIsUpdatingStatus(true);
    try {
      await campaignService.updateCampaignStatus(campaign.id, newStatus);
      showToast(
        newStatus === "Paused"
          ? "Đã tạm dừng chiến dịch"
          : "Đã tiếp tục chiến dịch",
        "success",
      );
      void loadCampaigns();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái",
        "error",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusDialogCampaign?.id) return;
    setIsUpdatingStatus(true);
    try {
      await campaignService.updateCampaignStatus(
        statusDialogCampaign.id,
        statusChangeValue,
      );
      showToast("Đã cập nhật trạng thái", "success");
      setStatusDialogCampaign(null);
      void loadCampaigns();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái",
        "error",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <AdminLayout>
      <Box>
        {!isCreateView && (
          <>
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
                  label="Tìm theo tên chiến dịch"
                  value={campaignSearchInput}
                  onChange={(event) =>
                    setCampaignSearchInput(event.target.value)
                  }
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
                  Tạo chiến dịch
                </Button>
              </Box>
            </Paper>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>Tên chiến dịch</TableCell>
                    <TableCell>Loại</TableCell>
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Mô tả</TableCell>
                    <TableCell align="center" width={110}>
                      Thao tác
                    </TableCell>
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
                          Không có chiến dịch phù hợp.
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
                            campaign.id ||
                            `${campaign.name}-${campaign.startDate}`
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
                          <TableCell
                            align="center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {campaign.status === "Active" ? (
                              <Tooltip title="Tạm dừng">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() =>
                                    void handleTogglePausePlay(campaign)
                                  }
                                  disabled={isUpdatingStatus}
                                >
                                  <PauseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : campaign.status === "Paused" ? (
                              <Tooltip title="Tiếp tục">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() =>
                                    void handleTogglePausePlay(campaign)
                                  }
                                  disabled={isUpdatingStatus}
                                >
                                  <PlayArrowIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Đổi trạng thái">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setStatusDialogCampaign(campaign);
                                    setStatusChangeValue(
                                      campaign.status || "Upcoming",
                                    );
                                  }}
                                >
                                  <StatusIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Xóa chiến dịch">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() =>
                                  setDeleteConfirmCampaign(campaign)
                                }
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
                  Bạn có chắc muốn xóa chiến dịch{" "}
                  <strong>&ldquo;{deleteConfirmCampaign?.name}&rdquo;</strong>?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setDeleteConfirmCampaign(null)}
                  disabled={isDeleting}
                >
                  Hủy
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteCampaign}
                  disabled={isDeleting}
                  startIcon={
                    isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />
                  }
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
              <DialogTitle>Đổi trạng thái chiến dịch</DialogTitle>
              <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Chiến dịch: <strong>{statusDialogCampaign?.name}</strong>
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Trạng thái mới</InputLabel>
                  <Select
                    value={statusChangeValue}
                    label="Trạng thái mới"
                    onChange={(e) =>
                      setStatusChangeValue(e.target.value as CampaignStatus)
                    }
                  >
                    {(
                      Object.keys(CAMPAIGN_STATUS_LABEL) as CampaignStatus[]
                    ).map((s) => (
                      <MenuItem key={s} value={s}>
                        {CAMPAIGN_STATUS_LABEL[s]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setStatusDialogCampaign(null)}
                  disabled={isUpdatingStatus}
                >
                  Hủy
                </Button>
                <Button
                  variant="contained"
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus}
                  startIcon={
                    isUpdatingStatus ? (
                      <CircularProgress size={16} />
                    ) : (
                      <StatusIcon />
                    )
                  }
                >
                  Cập nhật
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}

        {isCreateView && (
          <Box
            sx={{
              height: "calc(100vh - 180px)",
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h5" fontWeight={700}>
                Tạo chiến dịch khuyến mãi
              </Typography>
              <Button variant="outlined" onClick={() => setPageView("list")}>
                Quay lại danh sách
              </Button>
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  lg: "minmax(400px, 1.2fr) minmax(300px, 0.8fr)",
                },
                alignItems: "start",
                minHeight: 0,
                height: "calc(100% - 64px)",
              }}
            >
              {/* Left panel: Stock selector with checkboxes */}
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
                <BulkItemSelector
                  selectedItems={selectedItems}
                  onSelectedItemsChange={setSelectedItems}
                />
              </Paper>

              {/* Right panel: Campaign info + selected items + vouchers */}
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
                    Thông tin chiến dịch
                  </Typography>

                  <TextField
                    label="Tên chiến dịch"
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
                    <InputLabel>Loại chiến dịch</InputLabel>
                    <Select
                      value={createForm.type}
                      label="Loại chiến dịch"
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

                  {/* Selected items summary */}
                  <Box>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                      spacing={1}
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle1" fontWeight={700}>
                        Sản phẩm đã chọn ({selectedSummary.total})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Theo lô: {selectedSummary.batchCount} | Theo SP:{" "}
                        {selectedSummary.productCount}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 1 }}
                    >
                      <Tabs
                        value={selectedItemsTab}
                        onChange={(_, v: "all" | "product" | "batch") =>
                          setSelectedItemsTab(v)
                        }
                        variant="scrollable"
                        scrollButtons="auto"
                      >
                        <Tab
                          value="all"
                          label={`Tất cả (${selectedSummary.total})`}
                        />
                        <Tab
                          value="product"
                          label={`Theo sản phẩm (${selectedSummary.productCount})`}
                        />
                        <Tab
                          value="batch"
                          label={`Theo lô (${selectedSummary.batchCount})`}
                        />
                      </Tabs>
                      {filteredSelectedItems.length > 0 && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<SettingsIcon />}
                          onClick={() => setBulkEditModalOpen(true)}
                          sx={{ whiteSpace: "nowrap", ml: 1 }}
                        >
                          Cấu hình chung ({filteredSelectedItems.length})
                        </Button>
                      )}
                    </Stack>

                    <Stack spacing={2}>
                      {filteredSelectedItems.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 3 }}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            align="center"
                          >
                            {selectedItems.length === 0
                              ? 'Chưa có item nào được chọn. Hãy tick chọn sản phẩm ở bảng bên trái rồi dùng "Cấu hình chung" để thêm.'
                              : selectedItemsTab === "product"
                                ? "Không có sản phẩm (toàn bộ tồn kho) nào trong danh sách."
                                : "Không có lô nào trong danh sách."}
                          </Typography>
                        </Paper>
                      ) : (
                        filteredSelectedItems.map((item, index) => {
                          const isBatchItem = Boolean(item.batchId);

                          return (
                            <Paper
                              key={item.key}
                              variant="outlined"
                              sx={{ p: 2, position: "relative" }}
                            >
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => removeSelectedItem(item.key)}
                                sx={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>

                              <Stack spacing={2}>
                                <Stack direction="row" spacing={2}>
                                  <Avatar
                                    src={item.variantImageUrl || undefined}
                                    alt={item.productName}
                                    variant="rounded"
                                    sx={{ width: 56, height: 56 }}
                                  />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography
                                      variant="subtitle2"
                                      color="text.secondary"
                                    >
                                      #{index + 1}
                                    </Typography>
                                    <Typography fontWeight={600}>
                                      {item.productName}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      component="div"
                                    >
                                      SKU: {item.variantSku}
                                      {item.batchCode
                                        ? ` | Batch: ${item.batchCode}`
                                        : " | Toàn bộ tồn kho"}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="error.main"
                                      fontWeight={600}
                                    >
                                      {item.basePrice != null
                                        ? `${item.basePrice.toLocaleString("vi-VN")} ₫`
                                        : "Chưa có giá"}
                                    </Typography>
                                  </Box>
                                </Stack>

                                <Box
                                  sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                      xs: "1fr",
                                      sm: "1fr 1fr",
                                      md: "1fr 1fr 1fr 1fr",
                                    },
                                    gap: 2,
                                  }}
                                >
                                  <FormControl fullWidth size="small">
                                    <InputLabel>Loại khuyến mãi</InputLabel>
                                    <Select
                                      label="Loại khuyến mãi"
                                      value={item.promotionType}
                                      onChange={(event) =>
                                        handleSelectedItemFieldChange(
                                          item.key,
                                          "promotionType",
                                          event.target.value,
                                        )
                                      }
                                    >
                                      {PROMOTION_TYPE_OPTIONS.map((option) => (
                                        <MenuItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>

                                  <FormControl fullWidth size="small">
                                    <InputLabel>Kiểu giảm</InputLabel>
                                    <Select
                                      label="Kiểu giảm"
                                      value={item.discountType}
                                      onChange={(event) =>
                                        handleSelectedItemFieldChange(
                                          item.key,
                                          "discountType",
                                          event.target.value,
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

                                  <TextField
                                    label="Giá trị giảm"
                                    size="small"
                                    required
                                    value={
                                      item.discountType === "Percentage"
                                        ? item.discountValueInput
                                        : formatNumberVN(
                                            item.discountValueInput,
                                          )
                                    }
                                    onChange={(event) => {
                                      const inputValue = event.target.value;

                                      if (item.discountType === "Percentage") {
                                        // For percentage, allow numbers and decimal point
                                        if (
                                          !/^\d*([.,]\d{0,2})?$/.test(
                                            inputValue,
                                          )
                                        )
                                          return;
                                        handleSelectedItemFieldChange(
                                          item.key,
                                          "discountValueInput",
                                          inputValue,
                                        );
                                      } else {
                                        // For VND, parse and store clean digits
                                        const parsed =
                                          parseNumberVN(inputValue);
                                        if (!/^\d*$/.test(parsed)) return;
                                        handleSelectedItemFieldChange(
                                          item.key,
                                          "discountValueInput",
                                          parsed,
                                        );
                                      }
                                    }}
                                    placeholder={
                                      item.discountType === "Percentage"
                                        ? "VD: 20"
                                        : "VD: 500.000"
                                    }
                                    InputProps={{
                                      endAdornment: (
                                        <InputAdornment position="end">
                                          {item.discountType === "Percentage"
                                            ? "%"
                                            : "VND"}
                                        </InputAdornment>
                                      ),
                                      style: { minWidth: "140px" },
                                    }}
                                    fullWidth
                                  />

                                  <TextField
                                    label="SL tối đa"
                                    size="small"
                                    required={!isBatchItem}
                                    value={formatNumberVN(item.maxUsageInput)}
                                    onChange={(event) => {
                                      const parsed = parseNumberVN(
                                        event.target.value,
                                      );
                                      if (!/^\d*$/.test(parsed)) return;

                                      handleSelectedItemFieldChange(
                                        item.key,
                                        "maxUsageInput",
                                        parsed,
                                      );
                                    }}
                                    disabled={isBatchItem}
                                    placeholder={
                                      isBatchItem ? "null" : "Bắt buộc > 0"
                                    }
                                    InputProps={{
                                      style: { minWidth: "120px" },
                                    }}
                                    fullWidth
                                  />
                                </Box>
                              </Stack>
                            </Paper>
                          );
                        })
                      )}
                    </Stack>
                  </Box>

                  <BulkConfigModal
                    open={bulkEditModalOpen}
                    selectedCount={filteredSelectedItems.length}
                    onClose={() => setBulkEditModalOpen(false)}
                    onApply={handleBulkEditApply}
                  />

                  {/* Voucher form */}
                  <VoucherForm
                    vouchers={campaignVouchers}
                    onVouchersChange={setCampaignVouchers}
                  />
                </Stack>
              </Paper>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 2,
              }}
            >
              <Button onClick={() => setPageView("list")}>Hủy</Button>
              <Button
                variant="contained"
                onClick={handleCreateCampaign}
                disabled={createSubmitting}
              >
                {createSubmitting ? "Đang tạo..." : "Tạo chiến dịch"}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </AdminLayout>
  );
};

export default CampaignManagementPage;
