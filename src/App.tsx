import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { theme } from "./theme/theme";
import { AuthProvider } from "./contexts/AuthContext";

import { RoleBasedRoute } from "./components/common/RoleBasedRoute";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import "./App.css";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <RoleBasedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </RoleBasedRoute>
              }
            />

            {/* Staff Routes */}
            <Route
              path="/staff/dashboard"
              element={
                <RoleBasedRoute allowedRoles={["staff"]}>
                  <StaffDashboard />
                </RoleBasedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
