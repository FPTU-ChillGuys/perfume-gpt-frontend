import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Button,
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Welcome back, {user?.name}!
        </Typography>

        <Stack spacing={3}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 3,
            }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h3" color="primary">
                1,234
              </Typography>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Total Products
              </Typography>
              <Typography variant="h3" color="primary">
                567
              </Typography>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Total Orders
              </Typography>
              <Typography variant="h3" color="primary">
                890
              </Typography>
            </Paper>
          </Box>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Other Functions
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 2 }}>
              <Typography variant="body2">• User Management</Typography>
              <Typography variant="body2">• Product Management</Typography>
              <Typography variant="body2">• Order Management</Typography>
              <Typography variant="body2">• System Settings</Typography>
            </Box>
          </Paper>
        </Stack>
      </Container>
    </AdminLayout>
  );
};

export default AdminDashboard;
