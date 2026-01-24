import { Box, Container, Typography, Paper, Stack, Button } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
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
            Shipment Management
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2, mt: 2 }}>
            <Button 
              variant="contained" 
              fullWidth
              size="large"
              onClick={() => navigate("/shipment-order")}
              sx={{ py: 2 }}
            >
              📦 Create Import Order
            </Button>
            <Button 
              variant="contained" 
              fullWidth
              size="large"
              onClick={() => navigate("/receive-shipment")}
              sx={{ py: 2 }}
            >
              ✓ Receive & Verify Shipment
            </Button>
          </Box>
        </Paper>

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
  );
};

export default AdminDashboard;
