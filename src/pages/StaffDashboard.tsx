import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  CircularProgress,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Skeleton,
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { AdminLayout } from "../layouts/AdminLayout";
import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { orderService } from "@/services/orderService";

import {
  inventoryService,
  type InventorySummaryResponse,
} from "@/services/inventoryService";
import AssignmentIcon from "@mui/icons-material/Assignment";
import InventoryIcon from "@mui/icons-material/Inventory";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import BarChartIcon from "@mui/icons-material/BarChart";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";

import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ReplayIcon from "@mui/icons-material/Replay";
import PaymentIcon from "@mui/icons-material/Payment";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import type { OrderListItem, OrderStatus } from "@/types/order";

/* ──────────── helpers ──────────── */

const formatCurrency = (v?: number) =>
  v != null
    ? v.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
    : "—";

const formatDateTimeForApi = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${mi}:${s}`;
};

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { from: formatDateTimeForApi(start), to: formatDateTimeForApi(end) };
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  Pending: "Chờ xử lý",
  Preparing: "Đang chuẩn bị",
  ReadyToPick: "Chờ lấy hàng",
  Delivering: "Đang giao",
  Delivered: "Đã giao",
  Cancelled: "Đã hủy",
  Returning: "Đang trả",
  Partial_Returned: "Trả một phần",
  Returned: "Đã trả",
};

const ORDER_STATUS_COLOR: Record<string, "warning" | "info" | "primary" | "secondary" | "success" | "error" | "default"> = {
  Pending: "warning",
  Preparing: "info",
  ReadyToPick: "primary",
  Delivering: "secondary",
  Delivered: "success",
  Cancelled: "error",
  Returning: "warning",
  Partial_Returned: "warning",
  Returned: "default",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  Unpaid: "Chưa thanh toán",
  Paid: "Đã thanh toán",
  Partial_Refunded: "Hoàn một phần",
  Refunded: "Đã hoàn tiền",
};

/* ──────────── StatCard ──────────── */

interface StatCardProps {
  label: string;
  value: string | number | null;
  icon: React.ReactNode;
  color: string;
  bg: string;
  onClick?: () => void;
  helper?: string;
}

const StatCard = ({ label, value, icon, color, bg, onClick, helper }: StatCardProps) => (
  <Paper
    sx={{
      p: 2.5,
      borderRadius: 2,
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.15s",
      "&:hover": onClick ? { boxShadow: 4 } : undefined,
    }}
    onClick={onClick}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Avatar sx={{ bgcolor: bg, color, width: 48, height: 48 }}>{icon}</Avatar>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {value === null ? (
          <Skeleton width={60} height={36} />
        ) : (
          <Typography variant="h5" fontWeight="bold">
            {value}
          </Typography>
        )}
        {helper && (
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        )}
      </Box>
    </Box>
  </Paper>
);

/* ──────────── main component ──────────── */

const StaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Order counts by status
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [preparingCount, setPreparingCount] = useState<number | null>(null);
  const [readyToPickCount, setReadyToPickCount] = useState<number | null>(null);
  const [deliveringCount, setDeliveringCount] = useState<number | null>(null);
  const [deliveredTodayCount, setDeliveredTodayCount] = useState<number | null>(null);
  const [cancelledTodayCount, setCancelledTodayCount] = useState<number | null>(null);

  // Cancel / Return request counts
  const [pendingCancelCount, setPendingCancelCount] = useState<number | null>(null);
  const [pendingReturnCount, setPendingReturnCount] = useState<number | null>(null);

  // Today order counts by status (for chart)
  const [todayOrderStatusCounts, setTodayOrderStatusCounts] = useState<{ status: string; label: string; count: number; color: string }[]>([]);
  const [chartLoaded, setChartLoaded] = useState(false);

  // Inventory
  const [inventorySummary, setInventorySummary] = useState<InventorySummaryResponse | null>(null);

  // Recent orders
  const [recentOrders, setRecentOrders] = useState<OrderListItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    const { from, to } = getTodayRange();

    // Order count by status
    Promise.all([
      orderService.getAllOrders({ Status: "Pending", PageSize: 1 }),
      orderService.getAllOrders({ Status: "Preparing", PageSize: 1 }),
      orderService.getAllOrders({ Status: "ReadyToPick", PageSize: 1 }),
      orderService.getAllOrders({ Status: "Delivering", PageSize: 1 }),
      orderService.getAllOrders({ Status: "Delivered", FromDate: from, ToDate: to, PageSize: 1 }),
      orderService.getAllOrders({ Status: "Cancelled", FromDate: from, ToDate: to, PageSize: 1 }),
    ]).then(([pending, preparing, ready, delivering, delivered, cancelled]) => {
      setPendingCount(pending.totalCount);
      setPreparingCount(preparing.totalCount);
      setReadyToPickCount(ready.totalCount);
      setDeliveringCount(delivering.totalCount);
      setDeliveredTodayCount(delivered.totalCount);
      setCancelledTodayCount(cancelled.totalCount);
    }).catch(() => {
      // Silently handle errors — cards stay in loading state
    });

    // Cancel / Return request counts
    orderService.getAllCancelRequests({ Status: "Pending", PageSize: 1 })
      .then((res) => setPendingCancelCount(res.totalCount))
      .catch(() => {});
    orderService.getAllReturnRequests({ Status: "Pending", PageSize: 1 })
      .then((res) => setPendingReturnCount(res.totalCount))
      .catch(() => {});

    // Today order counts for chart
    const chartStatuses = [
      { status: "Pending", label: "Chờ xử lý", color: "#ed6c02" },
      { status: "Preparing", label: "Đang chuẩn bị", color: "#0288d1" },
      { status: "ReadyToPick", label: "Chờ lấy hàng", color: "#7b1fa2" },
      { status: "Delivering", label: "Đang giao", color: "#1565c0" },
      { status: "Delivered", label: "Đã giao", color: "#2e7d32" },
      { status: "Cancelled", label: "Đã hủy", color: "#d32f2f" },
    ];
    Promise.all(
      chartStatuses.map((s) =>
        orderService
          .getAllOrders({ Status: s.status as OrderStatus, FromDate: from, ToDate: to, PageSize: 1 })
          .then((res) => ({ ...s, count: res.totalCount ?? 0 }))
          .catch(() => ({ ...s, count: 0 }))
      )
    )
      .then(setTodayOrderStatusCounts)
      .finally(() => setChartLoaded(true));

    // Inventory summary
    inventoryService.getSummary()
      .then(setInventorySummary)
      .catch(() => {});

    // Recent orders (latest 5)
    orderService.getAllOrders({ PageSize: 5, IsDescending: true })
      .then((res) => {
        setRecentOrders(res.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingRecent(false));
  }, []);

  const staffLinks = [
    { label: "Quản lý đơn hàng", icon: <AssignmentIcon />, path: "/staff/orders" },
    { label: "POS bán hàng", icon: <PointOfSaleIcon />, path: "/checkout/counter/staff" },
    { label: "Quản lý kho", icon: <InventoryIcon />, path: "/staff/inventory" },
    { label: "Yêu cầu trả hàng", icon: <ReplayIcon />, path: "/staff/return-requests" },
    { label: "Nhập hàng", icon: <ShoppingCartIcon />, path: "/staff/receive-import-stock" },
    { label: "Giao dịch thu chi", icon: <PaymentIcon />, path: "/staff/payment-transactions" },
    { label: "Hỗ trợ khách hàng", icon: <SupportAgentIcon />, path: "/admin/conversations" },
    { label: "Quản lý sản phẩm", icon: <BarChartIcon />, path: "/staff/products" },
  ];

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          Xin chào, {user?.name}!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Tổng quan hoạt động hôm nay
        </Typography>

        <Stack spacing={3}>
          {/* ──── Order status cards ──── */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
              Tình trạng đơn hàng
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(6, 1fr)",
                },
                gap: 2,
              }}
            >
              <StatCard
                label="Chờ xử lý"
                value={pendingCount}
                icon={<HourglassEmptyIcon />}
                color="#ed6c02"
                bg="#fff3e0"
                onClick={() => navigate("/staff/orders", { state: { status: "Pending" } })}
              />
              <StatCard
                label="Đang chuẩn bị"
                value={preparingCount}
                icon={<BuildCircleIcon />}
                color="#0288d1"
                bg="#e1f5fe"
                onClick={() => navigate("/staff/orders", { state: { status: "Preparing" } })}
              />
              <StatCard
                label="Chờ lấy hàng"
                value={readyToPickCount}
                icon={<AssignmentIcon />}
                color="#7b1fa2"
                bg="#f3e5f5"
                onClick={() => navigate("/staff/orders", { state: { status: "ReadyToPick" } })}
              />
              <StatCard
                label="Đang giao"
                value={deliveringCount}
                icon={<LocalShippingIcon />}
                color="#1565c0"
                bg="#e3f2fd"
                onClick={() => navigate("/staff/orders", { state: { status: "Delivering" } })}
              />
              <StatCard
                label="Giao hôm nay"
                value={deliveredTodayCount}
                icon={<CheckCircleIcon />}
                color="#2e7d32"
                bg="#e8f5e9"
                onClick={() => navigate("/staff/orders", { state: { status: "Delivered" } })}
              />
              <StatCard
                label="Hủy hôm nay"
                value={cancelledTodayCount}
                icon={<CancelIcon />}
                color="#d32f2f"
                bg="#ffebee"
                onClick={() => navigate("/staff/orders", { state: { status: "Cancelled" } })}
              />
            </Box>
          </Box>

          {/* ──── Requests + Inventory row ──── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            <StatCard
              label="YC hủy chờ duyệt"
              value={pendingCancelCount}
              icon={<CancelIcon />}
              color="#ed6c02"
              bg="#fff3e0"
              onClick={() => navigate("/staff/orders", { state: { tab: "cancel" } })}
            />
            <StatCard
              label="YC trả hàng chờ duyệt"
              value={pendingReturnCount}
              icon={<ReplayIcon />}
              color="#d32f2f"
              bg="#ffebee"
              onClick={() => navigate("/staff/return-requests")}
            />
            <StatCard
              label="Cảnh báo kho"
              value={
                inventorySummary
                  ? (inventorySummary.lowStockVariantsCount ?? 0) +
                    (inventorySummary.expiredBatchesCount ?? 0) +
                    (inventorySummary.expiringSoonCount ?? 0)
                  : null
              }
              icon={<WarningAmberIcon />}
              color="#ed6c02"
              bg="#fff3e0"
              onClick={() => navigate("/staff/inventory")}
              helper={
                inventorySummary
                  ? `${inventorySummary.lowStockVariantsCount ?? 0} tồn thấp · ${inventorySummary.expiredBatchesCount ?? 0} hết hạn · ${inventorySummary.expiringSoonCount ?? 0} sắp hết hạn`
                  : undefined
              }
            />
          </Box>

          {/* ──── Today order status chart ──── */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Đơn hàng hôm nay theo trạng thái
            </Typography>
            {!chartLoaded ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (() => {
              const total = todayOrderStatusCounts.reduce((s, c) => s + c.count, 0);
              const maxCount = Math.max(...todayOrderStatusCounts.map((c) => c.count), 1);
              return total === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  Chưa có đơn hàng nào hôm nay
                </Typography>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Tổng: <strong>{total}</strong> đơn hàng
                  </Typography>
                  <Stack spacing={1.5}>
                    {todayOrderStatusCounts.map((item) => (
                      <Box key={item.status}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="body2">{item.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {item.count}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            height: 20,
                            borderRadius: 1,
                            bgcolor: "grey.100",
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <Box
                            sx={{
                              height: "100%",
                              width: `${(item.count / maxCount) * 100}%`,
                              bgcolor: item.color,
                              borderRadius: 1,
                              transition: "width 0.6s ease",
                              minWidth: item.count > 0 ? 8 : 0,
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              );
            })()}
          </Paper>

          {/* ──── Inventory summary detail ──── */}
          {inventorySummary && (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Tổng quan kho hàng
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng sản phẩm (variant)
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {inventorySummary.totalVariants ?? 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng tồn kho
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {(inventorySummary.totalStockQuantity ?? 0).toLocaleString("vi-VN")}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng lô hàng
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {inventorySummary.totalBatches ?? 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tồn kho thấp
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={
                      (inventorySummary.lowStockVariantsCount ?? 0) > 0
                        ? "warning.main"
                        : "text.primary"
                    }
                  >
                    {inventorySummary.lowStockVariantsCount ?? 0}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {/* ──── Recent orders table ──── */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Đơn hàng gần đây
              </Typography>
              <Button
                size="small"
                component={RouterLink}
                to="/staff/orders"
              >
                Xem tất cả
              </Button>
            </Box>

            {loadingRecent ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : recentOrders.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                Chưa có đơn hàng nào
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Mã đơn</TableCell>
                      <TableCell>Khách hàng</TableCell>
                      <TableCell>Loại</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell>Thanh toán</TableCell>
                      <TableCell align="right">Tổng tiền</TableCell>
                      <TableCell>Ngày tạo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(`/staff/orders/${order.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {order.code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={order.customerName || "N/A"}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                              {order.customerName || "Khách vãng lai"}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={order.type === "Online" ? "Online" : "Tại quầy"}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={ORDER_STATUS_COLOR[order.status ?? ""] ?? "default"}
                            label={ORDER_STATUS_LABEL[order.status ?? ""] ?? order.status}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {PAYMENT_STATUS_LABEL[order.paymentStatus ?? ""] ?? order.paymentStatus}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {formatCurrency(order.totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* ──── Quick Actions ──── */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Chức năng
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {staffLinks.map((link) => (
                <Button
                  key={link.path}
                  variant="outlined"
                  startIcon={link.icon}
                  component={RouterLink}
                  to={link.path}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          </Paper>
        </Stack>
      </Box>
    </AdminLayout>
  );
};

export default StaffDashboard;
