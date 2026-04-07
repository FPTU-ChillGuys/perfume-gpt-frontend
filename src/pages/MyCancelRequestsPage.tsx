import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { MainLayout } from "@/layouts/MainLayout";
import { orderService, type OrderCancelRequest } from "@/services/orderService";
import { userService } from "@/services/userService";
import type { UserCredentials } from "@/services/userService";
import { useToast } from "@/hooks/useToast";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";
import {
  CANCEL_ORDER_REASON_OPTIONS,
  type CancelOrderReason,
} from "@/utils/cancelOrderReason";
import { formatDateTimeVN } from "@/utils/dateTime";

type CancelRequestStatus = "Pending" | "Approved" | "Rejected";

const STATUS_TABS: { label: string; value: CancelRequestStatus | "All" }[] = [
  { label: "Tất cả", value: "All" },
  { label: "Chờ xử lý", value: "Pending" },
  { label: "Đã duyệt", value: "Approved" },
  { label: "Từ chối", value: "Rejected" },
];

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Chờ xử lý";
  if (status === "Approved") return "Đã duyệt";
  if (status === "Rejected") return "Từ chối";
  return status || "-";
};

const statusColor = (
  status?: string,
): "default" | "warning" | "success" | "error" => {
  if (status === "Pending") return "warning";
  if (status === "Approved") return "success";
  if (status === "Rejected") return "error";
  return "default";
};

const cancelReasonLabel = (reason?: string | null) => {
  if (!reason) return "Không có lý do";

  const matchedReason = CANCEL_ORDER_REASON_OPTIONS.find(
    (item) => item.value === (reason as CancelOrderReason),
  );

  return matchedReason?.label || reason;
};

const formatDate = (value?: string | null) => formatDateTimeVN(value);

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))} đ`;

export const MyCancelRequestsPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const backState = location.state as
    | {
        status?: CancelRequestStatus | "All";
        page?: number;
        pageSize?: number;
      }
    | undefined;

  const initialStatus =
    backState?.status &&
    STATUS_TABS.some((tab) => tab.value === backState.status)
      ? backState.status
      : "All";

  const initialPage =
    typeof backState?.page === "number" && backState.page >= 1
      ? backState.page
      : 1;

  const initialPageSize =
    typeof backState?.pageSize === "number" &&
    [5, 10, 20].includes(backState.pageSize)
      ? backState.pageSize
      : 10;

  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);
  const [requests, setRequests] = useState<OrderCancelRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [status, setStatus] = useState<CancelRequestStatus | "All">(
    initialStatus,
  );
  const [isLoading, setIsLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items, totalCount: count } =
        await orderService.getMyCancelRequests({
          PageNumber: page,
          PageSize: pageSize,
          Status: status === "All" ? undefined : status,
          SortBy: "CreatedAt",
          SortOrder: "desc",
        });
      setRequests(items);
      setTotalCount(count);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách yêu cầu hủy",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, showToast, status]);

  useEffect(() => {
    void userService.getUserMe().then(setUserInfo).catch(console.error);
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <MainLayout>
      <Box sx={{ bgcolor: "background.default", py: 4, flex: 1 }}>
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              minHeight: 600,
            }}
          >
            <UserProfileSidebar userInfo={userInfo} />

            <Box
              sx={{
                flex: 1,
                bgcolor: "background.paper",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <Tabs
                  value={status}
                  onChange={(_, val) => {
                    setStatus(val);
                    setPage(1);
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                  TabIndicatorProps={{ style: { backgroundColor: "#ee4d2d" } }}
                  sx={{
                    "& .MuiTab-root": {
                      textTransform: "none",
                      fontWeight: 500,
                      minWidth: 100,
                    },
                    "& .Mui-selected": { color: "#ee4d2d !important" },
                  }}
                >
                  {STATUS_TABS.map((tab) => (
                    <Tab key={tab.value} label={tab.label} value={tab.value} />
                  ))}
                </Tabs>
              </Box>

              <Box
                sx={{
                  p: 3,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {isLoading ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <CircularProgress sx={{ color: "#ee4d2d" }} />
                  </Box>
                ) : requests.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      Chưa có yêu cầu hủy đơn nào
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Các yêu cầu hủy đơn của bạn sẽ hiển thị tại đây.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {requests.map((request) => (
                      <Paper
                        key={request.id}
                        variant="outlined"
                        sx={{ p: 2.5, borderRadius: 2 }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={1.5}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Tooltip title={request.orderCode || ""}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontFamily: "monospace" }}
                              >
                                Đơn hàng: #{request.orderCode || "-"}
                              </Typography>
                            </Tooltip>
                            <Typography variant="body2" color="text.secondary">
                              ·
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(request.createdAt)}
                            </Typography>
                          </Stack>
                          <Chip
                            label={statusLabel(request.status)}
                            color={statusColor(request.status)}
                            variant="filled"
                            size="small"
                          />
                        </Stack>

                        <Divider sx={{ mb: 1.5 }} />

                        <Stack spacing={0.75}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Lý do:</strong>{" "}
                            {cancelReasonLabel(request.reason)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Số tiền hoàn:</strong>{" "}
                            <Typography
                              component="span"
                              variant="subtitle2"
                              fontWeight={700}
                              sx={{ color: "#ee4d2d" }}
                            >
                              {formatCurrency(request.refundAmount)}
                            </Typography>
                          </Typography>
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack direction="row" justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              if (!request.id) return;
                              navigate(`/my-cancel-requests/${request.id}`, {
                                state: {
                                  status,
                                  page,
                                  pageSize,
                                },
                              });
                            }}
                            sx={{
                              borderColor: "#ee4d2d",
                              color: "#ee4d2d",
                              "&:hover": {
                                borderColor: "#d03e27",
                                bgcolor: "rgba(238,77,45,0.04)",
                              },
                            }}
                          >
                            Xem chi tiết
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {requests.length > 0 && (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                    pt={1}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Hiển thị
                      </Typography>
                      <FormControl size="small">
                        <Select
                          value={pageSize.toString()}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                          }}
                        >
                          <MenuItem value={5}>5</MenuItem>
                          <MenuItem value={10}>10</MenuItem>
                          <MenuItem value={20}>20</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="body2" color="text.secondary">
                        / {totalCount} yêu cầu
                      </Typography>
                    </Stack>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, value) => setPage(value)}
                      showFirstButton
                      showLastButton
                      sx={{
                        "& .Mui-selected": {
                          bgcolor: "#ee4d2d !important",
                          color: "#fff",
                        },
                      }}
                    />
                  </Stack>
                )}
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </MainLayout>
  );
};

export default MyCancelRequestsPage;
