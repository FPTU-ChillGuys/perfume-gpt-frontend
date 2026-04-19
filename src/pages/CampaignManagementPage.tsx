import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useToast } from "@/hooks/useToast";
import {
  campaignService,
  type CampaignResponse,
  type CampaignStatus,
  type CampaignType,
} from "@/services/campaignService";
import { CampaignCreateView } from "@/components/admin/campaign";

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

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }

  // Backend stores in UTC, add 7 hours to display in Vietnam time (UTC+7)
  const date = new Date(value);
  date.setHours(date.getHours() + 7);
  return date.toLocaleString("vi-VN");
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

  const [deleteConfirmCampaign, setDeleteConfirmCampaign] =
    useState<CampaignResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusDialogCampaign, setStatusDialogCampaign] =
    useState<CampaignResponse | null>(null);
  const [statusChangeValue, setStatusChangeValue] =
    useState<CampaignStatus>("Upcoming");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
          : "Không thể tải danh sách chiến dịch";
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

  const handleOpenCreateView = () => {
    setPageView("create");
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
      showToast("Đã xóa chiến dịch", "success");
      setDeleteConfirmCampaign(null);
      void loadCampaigns();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể xóa chiến dịch",
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
          ? "Đã tạm dừng chiến dịch"
          : "Đã tiếp tục chiến dịch",
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
                  label="Tìm theo tên chiến dịch"
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
                  onClick={handleOpenCreateView}
                  sx={{ height: 56 }}
                >
                  Tạo chiến dịch
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
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : campaignError ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Alert severity="error">{campaignError}</Alert>
                      </TableCell>
                    </TableRow>
                  ) : campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Không có chiến dịch phù hợp.
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
                              <Tooltip title="\u0110\u1ED5i tr\u1EA1ng th\u00E1i">
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
                            <Tooltip title="Xóa chiến dịch">
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
                  Bạn có chắc muốn xóa chiến dịch{" "}
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
              <DialogTitle>Đổi trạng thái chiến dịch</DialogTitle>
              <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Chiến dịch: <strong>{statusDialogCampaign?.name}</strong>
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
          <CampaignCreateView
            onBack={() => setPageView("list")}
            onCreated={() => {
              setPageView("list");
              void loadCampaigns();
            }}
          />
        )}
      </Box>
    </AdminLayout>
  );
};
