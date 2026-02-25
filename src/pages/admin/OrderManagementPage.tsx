import { useState, useEffect } from "react";
import {
  Box,
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
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { orderService } from "@/services/orderService";
import type {
  OrderListItem,
  OrderStatus,
  OrderType,
  PaymentStatus,
} from "@/types/order";
import { useNavigate } from "react-router-dom";

const formatCurrency = (value?: number) => {
  if (!value) return "0đ";
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("vi-VN");
};

const orderStatusColors: Record<
  string,
  "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success"
> = {
  Pending: "warning",
  Processing: "info",
  Delivering: "primary",
  Delivered: "success",
  Canceled: "error",
  Returned: "default",
};

const paymentStatusColors: Record<
  string,
  "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success"
> = {
  Unpaid: "error",
  Paid: "success",
  Refunded: "warning",
};

export const OrderManagementPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [type, setType] = useState<OrderType | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    rowsPerPage,
    searchTerm,
    status,
    paymentStatus,
    type,
    fromDate,
    toDate,
  ]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getAllOrders({
        PageNumber: page + 1,
        PageSize: rowsPerPage,
        SearchTerm: searchTerm || undefined,
        Status: status || undefined,
        PaymentStatus: paymentStatus || undefined,
        Type: type || undefined,
        FromDate: fromDate || undefined,
        ToDate: toDate || undefined,
        SortBy: "CreatedAt",
        SortOrder: "desc",
      });

      setOrders(response.items);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error("Failed to load orders:", error);
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
    setPaymentStatus("");
    setType("");
    setFromDate("");
    setToDate("");
    setPage(0);
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

  const handleViewDetail = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Quản lý đơn hàng
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
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
              onKeyPress={(e) => {
                if (e.key === "Enter") handleSearch();
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
              <InputLabel>Trạng thái đơn hàng</InputLabel>
              <Select
                value={status}
                label="Trạng thái đơn hàng"
                onChange={(e) => {
                  setStatus(e.target.value as OrderStatus | "");
                  setPage(0);
                }}
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="Pending">Chờ xử lý</MenuItem>
                <MenuItem value="Processing">Đang xử lý</MenuItem>
                <MenuItem value="Delivering">Đang giao</MenuItem>
                <MenuItem value="Delivered">Đã giao</MenuItem>
                <MenuItem value="Canceled">Đã hủy</MenuItem>
                <MenuItem value="Returned">Đã trả</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Trạng thái thanh toán</InputLabel>
              <Select
                value={paymentStatus}
                label="Trạng thái thanh toán"
                onChange={(e) => {
                  setPaymentStatus(e.target.value as PaymentStatus | "");
                  setPage(0);
                }}
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="Unpaid">Chưa thanh toán</MenuItem>
                <MenuItem value="Paid">Đã thanh toán</MenuItem>
                <MenuItem value="Refunded">Đã hoàn tiền</MenuItem>
              </Select>
            </FormControl>

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
                <MenuItem value="Offline">Offline</MenuItem>
                <MenuItem value="Shoppe">Shoppe</MenuItem>
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
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              sx={{ height: 56 }}
            >
              Xóa bộ lọc
            </Button>
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
                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không có đơn hàng nào
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {order.id?.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {order.customerName || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        size="small"
                        color={orderStatusColors[order.status || "default"]}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.paymentStatus}
                        size="small"
                        color={
                          paymentStatusColors[order.paymentStatus || "default"]
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
                    <TableCell align="center">
                      <Tooltip title="Xem chi tiết">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetail(order.id || "")}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
