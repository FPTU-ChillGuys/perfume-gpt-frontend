import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  orderService,
  type OrderReturnRequest,
  type ReturnRequestStatus,
} from "../services/orderService";

type ReturnTabStatus = "All" | ReturnRequestStatus;

const STATUS_OPTIONS: ReturnTabStatus[] = [
  "All",
  "Pending",
  "ApprovedForReturn",
  "Inspecting",
  "ReadyForRefund",
  "Rejected",
  "Completed",
];

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Chờ duyệt";
  if (status === "ApprovedForReturn") return "Đã duyệt";
  if (status === "Inspecting") return "Đang kiểm định";
  if (status === "ReadyForRefund") return "Chờ hoàn tiền";
  if (status === "Rejected") return "Từ chối";
  if (status === "Completed") return "Đã hoàn tất";
  if (status === "Refunded") return "Đã hoàn tiền";
  return status || "-";
};

const returnReasonLabel = (reason?: string | null) => {
  if (!reason) return "-";

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
  if (status === "Refunded") return "success";
  return "default";
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "-";

const formatCurrency = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))} đ`;

export const OrderReturnRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<OrderReturnRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabIndex, setTabIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const statusFilter =
    STATUS_OPTIONS[tabIndex] === "All" ? undefined : STATUS_OPTIONS[tabIndex];

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach((item) => {
      const key = item.status || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [requests]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await orderService.getAllReturnRequests({
        Status: statusFilter,
        PageNumber: page + 1,
        PageSize: rowsPerPage,
        SortBy: "createdAt",
        SortOrder: "desc",
      });
      setRequests(result.items || []);
      setTotalCount(result.totalCount || 0);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải yêu cầu trả hàng",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onOpenDetail = (request: OrderReturnRequest) => {
    if (!request.id) {
      return;
    }

    const prefix = window.location.pathname.startsWith("/staff")
      ? "/staff"
      : "/admin";
    navigate(`${prefix}/return-requests/${request.id}`);
  };

  return (
    <AdminLayout>
      <Box>
        <Paper sx={{ mb: 3, overflow: "hidden" }}>
          <Box
            sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
          >
            <Tabs
              value={tabIndex}
              onChange={(_, value) => {
                setTabIndex(value);
                setPage(0);
              }}
              variant="scrollable"
              scrollButtons="auto"
              TabIndicatorProps={{ style: { backgroundColor: "#ee4d2d" } }}
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 500,
                  minWidth: 120,
                },
                "& .Mui-selected": { color: "#ee4d2d !important" },
              }}
            >
              {STATUS_OPTIONS.map((status) => {
                const count =
                  status === "All" ? totalCount : counts.get(status) || 0;
                return (
                  <Tab
                    key={status}
                    label={
                      status === "All" ? (
                        "Tất cả"
                      ) : (
                        <Badge
                          color={statusColor(status)}
                          badgeContent={count > 99 ? "99+" : count}
                          invisible={count <= 0}
                        >
                          <Box component="span" sx={{ pr: 1 }}>
                            {statusLabel(status)}
                          </Box>
                        </Badge>
                      )
                    }
                  />
                );
              })}
            </Tabs>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>
                  <strong>Mã đơn</strong>
                </TableCell>
                <TableCell>
                  <strong>Khách hàng</strong>
                </TableCell>
                <TableCell>
                  <strong>Lý do</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Tiền yêu cầu hoàn</strong>
                </TableCell>
                <TableCell>
                  <strong>Ngày yêu cầu</strong>
                </TableCell>
                <TableCell>
                  <strong>Trạng thái</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    Không có yêu cầu trả hàng
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow
                    key={request.id}
                    hover
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "rgba(238,77,45,0.04)" },
                    }}
                    onClick={() => onOpenDetail(request)}
                  >
                    <TableCell>
                      <strong>{request.orderCode || "-"}</strong>
                    </TableCell>
                    <TableCell>{request.requestedByEmail || "-"}</TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Tooltip title={returnReasonLabel(request.reason)}>
                        <Typography variant="body2" noWrap>
                          {returnReasonLabel(request.reason)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(request.requestedRefundAmount)}
                    </TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel(request.status)}
                        color={statusColor(request.status)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 30]}
            labelRowsPerPage="Số hàng:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / ${count}`
            }
          />
        </TableContainer>
      </Box>
    </AdminLayout>
  );
};

export default OrderReturnRequestsPage;
