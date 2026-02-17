import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { theme } from "./theme/theme";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastProvider";

import { RoleBasedRoute } from "./components/common/RoleBasedRoute";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ImportStock from "./pages/ImportStock";
import "./App.css";
import ReceiveImportStock from "./pages/ReceiveImportStock";
import { CartPage } from "./pages/CartPage";
import { CheckoutShippingPage } from "./pages/checkout/CheckoutShippingPage";
import { CheckoutPackagingPage } from "./pages/checkout/CheckoutPackagingPage";
import { CheckoutPaymentPage } from "./pages/checkout/CheckoutPaymentPage";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout/shipping" element={<CheckoutShippingPage />} />
              <Route path="/checkout/packaging" element={<CheckoutPackagingPage />} />
              <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <RoleBasedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/import-stock"
                element={
                  <RoleBasedRoute allowedRoles={["admin"]}>
                    <ImportStock />
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

              <Route
                path="/staff/receive-import-stock"
                element={
                  <RoleBasedRoute allowedRoles={["staff"]}>
                    <ReceiveImportStock />
                  </RoleBasedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
