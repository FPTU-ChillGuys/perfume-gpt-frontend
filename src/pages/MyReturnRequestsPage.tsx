import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  orderService,
  type OrderReturnRequest,
  type ReturnRequestStatus,
} from "@/services/orderService";
import { userService } from "@/services/userService";
import type { UserCredentials } from "@/services/userService";
import { useToast } from "@/hooks/useToast";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";

const STATUS_TABS: { label: string; value: ReturnRequestStatus | "All" }[] = [
  { label: "Tất cả", value: "All" },
  { label: "Chờ duyệt", value: "Pending" },
  { label: "Đã duyệt", value: "ApprovedForReturn" },
  { label: "Đang kiểm định", value: "Inspecting" },
  { label: "Chờ hoàn tiền", value: "ReadyForRefund" },
  { label: "Đã hoàn tiền", value: "Completed" },
  { label: "Từ chối", value: "Rejected" },
];

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Chờ duyệt";
  if (status === "ApprovedForReturn") return "Đã duyệt";
  if (status === "Inspecting") return "Đang kiểm định";
  if (status === "ReadyForRefund") return "Chờ hoàn tiền";
  if (status === "Completed") return "Đã hoàn tiền";
  if (status === "Rejected") return "Từ chối";
  return status || "-";
};

const returnReasonLabel = (reason?: string | null) => {
  if (!reason) return "Không có lý do";

  if (reason === "DamagedProduct") return "Hàng bể vỡ / hư hỏng";
  if (reason === "WrongItemReceived") return "Người bán gửi sai hàng";
  if (reason === "ItemNotAsDescribed") return "Hàng không đúng mô tả";
  if (reason === "ChangedMind") return "Đổi ý, không còn nhu cầu";
  if (reason === "AllergicReaction") return "Không phù hợp / kích ứng";

  return reason;
};

const statusColor = (
  status?: string,
): "default" | "warning" | "info" | "success" | "error" => {
  if (status === "Pending") return "warning";
  if (status === "ApprovedForReturn") return "info";
  if (status === "Inspecting") return "info";
  if (status === "ReadyForRefund") return "success";
  if (status === "Rejected") return "error";
  if (status === "Completed") return "success";
  return "default";
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "-";

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))} đ`;

export const MyReturnRequestsPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);

  const [requests, setRequests] = useState<OrderReturnRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<ReturnRequestStatus | "All">("All");
  const [isLoading, setIsLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items, totalCount: count } =
        await orderService.getMyReturnRequests({
          PageNumber: page,
          PageSize: pageSize,
          Status: status,
          SortBy: "CreatedAt",
          SortOrder: "desc",
        });
      setRequests(items);
      setTotalCount(count);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách yêu cầu hoàn trả",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, status, showToast]);

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
                      Chưa có yêu cầu hoàn trả nào
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Các yêu cầu hoàn trả sản phẩm của bạn sẽ xuất hiện tại
                      đây.
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

                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          spacing={1}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ maxWidth: "60%" }}
                          >
                            <strong>Lý do:</strong>{" "}
                            {returnReasonLabel(request.reason)}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              Yêu cầu hoàn:
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              sx={{ color: "#ee4d2d" }}
                            >
                              {formatCurrency(request.requestedRefundAmount)}
                            </Typography>
                          </Stack>
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack direction="row" justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              if (!request.id) return;
                              navigate(`/my-return-requests/${request.id}`);
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

export default MyReturnRequestsPage;
