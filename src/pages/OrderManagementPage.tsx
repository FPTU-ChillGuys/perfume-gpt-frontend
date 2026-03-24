import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Badge,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { orderService } from "@/services/orderService";
import { useToast } from "@/hooks/useToast";
import { exportToCsv } from "@/utils/exportCsv";
import type { OrderListItem, OrderStatus, OrderType } from "@/types/order";
import {
  orderStatusLabels,
  orderStatusColors,
  getOrderStatusChipSx,
  paymentStatusLabels,
  paymentStatusColors,
  orderTypeLabels,
  orderTypeColors,
} from "@/utils/orderStatus";

const STATUS_TABS: { label: string; value: OrderStatus | "" }[] = [
  { label: "Tất cả", value: "" },
  { label: orderStatusLabels.Pending, value: "Pending" },
  { label: orderStatusLabels.Processing, value: "Processing" },
  { label: orderStatusLabels.Delivering, value: "Delivering" },
  { label: orderStatusLabels.Delivered, value: "Delivered" },
  { label: orderStatusLabels.Canceled, value: "Canceled" },
  { label: orderStatusLabels.Returned, value: "Returned" },
];

const formatCurrency = (value?: number) => {
  if (!value) return "0đ";
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("vi-VN");
};

export const OrderManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const initialStatus =
    (location.state as { status?: OrderStatus | "" } | null)?.status ?? "";
  const [status, setStatus] = useState<OrderStatus | "">(initialStatus);
  const [type, setType] = useState<OrderType | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, searchTerm, status, type, fromDate, toDate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const [response, pendingResponse] = await Promise.all([
        orderService.getAllOrders({
          PageNumber: page + 1,
          PageSize: rowsPerPage,
          SearchTerm: searchTerm || undefined,
          Status: status || undefined,
          Type: type || undefined,
          FromDate: fromDate || undefined,
          ToDate: toDate || undefined,
          SortBy: "CreatedAt",
          SortOrder: "desc",
        }),
        orderService.getAllOrders({
          PageNumber: 1,
          PageSize: 1,
          Status: "Pending",
          SortBy: "CreatedAt",
          SortOrder: "desc",
        }),
      ]);

      setOrders(response.items);
      setTotalCount(response.totalCount);
      setPendingCount(pendingResponse.totalCount);
    } catch (error) {
      console.error("Failed to load orders:", error);
      showToast("Không thể tải danh sách đơn hàng. Vui lòng thử lại.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatus("");
    setType("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const handleExportCsv = () => {
    exportToCsv(
      orders,
      `don-hang-${new Date().toISOString().slice(0, 10)}`,
      [
        { key: "id", header: "Mã đơn hàng" },
        { key: "customerName", header: "Khách hàng" },
        { key: "customerEmail", header: "Email" },
        { key: "status", header: "Trạng thái" },
        { key: "totalAmount", header: "Tổng tiền" },
        { key: "type", header: "Loại" },
        { key: "createdAt", header: "Ngày tạo" },
      ],
    );
  };

  const handleCopyOrderId = async (orderId?: string | null) => {
    if (!orderId) return;

    try {
      await navigator.clipboard.writeText(orderId);
      showToast("Đã sao chép mã đơn hàng", "success");
    } catch {
      showToast("Không thể sao chép mã đơn hàng", "error");
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (orderId?: string | null) => {
    if (!orderId) return;

    const basePath = location.pathname.startsWith("/staff")
      ? "/staff/orders"
      : "/admin/orders";

    navigate(`${basePath}/${orderId}`, {
      state: {
        status,
        fromPath: location.pathname,
      },
    });
  };

  return (
    <AdminLayout>
      <Box>
        {/* Filters */}
        <Paper sx={{ mb: 3, overflow: "hidden" }}>
          <Box
            sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
          >
            <Tabs
              value={status}
              onChange={(_, value: OrderStatus | "") => {
                setStatus(value);
                setPage(0);
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
              {STATUS_TABS.map((tab) => {
                const isPendingTab = tab.value === "Pending";
                return (
                  <Tab
                    key={tab.value || "all"}
                    value={tab.value}
                    label={
                      isPendingTab ? (
                        <Badge
                          color="error"
                          badgeContent={
                            pendingCount > 99 ? "99+" : pendingCount
                          }
                          invisible={pendingCount <= 0}
                        >
                          <Box component="span" sx={{ pr: 1 }}>
                            {tab.label}
                          </Box>
                        </Badge>
                      ) : (
                        tab.label
                      )
                    }
                  />
                );
              })}
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "2fr repeat(2, 1fr)",
                  lg: "2fr repeat(3, 1fr) auto auto",
                },
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label="Tìm kiếm"
                placeholder="Mã đơn, tên khách hàng..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                sx={{
                  gridColumn: {
                    xs: "span 1",
                    sm: "span 2",
                    md: "span 1",
                    lg: "span 1",
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSearch} edge="end">
                      <SearchIcon />
                    </IconButton>
                  ),
                }}
              />

              <FormControl fullWidth>
                <InputLabel>Loại đơn hàng</InputLabel>
                <Select
                  value={type}
                  label="Loại đơn hàng"
                  onChange={(e) => {
                    setType(e.target.value as OrderType | "");
                    setPage(0);
                  }}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="Online">Online</MenuItem>
                  <MenuItem value="Offline">In-Store</MenuItem>
                  <MenuItem value="Shoppe">Shopee</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Từ ngày"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="Đến ngày"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
              />

              <Button
                fullWidth
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                sx={{
                  minWidth: 120,
                  bgcolor: "#ee4d2d",
                  "&:hover": { bgcolor: "#d03e27" },
                }}
              >
                Tìm
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                sx={{ height: 56 }}
              >
                Xóa bộ lọc
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="success"
                startIcon={<DownloadIcon />}
                onClick={handleExportCsv}
                disabled={orders.length === 0}
                sx={{ height: 56 }}
              >
                Xuất CSV
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Mã đơn hàng</TableCell>
                <TableCell>Khách hàng</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Thanh toán</TableCell>
                <TableCell align="right">Số lượng</TableCell>
                <TableCell align="right">Tổng tiền</TableCell>
                <TableCell>Ngày tạo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không có đơn hàng nào
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow
                    key={order.id}
                    hover
                    onClick={() => handleViewDetail(order.id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Tooltip title={order.id || ""}>
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            sx={{ fontFamily: "monospace" }}
                            noWrap
                          >
                            {order.id || "-"}
                          </Typography>
                        </Tooltip>
                        {!!order.id && (
                          <Tooltip title="Sao chép mã đơn">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCopyOrderId(order.id);
                              }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {order.customerName || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          order.type ? orderTypeLabels[order.type] : order.type
                        }
                        size="small"
                        variant="outlined"
                        color={
                          order.type ? orderTypeColors[order.type] : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          order.status
                            ? orderStatusLabels[order.status]
                            : order.status
                        }
                        size="small"
                        color={orderStatusColors[order.status || "Pending"]}
                        sx={getOrderStatusChipSx(order.status || "Pending")}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          order.paymentStatus
                            ? paymentStatusLabels[order.paymentStatus]
                            : order.paymentStatus
                        }
                        size="small"
                        color={
                          paymentStatusColors[order.paymentStatus || "Unpaid"]
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{order.itemCount}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {formatDate(order.createdAt)}
                      </Typography>
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
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Số hàng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} của ${count}`
            }
          />
        </TableContainer>
      </Box>
    </AdminLayout>
  );
};
