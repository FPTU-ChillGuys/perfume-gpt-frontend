import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
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
import ProductManagement from "./pages/ProductManagement";
import ProfilePage from "./pages/ProfilePage";
import "./App.css";
import ReceiveImportStock from "./pages/ReceiveImportStock";
import { CartPage } from "./pages/CartPage";
import { CheckoutShippingPage } from "./pages/checkout/CheckoutShippingPage";
import { CheckoutPackagingPage } from "./pages/checkout/CheckoutPackagingPage";
import { CheckoutPaymentPage } from "./pages/checkout/CheckoutPaymentPage";

// Google OAuth Client ID - Replace with your actual Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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
                <Route
                  path="/checkout/shipping"
                  element={<CheckoutShippingPage />}
                />
                <Route
                  path="/checkout/packaging"
                  element={<CheckoutPackagingPage />}
                />
                <Route
                  path="/checkout/payment"
                  element={<CheckoutPaymentPage />}
                />

                {/* User Profile Route */}
                <Route
                  path="/profile"
                  element={
                    <RoleBasedRoute allowedRoles={["user", "admin", "staff"]}>
                      <ProfilePage />
                    </RoleBasedRoute>
                  }
                />

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
                  path="/admin/products"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <ProductManagement />
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
                <Route
                  path="/admin/profile"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <ProfilePage />
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
                  path="/staff/products"
                  element={
                    <RoleBasedRoute allowedRoles={["staff"]}>
                      <ProductManagement />
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
                <Route
                  path="/staff/profile"
                  element={
                    <RoleBasedRoute allowedRoles={["staff"]}>
                      <ProfilePage />
                    </RoleBasedRoute>
                  }
                />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
