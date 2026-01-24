import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types/auth";
import { Box, CircularProgress } from "@mui/material";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleBasedRoute = ({
  children,
  allowedRoles,
}: RoleBasedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
