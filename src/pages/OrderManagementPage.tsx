import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Badge,
  Typography,
  Paper,
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
  Divider,
  Stack,
  Pagination,
  type SelectChangeEvent,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  ContentCopy as ContentCopyIcon,
  ImageNotSupportedOutlined as ImageNotSupportedOutlinedIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { orderService } from "@/services/orderService";
import { useToast } from "@/hooks/useToast";
import { formatDateTimeVN } from "@/utils/dateTime";
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
  { label: orderStatusLabels.Preparing, value: "Preparing" },
  { label: orderStatusLabels.ReadyToPick, value: "ReadyToPick" },
  { label: orderStatusLabels.Delivering, value: "Delivering" },
  { label: orderStatusLabels.Delivered, value: "Delivered" },
  { label: orderStatusLabels.Cancelled, value: "Cancelled" },
  { label: orderStatusLabels.Returning, value: "Returning" },
  { label: orderStatusLabels.Partial_Returned, value: "Partial_Returned" },
  { label: orderStatusLabels.Returned, value: "Returned" },
];

const formatCurrency = (value?: number) => {
  if (!value) return "0đ";
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  return formatDateTimeVN(dateStr);
};

const getDisplayOrderCode = (order?: OrderListItem | null) =>
  order?.code || order?.id || "-";

const getDisplayCustomerName = (customerName?: string | null) => {
  const normalized = (customerName || "").trim();
  if (!normalized || normalized.toUpperCase() === "N/A") {
    return "Khách lẻ";
  }
  return normalized;
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
          OrderCode: searchTerm || undefined,
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

    const handleCopyOrderCode = async (orderCode?: string | null) => {
    if (!orderCode) return;

    try {
      await navigator.clipboard.writeText(orderCode);
      showToast("Đã sao chép mã đơn hàng", "success");
    } catch {
      showToast("Không thể sao chép mã đơn hàng", "error");
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage - 1);
  };

  const handleChangeRowsPerPage = (
    event: SelectChangeEvent<string>,
  ) => {
    setRowsPerPage(parseInt(event.target.value as string, 10));
    setPage(0);
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);

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
                label="Tìm theo mã đơn hàng"
                placeholder="Tìm theo mã đơn hàng"
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
            </Box>
          </Box>
        </Paper>

        {/* Orders List */}
        <Box sx={{ minHeight: "60vh", mb: 3 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress sx={{ color: "#ee4d2d" }} />
            </Box>
          ) : orders.length === 0 ? (
            <Paper sx={{ p: 8, textAlign: "center", borderRadius: 2 }}>
              <Typography color="text.secondary">
                Không có đơn hàng nào
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {orders.map((order) => (
                <Paper
                  key={order.id}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    border: "1px solid transparent",
                    "&:hover": {
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      borderColor: "rgba(238,77,45,0.2)",
                    },
                  }}
                  onClick={() => handleViewDetail(order.id)}
                >
                  {/* Card Header */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={2}
                  >
                    <Stack spacing={0.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          sx={{ fontFamily: "monospace", fontSize: "0.95rem" }}
                        >
                          #{getDisplayOrderCode(order)}
                        </Typography>
                        <Tooltip title="Sao chép mã đơn">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCopyOrderCode(order.code || order.id);
                            }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Typography variant="caption" color="text.secondary">
                          • {formatDate(order.createdAt)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Khách hàng:{" "}
                        <strong>{getDisplayCustomerName(order.customerName)}</strong>
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                      <Chip
                        label={order.type ? orderTypeLabels[order.type] : order.type}
                        size="small"
                        variant="outlined"
                        color={order.type ? orderTypeColors[order.type] : "default"}
                      />
                      <Chip
                        label={order.status ? orderStatusLabels[order.status] : order.status}
                        size="small"
                        color={orderStatusColors[order.status || "Pending"]}
                        sx={getOrderStatusChipSx(order.status || "Pending")}
                      />
                      <Chip
                        label={order.paymentStatus ? paymentStatusLabels[order.paymentStatus] : order.paymentStatus}
                        size="small"
                        color={paymentStatusColors[order.paymentStatus || "Unpaid"]}
                      />
                    </Stack>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Items Preview */}
                  <Stack spacing={2} mb={2}>
                    {order.orderDetails?.map((detail) => (
                      <Box
                        key={detail.id}
                        display="flex"
                        alignItems="center"
                        gap={2}
                      >
                        {detail.imageUrl ? (
                          <Box
                            component="img"
                            src={detail.imageUrl}
                            alt={detail.variantName}
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: 1.5,
                              objectFit: "cover",
                              border: "1px solid",
                              borderColor: "divider",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: 1.5,
                              bgcolor: "grey.100",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid",
                              borderColor: "divider",
                              flexShrink: 0,
                            }}
                          >
                            <ImageNotSupportedOutlinedIcon
                              sx={{ color: "text.disabled", fontSize: 24 }}
                            />
                          </Box>
                        )}

                        <Box flex={1} minWidth={0}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            noWrap
                            title={detail.variantName}
                          >
                            {detail.variantName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            x{detail.quantity}
                          </Typography>
                        </Box>

                        <Box textAlign="right">
                          {detail.unitPrice && detail.total && detail.quantity && (detail.unitPrice * detail.quantity > detail.total) && (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ textDecoration: "line-through", display: "block" }}
                            >
                              {formatCurrency(detail.unitPrice * detail.quantity)}
                            </Typography>
                          )}
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: "#ee4d2d" }}
                          >
                            {formatCurrency(detail.total)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>

                  <Divider sx={{ mb: 2 }} />

                  {/* Card Footer */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      {order.itemCount} sản phẩm
                    </Typography>

                    <Stack direction="row" spacing={3} alignItems="center">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" color="text.secondary">
                          Thành tiền:
                        </Typography>
                        <Typography
                          variant="h6"
                          fontWeight={800}
                          sx={{ color: "#ee4d2d" }}
                        >
                          {formatCurrency(order.totalAmount)}
                        </Typography>
                      </Box>

                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(order.id);
                        }}
                        sx={{
                          borderColor: "#ee4d2d",
                          color: "#ee4d2d",
                          textTransform: "none",
                          fontWeight: 600,
                          px: 3,
                          "&:hover": {
                            borderColor: "#d03e27",
                            bgcolor: "rgba(238,77,45,0.04)",
                          },
                        }}
                      >
                        Xem chi tiết
                      </Button>
                    </Stack>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        {/* Pagination */}
        {orders.length > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ pt: 2, pb: 4 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Hiển thị
              </Typography>
              <FormControl size="small">
                <Select
                  value={rowsPerPage.toString()}
                  onChange={handleChangeRowsPerPage}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                / {totalCount} đơn hàng
              </Typography>
            </Stack>
            <Pagination
              count={totalPages}
              page={page + 1}
              onChange={(_, val) => setPage(val - 1)}
              color="primary"
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
    </AdminLayout>
  );
};
