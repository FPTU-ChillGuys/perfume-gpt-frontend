import { Box, Container, Typography, Paper, Stack } from "@mui/material";
import { useAuth } from "../hooks/useAuth";

const StaffDashboard = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Staff Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome back, {user?.name}!
      </Typography>

      <Stack spacing={3}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 3,
          }}
        >
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pending Orders
            </Typography>
            <Typography variant="h3" color="primary">
              45
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Completed Today
            </Typography>
            <Typography variant="h3" color="primary">
              23
            </Typography>
          </Paper>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Staff Functions
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 2 }}>
            <Typography variant="body2">• Process Orders</Typography>
            <Typography variant="body2">• Manage Inventory</Typography>
            <Typography variant="body2">• Customer Support</Typography>
            <Typography variant="body2">• View Reports</Typography>
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
};

export default StaffDashboard;
