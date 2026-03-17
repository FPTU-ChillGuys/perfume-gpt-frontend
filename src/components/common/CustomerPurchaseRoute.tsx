import { Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";

interface CustomerPurchaseRouteProps {
  children: React.ReactNode;
}

export const CustomerPurchaseRoute = ({
  children,
}: CustomerPurchaseRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (user?.role === "admin" || user?.role === "staff") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
