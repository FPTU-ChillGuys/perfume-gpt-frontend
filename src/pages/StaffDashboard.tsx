import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Button,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { AdminLayout } from "../layouts/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "@/services/orderService";
import AssignmentIcon from "@mui/icons-material/Assignment";
import InventoryIcon from "@mui/icons-material/Inventory";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import BarChartIcon from "@mui/icons-material/BarChart";

const StaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [deliveredTodayCount, setDeliveredTodayCount] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setHours(0, 0, 0, 0);

    Promise.all([
      orderService.getAllOrders({ Status: "Pending", PageSize: 1 }),
      orderService.getAllOrders({
        Status: "Delivered",
        FromDate: fromDate.toISOString(),
        ToDate: today.toISOString(),
        PageSize: 1,
      }),
    ]).then(([pendingRes, deliveredRes]) => {
      setPendingCount(pendingRes.totalCount);
      setDeliveredTodayCount(deliveredRes.totalCount);
    });
  }, []);

  const staffLinks = [
    {
      label: "Xử lý đơn hàng",
      icon: <AssignmentIcon />,
      path: "/admin/orders",
    },
    {
      label: "Quản lý kho hàng",
      icon: <InventoryIcon />,
      path: "/admin/inventory",
    },
    {
      label: "Hỗ trợ khách hàng",
      icon: <SupportAgentIcon />,
      path: "/admin/conversations",
    },
    {
      label: "Xem báo cáo",
      icon: <BarChartIcon />,
      path: "/admin/inventory/logs",
    },
  ];

  return (
    <AdminLayout>
      <Container maxWidth="xl">
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Xin chào, {user?.name}!
        </Typography>

        <Stack spacing={3}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 3,
            }}
          >
            <Paper
              sx={{
                p: 3,
                cursor: "pointer",
                transition: "box-shadow 0.15s",
                "&:hover": { boxShadow: 4 },
              }}
              onClick={() =>
                navigate("/admin/orders", { state: { status: "Pending" } })
              }
            >
              <Typography variant="h6" gutterBottom>
                Đơn hàng chờ xử lý
              </Typography>
              {pendingCount === null ? (
                <CircularProgress size={32} />
              ) : (
                <Typography variant="h3" color="primary">
                  {pendingCount}
                </Typography>
              )}
            </Paper>

            <Paper
              sx={{
                p: 3,
                cursor: "pointer",
                transition: "box-shadow 0.15s",
                "&:hover": { boxShadow: 4 },
              }}
              onClick={() =>
                navigate("/admin/orders", { state: { status: "Delivered" } })
              }
            >
              <Typography variant="h6" gutterBottom>
                Giao thành công hôm nay
              </Typography>
              {deliveredTodayCount === null ? (
                <CircularProgress size={32} />
              ) : (
                <Typography variant="h3" color="success.main">
                  {deliveredTodayCount}
                </Typography>
              )}
            </Paper>
          </Box>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Chức năng
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 2 }}>
              {staffLinks.map((link) => (
                <Button
                  key={link.path}
                  variant="outlined"
                  startIcon={link.icon}
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          </Paper>
        </Stack>
      </Container>
    </AdminLayout>
  );
};

export default StaffDashboard;
