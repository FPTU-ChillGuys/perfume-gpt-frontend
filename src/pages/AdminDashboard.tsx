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
  LinearProgress,
} from "@mui/material";
import {
  ShoppingCart,
  AttachMoney,
  Inventory2,
  Warning,
  TrendingUp,
  Timeline,
  PieChart,
  Insights,
  Bolt,
  SettingsSuggest,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminTrendSection } from "../components/admin/AdminTrendSection";
import {
  adminDashboardService,
  type RevenueSummary,
  type TopProduct,
  type InventoryLevelsSummary,
  type PaymentMethodItem,
  type RevenueChartItem,
} from "../services/adminDashboardService";
import { aiAcceptanceService } from "../services/ai/aiAcceptanceService";
import type { AiAcceptanceRecord } from "../types/chatbot";

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
  chartData: RevenueChartItem[],
): RevenueDayPoint[] => {
  return (chartData || []).map((item) => {
    const date = new Date(item.date);
    return {
      label: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      date: date,
      grossRevenue: Number(item.grossRevenue ?? 0),
      refundedAmount: Math.abs(Number(item.refundedAmount ?? 0)),
      netRevenue: Number(item.netRevenue ?? 0),
      orders: 0,
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
  <Paper
    sx={{
      p: { xs: 1.25, sm: 1.5, lg: 1.75 },
      borderRadius: 2,
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: { xs: 1, lg: 1.25 }, flex: 1 }}>
      <Avatar
        sx={{
          bgcolor: bg,
          color,
          width: { xs: 32, sm: 36, lg: 40 },
          height: { xs: 32, sm: 36, lg: 40 },
          flexShrink: 0,
        }}
      >
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ mb: 0.25, display: "block", fontSize: { xs: "0.6rem", sm: "0.65rem", lg: "0.7rem" } }}
        >
          {label}
        </Typography>
        <Typography
          variant={value.toString().length > 10 ? "h6" : "h5"}
          fontWeight="bold"
          sx={{
            wordBreak: "normal",
            lineHeight: 1.2,
            mb: 0.5,
            fontSize: { xs: "1rem", sm: "1.1rem", lg: "1.05rem", xl: "1.35rem" },
          }}
        >
          {value}
        </Typography>
        {helper && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              lineHeight: 1.2,
              mt: "auto",
              fontSize: { xs: "0.6rem", lg: "0.65rem" },
            }}
          >
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

  // Key to restart animations when data changes
  const chartKey = data.length > 0 ? `${data[0]?.label}-${data.length}` : "empty";

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
      ((Math.max(0, point.netRevenue) - minRevenue) / valueSpan) * plotHeight;
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
      const rawValue = selector(point);
      // Clamp negative values to 0 for visualization on the chart
      const value = Math.max(0, rawValue);
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
      { x: margin.left, y: margin.top + plotHeight },
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

      <Box sx={{ width: "100%", position: "relative" }}>
        <style>
          {`
            @keyframes drawPath {
              from { stroke-dashoffset: 3000; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes fadeInPoint {
              from { opacity: 0; transform: scale(0); }
              to { opacity: 1; transform: scale(1); }
            }
            .chart-path {
              stroke-dasharray: 3000;
              stroke-dashoffset: 3000;
              animation: drawPath 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            .chart-point {
              transform-origin: center;
              animation: fadeInPoint 0.5s ease-out forwards;
              opacity: 0;
            }
          `}
        </style>
        <svg
          key={chartKey}
          width="100%"
          height="auto"
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: "block", width: "100%" }}
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
            className="chart-path"
            style={{ animationDelay: "0s" }}
          />

          <path
            d={netPath}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chart-path"
            style={{ animationDelay: "0.2s" }}
          />

          <path
            d={refundPath}
            fill="none"
            stroke="#f87171"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chart-path"
            style={{ animationDelay: "0.4s" }}
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

              {/* Point dots removed as requested for a cleaner line look */}

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
              // Use percentage for responsive positioning and flip if near the right edge
              left:
                hoveredX > width * 0.7
                  ? `calc(${(hoveredX / width) * 100}% - 210px)`
                  : `calc(${(hoveredX / width) * 100}% + 12px)`,
              px: 1.25,
              py: 1,
              bgcolor: "#ffffff",
              color: "#0f172a",
              border: "1px solid #cbd5e1",
              borderRadius: 1.5,
              minWidth: 190,
              zIndex: 10,
              pointerEvents: "none", // Prevent tooltip from flickering when mouse is over it
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
              sx={{
                color: hoveredPoint.netRevenue < 0 ? "#ef4444" : "#93c5fd",
                display: "block",
                fontWeight: hoveredPoint.netRevenue < 0 ? "bold" : "normal",
              }}
            >
              Doanh thu thuần: {formatCurrency(hoveredPoint.netRevenue)}
              {hoveredPoint.netRevenue < 0 && " (Lỗ)"}
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CashOnDelivery: "Tiền mặt (COD)",
  VnPay: "VNPay",
  Momo: "MoMo",
  CashInStore: "Tiền mặt tại cửa hàng",
  ExternalBankTransfer: "Chuyển khoản",
  PayOs: "PayOS",
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CashOnDelivery: "#f59e0b",
  VnPay: "#3b82f6",
  Momo: "#ec4899",
  CashInStore: "#10b981",
  ExternalBankTransfer: "#8b5cf6",
  PayOs: "#06b6d4",
};

const DEFAULT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
];

const PaymentDonutChart = ({
  distribution,
}: {
  distribution: PaymentMethodItem[];
}) => {
  const active = distribution.filter((item) => item.transactionsCount > 0);
  const total = active.reduce((sum, item) => sum + item.amount, 0);

  // Build conic-gradient segments
  let currentAngle = 0;
  const segments = active.map((item, index) => {
    const pct = total > 0 ? item.amount / total : 1 / active.length;
    const startAngle = currentAngle;
    const endAngle = currentAngle + pct * 360;
    currentAngle = endAngle;
    const color =
      PAYMENT_METHOD_COLORS[item.paymentMethod] ??
      DEFAULT_COLORS[index % DEFAULT_COLORS.length] ??
      "#94a3b8";
    return { ...item, color, startAngle, endAngle, pct };
  });

  const gradientStops =
    active.length > 0
      ? segments
          .map((seg) => `${seg.color} ${seg.startAngle}deg ${seg.endAngle}deg`)
          .join(", ")
      : "#e2e8f0 0deg 360deg";

  const centerContent =
    active.length === 0 ? (
      <Typography variant="caption" color="text.secondary" textAlign="center">
        Không có
        <br />
        giao dịch
      </Typography>
    ) : (
      <>
        <Typography variant="h6" fontWeight={700} color="text.primary">
          {active.length}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          hình thức
        </Typography>
      </>
    );

  return (
    <Box
      key={JSON.stringify(distribution)}
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        animation: "donutAppear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "@keyframes donutAppear": {
          from: { opacity: 0, transform: "scale(0.9) rotate(-5deg)" },
          to: { opacity: 1, transform: "scale(1) rotate(0)" },
        },
      }}
    >
      {/* Donut — tự lấp đầy phần còn lại theo chiều dọc */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 1,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 320,
            aspectRatio: "1",
            borderRadius: "50%",
            background: `conic-gradient(${gradientStops})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: "60%",
              aspectRatio: "1",
              borderRadius: "50%",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            {centerContent}
          </Box>
        </Box>
      </Box>

      {/* Legend — cố định ở dưới */}
      {active.length > 0 && (
        <Stack spacing={0.5} sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
          {segments.map((seg) => (
            <Box
              key={seg.paymentMethod}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box display="flex" alignItems="center" gap={0.75} sx={{ minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: seg.color,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" color="text.primary" noWrap>
                  {PAYMENT_METHOD_LABELS[seg.paymentMethod] ?? seg.paymentMethod}
                </Typography>
              </Box>
              <Box sx={{ flexShrink: 0, ml: 1, textAlign: "right" }}>
                <Typography variant="caption" fontWeight={700}>
                  {(seg.pct * 100).toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                  {seg.transactionsCount} GD
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      {active.length === 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" pb={1}>
          Tháng này chưa có giao dịch thanh toán nào.
        </Typography>
      )}
    </Box>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const monthOptions = getYearMonthOptions(new Date().getFullYear());

  const [todayRevenueSummary, setTodayRevenueSummary] = useState<RevenueSummary | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<RevenueDayPoint[]>([]);
  const [monthWeekRanges, setMonthWeekRanges] = useState<WeekRange[]>([]);
  const [revenueRange, setRevenueRange] = useState<number[]>([0, 0]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventorySummary, setInventorySummary] =
    useState<InventoryLevelsSummary>({});
  const [isLoading, setIsLoading] = useState(true);
  const [aiRecords, setAiRecords] = useState<AiAcceptanceRecord[]>([]);
  const [rateAccepted, setRateAccepted] = useState<number | null>(null);
  const [rateRejected, setRateRejected] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [monthRevenueSummary, setMonthRevenueSummary] =
    useState<RevenueSummary | null>(null);

  useEffect(() => {
    const todayRange = getTodayRange();
    const monthRange = getMonthRange(selectedMonth);
    const weekRanges = getMonthWeekRanges(selectedMonth);
    let active = true;

    Promise.all([
      adminDashboardService.getRevenue({
        FromDate: todayRange.from,
        ToDate: todayRange.to,
      }),
      adminDashboardService.getTopProducts({
        Top: 5,
        FromDate: monthRange.from,
        ToDate: monthRange.to,
      }),
      adminDashboardService.getInventoryLevels(),
      adminDashboardService.getRevenue({
        FromDate: monthRange.from,
        ToDate: monthRange.to,
      }),
      aiAcceptanceService.getAllAcceptanceStatus(),
      aiAcceptanceService.getAcceptanceRate(true),
      aiAcceptanceService.getAcceptanceRate(false),
    ])
      .then(([todayRev, top, inv, monthRev, aiData, accepted, rejected]) => {
        if (!active) {
          return;
        }

        setTodayRevenueSummary(todayRev);
        const dailySeries = buildDailyRevenueSeries(monthRev.chartData || []);
        setDailyRevenue(dailySeries);
        setMonthWeekRanges(weekRanges);
        setRevenueRange([0, Math.max(0, weekRanges.length - 1)]);
        setTopProducts(top);
        setInventorySummary(inv);
        setMonthRevenueSummary(monthRev);
        setAiRecords(aiData);
        setRateAccepted(accepted);
        setRateRejected(rejected);
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

  const todayOrders = Number(todayRevenueSummary?.paidOrdersCount ?? 0);
  const todayRevenue = Number(
    todayRevenueSummary?.netRevenue ?? todayRevenueSummary?.grossRevenue ?? 0,
  );
  const monthNetRevenue = Number(
    monthRevenueSummary?.netRevenue ?? monthRevenueSummary?.grossRevenue ?? 0,
  );
  const monthGrossRevenue = Number(monthRevenueSummary?.grossRevenue ?? 0);
  const monthRefundedAmount = Math.abs(
    Number(monthRevenueSummary?.refundedAmount ?? 0),
  );

  const lowStockCount = Number(inventorySummary.lowStockVariantsCount ?? 0);
  const outOfStockCount = Number(inventorySummary.outOfStockVariantsCount ?? 0);
  const expiringSoonCount = Number(inventorySummary.expiringSoonCount ?? 0);

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
                  md: "repeat(3, 1fr)",
                  lg: "0.8fr 1.05fr 1.05fr 1.05fr 1.05fr",
                },
                gap: { xs: 1, sm: 1.5, lg: 1.5 },
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
                label="Doanh thu thuần (Tháng)"
                value={formatCurrency(monthNetRevenue)}
                icon={<TrendingUp />}
                color="#6366f1"
                bg="#ede9fe"
                helper={`Doanh thu ${monthOptions.find((o) => o.value === selectedMonth)?.label ?? selectedMonth}`}
              />
              <StatCard
                label="Doanh thu gộp (Tháng)"
                value={formatCurrency(monthGrossRevenue)}
                icon={<Timeline />}
                color="#4ade80"
                bg="#f0fdf4"
                helper="Tổng doanh thu trước khi trừ hoàn tiền"
              />
              <StatCard
                label="Hoàn tiền (Tháng)"
                value={formatCurrency(monthRefundedAmount)}
                icon={<Warning />}
                color="#f87171"
                bg="#fef2f2"
                helper="Tổng số tiền đã hoàn trả"
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

              <Paper sx={{ p: 2.5, borderRadius: 2.5, display: "flex", flexDirection: "column", height: "100%" }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
                >
                  <PieChart color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Phân bổ phương thức thanh toán
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" mb={2} display="block">
                  {monthOptions.find((o) => o.value === selectedMonth)?.label ?? selectedMonth}
                </Typography>

                <PaymentDonutChart
                  distribution={
                    monthRevenueSummary?.paymentMethodDistribution ?? []
                  }
                />
              </Paper>
            </Box>

            {/* Khu vực 3: Top Performance & Operational Alerts */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1.2fr 1.8fr" },
                gap: 2,
              }}
            >
              <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <TrendingUp color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Bán Chạy Nhất
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
                          borderRadius: 2,
                          px: 1,
                          mx: -1,
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
                              width: 48,
                              height: 48,
                              borderRadius: 1.5,
                              objectFit: "cover",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: "0.925rem", mb: 0.25 }}>
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

              <Paper sx={{ p: 2.5, borderRadius: 2.5, display: "flex", flexDirection: "column" }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight={800} display="flex" alignItems="center" gap={1.5}>
                    <SettingsSuggest sx={{ color: "primary.main", fontSize: 28 }} />
                    Vận hành & Hiệu quả AI
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thống kê kho bãi và dữ liệu hỗ trợ từ AI
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                    gap: 1.5,
                  }}
                >
                  {/* Stock Status */}
                  {[
                    {
                      label: "Hết hàng",
                      value: outOfStockCount,
                      icon: <Insights />,
                      color: "#dc2626",
                      bg: "#fef2f2",
                    },
                    {
                      label: "Sắp hết",
                      value: lowStockCount,
                      icon: <Inventory2 />,
                      color: "#ea580c",
                      bg: "#fff7ed",
                    },
                    {
                      label: "Sắp hết hạn",
                      value: expiringSoonCount,
                      icon: <Bolt />,
                      color: "#2563eb",
                      bg: "#eff6ff",
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        p: 1.75,
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                          borderColor: item.color,
                        },
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: item.bg,
                          color: item.color,
                          borderRadius: 2,
                        }}
                      >
                        {item.icon}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.65rem" }}>
                          {item.label}
                        </Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                          {item.value.toLocaleString("vi-VN")}
                        </Typography>
                      </Box>
                    </Box>
                  ))}

                  {/* AI Acceptance Status */}
                  {[
                    {
                      label: "Tổng gợi ý từ AI",
                      value: aiRecords.length,
                      icon: <Timeline />,
                      color: "#6366f1",
                      bg: "#eef2ff",
                      progress: 100,
                    },
                    {
                      label: "Tỷ lệ chấp nhận",
                      value: rateAccepted !== null ? `${rateAccepted.toFixed(1)}%` : "0%",
                      icon: <Insights />,
                      color: "#10b981",
                      bg: "#ecfdf5",
                      progress: rateAccepted ?? 0,
                      subtext: `${aiRecords.filter(r => r.isAccepted).length} bản ghi`,
                    },
                    {
                      label: "Tỷ lệ từ chối",
                      value: rateRejected !== null ? `${rateRejected.toFixed(1)}%` : "0%",
                      icon: <Warning />,
                      color: "#f43f5e",
                      bg: "#fff1f2",
                      progress: rateRejected ?? 0,
                      subtext: `${aiRecords.filter(r => !r.isAccepted).length} bản ghi`,
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        p: 1.75,
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                          borderColor: item.color,
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: item.bg,
                            color: item.color,
                            borderRadius: 2,
                          }}
                        >
                          {item.icon}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.65rem" }}>
                            {item.label}
                          </Typography>
                          <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                            {item.value}
                          </Typography>
                        </Box>
                      </Stack>
                      
                      <Box sx={{ px: 0.5 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={item.progress} 
                          sx={{ 
                            height: 4, 
                            borderRadius: 2,
                            bgcolor: "rgba(0,0,0,0.05)",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: item.color
                            }
                          }} 
                        />
                        {"subtext" in item && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", mt: 0.5, display: "block", textAlign: "right" }}>
                            {item.subtext}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
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
