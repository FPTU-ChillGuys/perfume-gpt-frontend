import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
} from "@mui/material";
import {
  PersonAdd,
  ShoppingCart,
  AttachMoney,
  Inventory2,
  Warning,
  TrendingUp,
  Timeline,
  PieChart,
  Insights,
  Bolt,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminTrendSection } from "../components/admin/AdminTrendSection";
import {
  adminDashboardService,
  type DashboardOverview,
  type RevenueSummary,
  type TopProduct,
  type InventoryLevelsSummary,
} from "../services/adminDashboardService";

const formatCurrency = (v?: number) =>
  v != null
    ? v.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
    : "—";

const formatCompactCurrency = (v?: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(v ?? 0));

const formatDateTimeForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
  );
  return {
    from: formatDateTimeForApi(start),
    to: formatDateTimeForApi(end),
  };
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return {
    from: formatDateTimeForApi(start),
    to: formatDateTimeForApi(end),
  };
};

interface WeekRevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}

interface WeekRange {
  label: string;
  from: string;
  to: string;
}

const getCurrentMonthWeekRanges = (): WeekRange[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const weekBreakpoints = [1, 8, 15, 22, 29];
  return weekBreakpoints
    .map((startDay, index) => {
      const endDay =
        index < weekBreakpoints.length - 1
          ? weekBreakpoints[index + 1]! - 1
          : lastDay;

      if (startDay > lastDay) {
        return null;
      }

      const start = new Date(year, month, startDay, 0, 0, 0);
      const end = new Date(year, month, Math.min(endDay, lastDay), 23, 59, 59);

      return {
        label: `Tuần ${index + 1}`,
        from: formatDateTimeForApi(start),
        to: formatDateTimeForApi(end),
      };
    })
    .filter((item): item is WeekRange => Boolean(item));
};

const buildWeeklyRevenueSeries = (
  ranges: WeekRange[],
  summaries: RevenueSummary[],
): WeekRevenuePoint[] => {
  return ranges.map((range, index) => {
    const summary = summaries[index] || {};
    const revenue = Number(summary.netRevenue ?? summary.grossRevenue ?? 0);
    const orders = Number(summary.paidOrdersCount ?? 0);

    return {
      label: range.label,
      revenue,
      orders,
    };
  });
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  helper?: string;
}

const StatCard = ({ label, value, icon, color, bg, helper }: StatCardProps) => (
  <Paper sx={{ p: 2.5, borderRadius: 2 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Avatar sx={{ bgcolor: bg, color, width: 48, height: 48 }}>{icon}</Avatar>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight="bold">
          {value}
        </Typography>
        {helper && (
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        )}
      </Box>
    </Box>
  </Paper>
);

const RevenueLineChart = ({ data }: { data: WeekRevenuePoint[] }) => {
  const width = 640;
  const height = 320;
  const margin = { top: 18, right: 24, bottom: 56, left: 62 };

  const maxRevenue = Math.max(1, ...data.map((point) => point.revenue));
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const points = data.map((point, index) => {
    const x = margin.left + (index * plotWidth) / Math.max(data.length - 1, 1);
    const y =
      margin.top + plotHeight - (point.revenue / maxRevenue) * plotHeight;
    return { ...point, x, y };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");

  return (
    <Box>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Biểu đồ doanh thu theo tuần"
        >
          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={width - margin.right}
            y2={margin.top + plotHeight}
            stroke="#cbd5e1"
          />

          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#cbd5e1"
          />

          {[0, 0.25, 0.5, 0.75, 1].map((tick, index) => {
            const y = margin.top + plotHeight - tick * plotHeight;
            return (
              <g key={index}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={width - margin.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="3 3"
                />
                <text
                  x={margin.left - 8}
                  y={y + 4}
                  fill="#6b7280"
                  fontSize="11"
                  textAnchor="end"
                >
                  {formatCompactCurrency(maxRevenue * tick)}
                </text>
              </g>
            );
          })}

          <path
            d={path}
            fill="none"
            stroke="#2563eb"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <g key={index}>
              <circle cx={point.x} cy={point.y} r={4} fill="#1d4ed8" />
              <text
                x={point.x}
                y={height - 14}
                textAnchor="middle"
                fill="#374151"
                fontSize="11"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </Box>
    </Box>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [weeklyRevenue, setWeeklyRevenue] = useState<WeekRevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventorySummary, setInventorySummary] =
    useState<InventoryLevelsSummary>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const todayRange = getTodayRange();
    const monthRange = getCurrentMonthRange();
    const weekRanges = getCurrentMonthWeekRanges();
    let active = true;

    Promise.all([
      adminDashboardService.getOverview({
        FromDate: todayRange.from,
        ToDate: todayRange.to,
      }),
      Promise.all(
        weekRanges.map((range) =>
          adminDashboardService.getRevenue({
            FromDate: range.from,
            ToDate: range.to,
          }),
        ),
      ),
      adminDashboardService.getTopProducts({
        Top: 5,
        FromDate: monthRange.from,
        ToDate: monthRange.to,
      }),
      adminDashboardService.getInventoryLevels(),
    ])
      .then(([ov, revenueSummaries, top, inv]) => {
        if (!active) {
          return;
        }

        setOverview(ov);
        setWeeklyRevenue(
          buildWeeklyRevenueSeries(weekRanges, revenueSummaries),
        );
        setTopProducts(top);
        setInventorySummary(inv);
      })
      .catch((err: any) => {
        if (!active) {
          return;
        }
        showToast(err?.message || "Không thể tải dữ liệu dashboard", "error");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  const todayOrders = Number(overview?.revenue?.paidOrdersCount ?? 0);
  const todayRevenue = Number(
    overview?.revenue?.netRevenue ?? overview?.revenue?.grossRevenue ?? 0,
  );
  const newUsersToday =
    (overview as any)?.newUsersToday ??
    (overview as any)?.totalUsersCreatedToday ??
    null;
  const lowStockCount = Number(
    inventorySummary.lowStockVariantsCount ??
      overview?.inventoryLevels?.lowStockVariantsCount ??
      0,
  );
  const outOfStockCount = Number(
    inventorySummary.outOfStockVariantsCount ??
      overview?.inventoryLevels?.outOfStockVariantsCount ??
      0,
  );
  const expiringSoonCount = Number(
    inventorySummary.expiringSoonCount ??
      overview?.inventoryLevels?.expiringSoonCount ??
      0,
  );
  const pendingOrdersCount = Number((overview as any)?.pendingOrders ?? 0);

  return (
    <AdminLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, pt: 0.5 }}>
          <Typography variant="body1" color="text.secondary">
            Xin chào, <strong>{user?.name}</strong>! Đây là tổng quan hệ thống
            hôm nay.
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={48} />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Khu vực 1: Overview */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  lg: "repeat(4, 1fr)",
                },
                gap: 2,
              }}
            >
              <StatCard
                label="Đơn hàng hôm nay"
                value={todayOrders.toLocaleString("vi-VN")}
                icon={<ShoppingCart />}
                color="#0ea5e9"
                bg="#e0f2fe"
              />
              <StatCard
                label="Doanh thu hôm nay"
                value={formatCurrency(todayRevenue)}
                icon={<AttachMoney />}
                color="#10b981"
                bg="#dcfce7"
              />
              <StatCard
                label="Người dùng mới hôm nay"
                value={
                  newUsersToday == null
                    ? "—"
                    : Number(newUsersToday).toLocaleString("vi-VN")
                }
                icon={<PersonAdd />}
                color="#6366f1"
                bg="#ede9fe"
                helper={
                  newUsersToday == null
                    ? "Schema hiện tại chưa có chỉ số user mới"
                    : "Theo khung thời gian hôm nay"
                }
              />
              <StatCard
                label="Biến thể sắp hết hàng"
                value={lowStockCount.toLocaleString("vi-VN")}
                icon={<Inventory2 />}
                color="#f97316"
                bg="#ffedd5"
              />
            </Box>

            {/* Khu vực 2: Revenue visualization */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
                gap: 2,
              }}
            >
              <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <Timeline color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Doanh thu tháng hiện tại theo tuần
                  </Typography>
                </Box>
                {weeklyRevenue.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    Chưa có dữ liệu doanh thu theo tháng
                  </Typography>
                ) : (
                  <RevenueLineChart data={weeklyRevenue} />
                )}
              </Paper>

              <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <PieChart color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Phân bổ phương thức thanh toán
                  </Typography>
                </Box>

                <Box
                  sx={{
                    mx: "auto",
                    width: 156,
                    height: 156,
                    borderRadius: "50%",
                    background: "conic-gradient(#cbd5e1 0deg 360deg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: 94,
                      height: 94,
                      borderRadius: "50%",
                      bgcolor: "background.paper",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textAlign="center"
                    >
                      Chưa có API
                      <br />
                      thanh toán
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: "#94a3b8",
                        }}
                      />
                      <Typography variant="body2">VNPay</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Chưa có dữ liệu
                    </Typography>
                  </Box>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: "#cbd5e1",
                        }}
                      />
                      <Typography variant="body2">MoMo</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Chưa có dữ liệu
                    </Typography>
                  </Box>
                </Stack>

                <Alert severity="info" sx={{ mt: 2 }}>
                  Chưa có dữ liệu phân bổ phương thức thanh toán từ API. Khi
                  backend bổ sung, biểu đồ sẽ hiển thị tỷ lệ tự động.
                </Alert>
              </Paper>
            </Box>

            {/* Khu vực 3: Top Performance & Operational Alerts */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1.4fr 1fr" },
                gap: 2,
              }}
            >
              <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <TrendingUp color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Top Performance
                  </Typography>
                </Box>

                {topProducts.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center" py={3}>
                    Chưa có dữ liệu top sản phẩm
                  </Typography>
                ) : (
                  <Stack divider={<Divider />}>
                    {topProducts.map((p, i) => (
                      <Box
                        key={p.productId ?? i}
                        onClick={() => navigate("/admin/products")}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          py: 1.2,
                          gap: 1.5,
                          cursor: "pointer",
                          borderRadius: 1,
                          px: 0.5,
                          mx: -0.5,
                          transition: "background 0.15s",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ minWidth: 22 }}
                        >
                          #{i + 1}
                        </Typography>
                        {p.imageUrl && (
                          <Box
                            component="img"
                            src={p.imageUrl}
                            alt={p.productName || "Sản phẩm"}
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1,
                              objectFit: "cover",
                            }}
                          />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {p.productName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Đã bán:{" "}
                            {Number(p.totalUnitsSold ?? 0).toLocaleString(
                              "vi-VN",
                            )}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="primary.main"
                        >
                          {formatCurrency(p.revenue)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>

              <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <Bolt color="warning" />
                  <Typography variant="h6" fontWeight="bold">
                    Cảnh báo vận hành
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 1.25,
                    mb: 2,
                  }}
                >
                  {[
                    {
                      label: "Đơn chờ xử lý",
                      value: pendingOrdersCount,
                      icon: <Warning />,
                      color: "#d97706",
                      bg: "#fff7ed",
                    },
                    {
                      label: "Variant hết hàng",
                      value: outOfStockCount,
                      icon: <Insights />,
                      color: "#dc2626",
                      bg: "#fef2f2",
                    },
                    {
                      label: "Variant sắp hết",
                      value: lowStockCount,
                      icon: <Inventory2 />,
                      color: "#ea580c",
                      bg: "#fff7ed",
                    },
                    {
                      label: "Lô sắp hết hạn",
                      value: expiringSoonCount,
                      icon: <Bolt />,
                      color: "#2563eb",
                      bg: "#eff6ff",
                    },
                  ].map((item) => (
                    <Paper
                      key={item.label}
                      variant="outlined"
                      sx={{ p: 1.25, borderRadius: 2, borderColor: "divider" }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.2}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: item.bg,
                            color: item.color,
                          }}
                        >
                          {item.icon}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {item.value.toLocaleString("vi-VN")}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  API hiện tại chỉ trả dữ liệu tổng hợp cho tồn kho. Chi tiết
                  từng variant cần API bổ sung để hiển thị danh sách cảnh báo cụ
                  thể.
                </Typography>
              </Paper>
            </Box>

            {/* Khu vực 4: Xu hướng - AI Accepted */}
            <AdminTrendSection />
          </Stack>
        )}
      </Container>
    </AdminLayout>
  );
};

export default AdminDashboard;
