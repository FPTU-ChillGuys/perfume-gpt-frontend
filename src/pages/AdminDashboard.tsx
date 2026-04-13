import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
  Slider,
  FormControl,
  MenuItem,
  Select,
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

const formatMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getCurrentMonthKey = () => formatMonthKey(new Date());

const getYearMonthOptions = (year = new Date().getFullYear()) => {
  const options: { value: string; label: string }[] = [];

  for (let month = 1; month <= 12; month += 1) {
    const date = new Date(year, month - 1, 1);
    options.push({
      value: formatMonthKey(date),
      label: date.toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      }),
    });
  }

  return options;
};

const parseMonthKey = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  return { year, month };
};

const getMonthRange = (monthKey: string) => {
  const { year, month } = parseMonthKey(monthKey);
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59);

  return {
    from: formatDateTimeForApi(start),
    to: formatDateTimeForApi(end),
  };
};

interface RevenueDayPoint {
  label: string;
  date: Date;
  grossRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  orders: number;
}

interface WeekRange {
  label: string;
  startDay: number;
  endDay: number;
  from: string;
  to: string;
}

const getMonthWeekRanges = (monthKey: string): WeekRange[] => {
  const { year, month } = parseMonthKey(monthKey);
  const monthIndex = month - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

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

      const start = new Date(year, monthIndex, startDay, 0, 0, 0);
      const end = new Date(
        year,
        monthIndex,
        Math.min(endDay, lastDay),
        23,
        59,
        59,
      );

      return {
        label: `Tuần ${index + 1}`,
        startDay,
        endDay: Math.min(endDay, lastDay),
        from: formatDateTimeForApi(start),
        to: formatDateTimeForApi(end),
      };
    })
    .filter((item): item is WeekRange => Boolean(item));
};

interface DayRange {
  label: string;
  date: Date;
  from: string;
  to: string;
}

const getMonthDayRanges = (monthKey: string): DayRange[] => {
  const { year, month } = parseMonthKey(monthKey);
  const monthIndex = month - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const start = new Date(year, monthIndex, day, 0, 0, 0);
    const end = new Date(year, monthIndex, day, 23, 59, 59);

    return {
      label: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
      date: start,
      from: formatDateTimeForApi(start),
      to: formatDateTimeForApi(end),
    };
  });
};

const buildDailyRevenueSeries = (
  ranges: DayRange[],
  summaries: RevenueSummary[],
): RevenueDayPoint[] => {
  return ranges.map((range, index) => {
    const summary = summaries[index] || {};
    const grossRevenue = Math.max(0, Number(summary.grossRevenue ?? 0));
    const refundedAmount = Math.abs(Number(summary.refundedAmount ?? 0));
    const netRevenue = Math.max(
      0,
      Number(summary.netRevenue ?? grossRevenue - refundedAmount),
    );
    const orders = Number(summary.paidOrdersCount ?? 0);

    return {
      label: range.label,
      date: range.date,
      grossRevenue,
      refundedAmount,
      netRevenue,
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

const RevenueLineChart = ({
  data,
  range,
  weekRanges,
  onRangeChange,
}: {
  data: RevenueDayPoint[];
  range: number[];
  weekRanges: WeekRange[];
  onRangeChange: (next: number[]) => void;
}) => {
  const width = 1000;
  const height = 340;
  const margin = { top: 28, right: 24, bottom: 62, left: 70 };
  const xAxisStart = margin.left + 18;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const safeStart = Math.max(0, Math.min(range[0] ?? 0, weekRanges.length - 1));
  const safeEnd = Math.max(
    safeStart,
    Math.min(range[1] ?? safeStart, weekRanges.length - 1),
  );

  const rangeStartDate = weekRanges[safeStart]
    ? new Date(weekRanges[safeStart]!.from)
    : null;
  const rangeEndDate = weekRanges[safeEnd]
    ? new Date(weekRanges[safeEnd]!.to)
    : null;

  const visibleData = data.filter((point) => {
    if (!rangeStartDate || !rangeEndDate) {
      return true;
    }

    return point.date >= rangeStartDate && point.date <= rangeEndDate;
  });

  const allValues = visibleData.flatMap((point) => [
    point.grossRevenue,
    point.netRevenue,
    point.refundedAmount,
  ]);

  const maxRevenue = Math.max(1, ...allValues);
  const minRevenue = 0;
  const valueSpan = Math.max(1, maxRevenue - minRevenue);
  const plotWidth = width - xAxisStart - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const yTickValues = [
    maxRevenue,
    maxRevenue * 0.75,
    maxRevenue * 0.5,
    maxRevenue * 0.25,
    minRevenue,
  ];

  const points = visibleData.map((point, index) => {
    const x =
      xAxisStart + (index * plotWidth) / Math.max(visibleData.length - 1, 1);
    const y =
      margin.top +
      plotHeight -
      ((point.netRevenue - minRevenue) / valueSpan) * plotHeight;
    return { ...point, x, y };
  });

  const smoothPath = (seriesPoints: { x: number; y: number }[]) => {
    if (!seriesPoints.length) {
      return "";
    }

    if (seriesPoints.length === 1) {
      return `M${seriesPoints[0]!.x},${seriesPoints[0]!.y}`;
    }

    let path = `M${seriesPoints[0]!.x},${seriesPoints[0]!.y}`;

    for (let i = 0; i < seriesPoints.length - 1; i += 1) {
      const p1 = seriesPoints[i]!;
      const p2 = seriesPoints[i + 1]!;
      const dx = p2.x - p1.x;
      const curvature = 0.35;

      // Keep control points close to each endpoint's Y value to avoid wavy overshoot.
      const cp1x = p1.x + dx * curvature;
      const cp1y = p1.y;
      const cp2x = p2.x - dx * curvature;
      const cp2y = p2.y;

      path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    return path;
  };

  const buildSeriesPath = (
    selector: (point: RevenueDayPoint) => number,
    source: (RevenueDayPoint & { x: number; y: number })[],
  ) => {
    const seriesPoints = source.map((point) => {
      const value = selector(point);
      const y =
        margin.top +
        plotHeight -
        ((value - minRevenue) / valueSpan) * plotHeight;
      return { x: point.x, y };
    });

    if (!seriesPoints.length) {
      return "";
    }

    const connectedPoints = [
      { x: margin.left, y: seriesPoints[0]!.y },
      ...seriesPoints,
    ];
    return smoothPath(connectedPoints);
  };

  const grossPath = buildSeriesPath((point) => point.grossRevenue, points);
  const netPath = buildSeriesPath((point) => point.netRevenue, points);
  const refundPath = buildSeriesPath((point) => point.refundedAmount, points);

  const hoveredPoint = hoveredIndex != null ? visibleData[hoveredIndex] : null;

  const hoveredX = hoveredIndex != null ? points[hoveredIndex]?.x : undefined;

  const zeroLineY =
    margin.top + plotHeight - ((0 - minRevenue) / valueSpan) * plotHeight;

  const sliderMarks = weekRanges.map((week, index) => ({
    value: index,
    label: week.label,
  }));

  const labelStep = Math.max(1, Math.ceil(visibleData.length / 8));
  const lastPointIndex = Math.max(0, points.length - 1);
  const previousStepLabelIndex = lastPointIndex - (lastPointIndex % labelStep);
  const shouldHidePreviousStepLabel =
    previousStepLabelIndex !== lastPointIndex &&
    lastPointIndex - previousStepLabelIndex < 2;

  return (
    <Box
      sx={{
        borderRadius: 2,
        bgcolor: "#f8fbff",
        border: "1px solid",
        borderColor: "#dbe7f5",
        p: 2.2,
      }}
    >
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={1.5}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{ width: 14, height: 3, bgcolor: "#4ade80", borderRadius: 1 }}
          />
          <Typography variant="caption" color="#334155">
            Doanh thu gộp
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{ width: 14, height: 3, bgcolor: "#60a5fa", borderRadius: 1 }}
          />
          <Typography variant="caption" color="#334155">
            Doanh thu thuần
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{ width: 14, height: 3, bgcolor: "#f87171", borderRadius: 1 }}
          />
          <Typography variant="caption" color="#334155">
            Hoàn tiền
          </Typography>
        </Stack>
      </Stack>

      <Box sx={{ width: "100%", overflowX: "auto", position: "relative" }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Biểu đồ doanh thu theo ngày"
        >
          <line
            x1={xAxisStart}
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

          {zeroLineY >= margin.top && zeroLineY <= margin.top + plotHeight && (
            <line
              x1={xAxisStart}
              y1={zeroLineY}
              x2={width - margin.right}
              y2={zeroLineY}
              stroke="#94a3b8"
              strokeDasharray="5 4"
            />
          )}

          {yTickValues.map((value, index) => {
            const y =
              margin.top +
              plotHeight -
              ((value - minRevenue) / valueSpan) * plotHeight;
            return (
              <g key={index}>
                <line
                  x1={xAxisStart}
                  y1={y}
                  x2={width - margin.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={margin.left - 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="11"
                  textAnchor="end"
                >
                  {formatCompactCurrency(value)}
                </text>
              </g>
            );
          })}

          <path
            d={grossPath}
            fill="none"
            stroke="#4ade80"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={netPath}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={refundPath}
            fill="none"
            stroke="#f87171"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <g key={index}>
              {(() => {
                const leftBoundary =
                  index === 0
                    ? xAxisStart
                    : (points[index - 1]!.x + point.x) / 2;
                const rightBoundary =
                  index === points.length - 1
                    ? width - margin.right
                    : (point.x + points[index + 1]!.x) / 2;

                return (
                  <rect
                    x={leftBoundary}
                    y={margin.top}
                    width={Math.max(0, rightBoundary - leftBoundary)}
                    height={plotHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseMove={() => setHoveredIndex(index)}
                  />
                );
              })()}

              <circle
                cx={point.x}
                cy={
                  margin.top +
                  plotHeight -
                  ((point.netRevenue - minRevenue) / valueSpan) * plotHeight
                }
                r={hoveredIndex === index ? 5 : 3.8}
                fill="#60a5fa"
              />

              {(index === lastPointIndex ||
                (index % labelStep === 0 &&
                  !(
                    shouldHidePreviousStepLabel &&
                    index === previousStepLabelIndex
                  ))) && (
                <text
                  x={point.x}
                  y={height - 14}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="11"
                >
                  {point.label}
                </text>
              )}
            </g>
          ))}

          {hoveredX != null && (
            <line
              x1={hoveredX}
              y1={margin.top}
              x2={hoveredX}
              y2={margin.top + plotHeight}
              stroke="#94a3b8"
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {hoveredPoint && hoveredX != null && (
          <Paper
            elevation={3}
            sx={{
              position: "absolute",
              top: 10,
              left: Math.min(width - 220, Math.max(8, hoveredX + 12)),
              px: 1.25,
              py: 1,
              bgcolor: "#ffffff",
              color: "#0f172a",
              border: "1px solid #cbd5e1",
              borderRadius: 1.5,
              minWidth: 190,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#64748b", display: "block", mb: 0.5 }}
            >
              {hoveredPoint.label}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#86efac", display: "block" }}
            >
              Doanh thu gộp: {formatCurrency(hoveredPoint.grossRevenue)}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#93c5fd", display: "block" }}
            >
              Doanh thu thuần: {formatCurrency(hoveredPoint.netRevenue)}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#fca5a5", display: "block" }}
            >
              Hoàn tiền: {formatCurrency(hoveredPoint.refundedAmount)}
            </Typography>
          </Paper>
        )}
      </Box>

      {weekRanges.length > 1 && (
        <Box sx={{ px: 0.75, pt: 1.5 }}>
          <Slider
            value={range}
            onChange={(_, value) => {
              if (Array.isArray(value) && value.length === 2) {
                onRangeChange([value[0] ?? 0, value[1] ?? 0]);
              }
            }}
            min={0}
            max={weekRanges.length - 1}
            step={1}
            marks={sliderMarks}
            valueLabelDisplay="off"
            sx={{
              color: "#60a5fa",
              "& .MuiSlider-markLabel": {
                color: "#475569",
                fontSize: 11,
                mt: 0.5,
              },
              "& .MuiSlider-rail": {
                bgcolor: "#cbd5e1",
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const monthOptions = getYearMonthOptions(new Date().getFullYear());

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<RevenueDayPoint[]>([]);
  const [monthWeekRanges, setMonthWeekRanges] = useState<WeekRange[]>([]);
  const [revenueRange, setRevenueRange] = useState<number[]>([0, 0]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventorySummary, setInventorySummary] =
    useState<InventoryLevelsSummary>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const todayRange = getTodayRange();
    const monthRange = getMonthRange(selectedMonth);
    const weekRanges = getMonthWeekRanges(selectedMonth);
    const dayRanges = getMonthDayRanges(selectedMonth);
    let active = true;

    Promise.all([
      adminDashboardService.getOverview({
        FromDate: todayRange.from,
        ToDate: todayRange.to,
      }),
      Promise.all(
        dayRanges.map((range) =>
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
        const dailySeries = buildDailyRevenueSeries(
          dayRanges,
          revenueSummaries,
        );
        setDailyRevenue(dailySeries);
        setMonthWeekRanges(weekRanges);
        setRevenueRange([0, Math.max(0, weekRanges.length - 1)]);
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
  }, [selectedMonth, showToast]);

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
      <Box>
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
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mb: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Timeline color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Doanh thu theo ngày trong tháng
                    </Typography>
                  </Stack>

                  <FormControl size="small" sx={{ minWidth: 190 }}>
                    <Select
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(event.target.value)}
                    >
                      {monthOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                {dailyRevenue.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    Chưa có dữ liệu doanh thu của tháng đã chọn
                  </Typography>
                ) : (
                  <RevenueLineChart
                    data={dailyRevenue}
                    weekRanges={monthWeekRanges}
                    range={revenueRange}
                    onRangeChange={setRevenueRange}
                  />
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
                        component={RouterLink}
                        to="/admin/products"
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
      </Box>
    </AdminLayout>
  );
};

export default AdminDashboard;
