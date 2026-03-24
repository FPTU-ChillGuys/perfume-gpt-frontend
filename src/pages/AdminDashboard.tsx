import { useEffect, useState } from "react";
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
  Chip,
} from "@mui/material";
import {
  People,
  Inventory,
  ShoppingCart,
  AttachMoney,
  PendingActions,
  Warning,
  TrendingUp,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminTrendSection } from "../components/admin/AdminTrendSection";
import {
  adminDashboardService,
  type DashboardOverview,
  type TopProduct,
  type InventoryLevelItem,
} from "../services/adminDashboardService";

const formatCurrency = (v?: number) =>
  v != null
    ? v.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
    : "—";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const StatCard = ({ label, value, icon, color, bg }: StatCardProps) => (
  <Paper sx={{ p: 2.5, borderRadius: 2 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Avatar sx={{ bgcolor: bg, color, width: 48, height: 48 }}>{icon}</Avatar>
      <Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight="bold">{value}</Typography>
      </Box>
    </Box>
  </Paper>
);

const AdminDashboard = () => {
  const { user } = useAuth();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<InventoryLevelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      adminDashboardService.getOverview(),
      adminDashboardService.getTopProducts({ Top: 5 }),
      adminDashboardService.getInventoryLevels(),
    ])
      .then(([ov, top, inv]) => {
        setOverview(ov);
        setTopProducts(top);
        setLowStock(inv.filter((i) => i.status === "Low" || i.status === "OutOfStock").slice(0, 8));
      })
      .catch((err: any) => {
        setError(err?.message || "Không thể tải dữ liệu dashboard");
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AdminLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Xin chào, <strong>{user?.name}</strong>! Đây là tổng quan hệ thống hôm nay.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={48} />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* KPI Cards */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              <StatCard
                label="Tổng người dùng"
                value={(overview?.totalUsers ?? 0).toLocaleString("vi-VN")}
                icon={<People />}
                color="#6366f1"
                bg="#ede9fe"
              />
              <StatCard
                label="Tổng sản phẩm"
                value={(overview?.totalProducts ?? 0).toLocaleString("vi-VN")}
                icon={<Inventory />}
                color="#0ea5e9"
                bg="#e0f2fe"
              />
              <StatCard
                label="Tổng đơn hàng"
                value={(overview?.totalOrders ?? 0).toLocaleString("vi-VN")}
                icon={<ShoppingCart />}
                color="#10b981"
                bg="#d1fae5"
              />
              <StatCard
                label="Doanh thu"
                value={formatCurrency(overview?.totalRevenue)}
                icon={<AttachMoney />}
                color="#f59e0b"
                bg="#fef3c7"
              />
              <StatCard
                label="Đơn chờ xử lý"
                value={(overview?.pendingOrders ?? 0).toLocaleString("vi-VN")}
                icon={<PendingActions />}
                color="#ef4444"
                bg="#fee2e2"
              />
              <StatCard
                label="Sản phẩm sắp hết hàng"
                value={(overview?.lowStockProducts ?? 0).toLocaleString("vi-VN")}
                icon={<Warning />}
                color="#f97316"
                bg="#ffedd5"
              />
            </Box>

            {/* Bottom row */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              {/* Top Products */}
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <TrendingUp color="primary" />
                  <Typography variant="h6" fontWeight="bold">Top sản phẩm bán chạy</Typography>
                </Box>
                {topProducts.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center" py={2}>
                    Chưa có dữ liệu
                  </Typography>
                ) : (
                  <Stack divider={<Divider />}>
                    {topProducts.map((p, i) => (
                      <Box key={p.productId ?? i} sx={{ display: "flex", alignItems: "center", py: 1.2, gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>
                          #{i + 1}
                        </Typography>
                        {p.imageUrl && (
                          <Box
                            component="img"
                            src={p.imageUrl}
                            sx={{ width: 36, height: 36, borderRadius: 1, objectFit: "cover" }}
                          />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {p.productName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Đã bán: {p.totalSold?.toLocaleString("vi-VN")}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {formatCurrency(p.totalRevenue)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>

              {/* Low Stock Warning */}
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Warning color="warning" />
                  <Typography variant="h6" fontWeight="bold">Cảnh báo tồn kho thấp</Typography>
                </Box>
                {lowStock.length === 0 ? (
                  <Typography color="success.main" textAlign="center" py={2}>
                    ✅ Tất cả sản phẩm đều đủ hàng
                  </Typography>
                ) : (
                  <Stack divider={<Divider />}>
                    {lowStock.map((s, i) => (
                      <Box key={s.productId ?? i} sx={{ display: "flex", alignItems: "center", py: 1.2, gap: 1.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {s.productName}
                          </Typography>
                          {s.variantName && (
                            <Typography variant="caption" color="text.secondary">
                              {s.variantName}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Chip
                            label={s.status === "OutOfStock" ? "Hết hàng" : `Còn ${s.currentStock}`}
                            color={s.status === "OutOfStock" ? "error" : "warning"}
                            size="small"
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Box>

            {/* Trend Section */}
            <AdminTrendSection />
          </Stack>
        )}
      </Container>
    </AdminLayout>
  );
};

export default AdminDashboard;
