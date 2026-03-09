import { lazy, Suspense } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { theme } from "./theme/theme";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastProvider";
import { CartProvider } from "./contexts/CartContext";
import { ProductQuickViewProvider } from "./contexts/ProductQuickViewContext";

import { RoleBasedRoute } from "./components/common/RoleBasedRoute";
import { ChatbotWidgetWrapper } from "./components/chatbot/ChatbotWidgetWrapper";
import "./App.css";

// Lazy-loaded pages — each becomes a separate chunk
const HomePage = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const ProductListPage = lazy(() => import("./pages/ProductListPage").then(m => ({ default: m.ProductListPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const ImportStock = lazy(() => import("./pages/ImportStock"));
const ProductManagement = lazy(() => import("./pages/ProductManagement"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ReceiveImportStock = lazy(() => import("./pages/ReceiveImportStock"));
const CartPage = lazy(() => import("./pages/CartPage").then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then(m => ({ default: m.CheckoutPage })));
const CheckoutShippingPage = lazy(() => import("./pages/checkout/CheckoutShippingPage").then(m => ({ default: m.CheckoutShippingPage })));
const CheckoutPaymentPage = lazy(() => import("./pages/checkout/CheckoutPaymentPage").then(m => ({ default: m.CheckoutPaymentPage })));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage").then(m => ({ default: m.PaymentSuccessPage })));
const PaymentFailurePage = lazy(() => import("./pages/PaymentFailurePage").then(m => ({ default: m.PaymentFailurePage })));
const MyOrdersPage = lazy(() => import("./pages/MyOrdersPage").then(m => ({ default: m.MyOrdersPage })));
const OrderManagementPage = lazy(() => import("./pages/OrderManagementPage").then(m => ({ default: m.OrderManagementPage })));
const ContentManagementPage = lazy(() => import("./pages/ContentManagementPage").then(m => ({ default: m.ContentManagementPage })));
const AIInstructionPage = lazy(() => import("./pages/AIInstructionPage"));
const QuizManagementPage = lazy(() => import("./pages/QuizManagementPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const UserLogsManagementPage = lazy(() => import("./pages/UserLogsManagementPage").then(m => ({ default: m.UserLogsManagementPage })));
const AdminConversationsPage = lazy(() => import("./pages/AdminConversationsPage").then(m => ({ default: m.AdminConversationsPage })));
const InventoryReportLogsPage = lazy(() => import("./pages/InventoryReportLogsPage").then(m => ({ default: m.InventoryReportLogsPage })));
const AIAcceptancePage = lazy(() => import("./pages/AIAcceptancePage").then(m => ({ default: m.AIAcceptancePage })));

const PageLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
    <CircularProgress />
  </Box>
);

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
              <CartProvider>
                <ProductQuickViewProvider>
                  <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/products" element={<ProductListPage />} />
                    <Route path="/quiz" element={<QuizPage />} />
                    <Route path="/products/:productId" element={<ProductDetailPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route
                      path="/checkout/shipping"
                      element={<CheckoutShippingPage />}
                    />
                    <Route

                      path="/checkout/payment"
                      element={<CheckoutPaymentPage />}
                    />
                    <Route
                      path="/payment/success"
                      element={<PaymentSuccessPage />}
                    />
                    <Route
                      path="/payment/failure"
                      element={<PaymentFailurePage />}
                    />

                    {/* User Profile Routes */}
                    <Route
                      path="/profile"
                      element={
                        <RoleBasedRoute allowedRoles={["user", "admin", "staff"]}>
                          <ProfilePage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/profile/address"
                      element={
                        <RoleBasedRoute allowedRoles={["user", "admin", "staff"]}>
                          <ProfilePage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/profile/change-password"
                      element={
                        <RoleBasedRoute allowedRoles={["user", "admin", "staff"]}>
                          <ProfilePage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/profile/vouchers"
                      element={
                        <RoleBasedRoute allowedRoles={["user", "admin", "staff"]}>
                          <ProfilePage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/profile/notifications"
                      element={
                        <RoleBasedRoute allowedRoles={["user", "admin", "staff"]}>
                          <ProfilePage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/my-orders"
                      element={
                        <RoleBasedRoute allowedRoles={["user", "admin", "staff"]}>
                          <MyOrdersPage />
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
                      path="/admin/orders"
                      element={
                        <RoleBasedRoute allowedRoles={["admin"]}>
                          <OrderManagementPage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/admin/content"
                      element={
                        <RoleBasedRoute allowedRoles={["admin"]}>
                          <ContentManagementPage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/admin/instructions"
                      element={
                        <RoleBasedRoute allowedRoles={["admin"]}>
                          <AIInstructionPage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/admin/quiz"
                      element={
                        <RoleBasedRoute allowedRoles={["admin"]}>
                          <QuizManagementPage />
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
                    <Route
                      path="/admin/logs"
                      element={
                        <RoleBasedRoute allowedRoles={["admin"]}>
                          <UserLogsManagementPage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/admin/conversations"
                      element={
                        <RoleBasedRoute allowedRoles={["admin"]}>
                          <AdminConversationsPage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/admin/inventory-report-logs"
                      element={
                        <RoleBasedRoute allowedRoles={["admin"]}>
                          <InventoryReportLogsPage />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/admin/ai-acceptance"
                      element={
                        <RoleBasedRoute allowedRoles={["admin"]}>
                          <AIAcceptancePage />
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
                      path="/staff/orders"
                      element={
                        <RoleBasedRoute allowedRoles={["staff"]}>
                          <OrderManagementPage />
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
                  </Suspense>
                  <ChatbotWidgetWrapper />
                </ProductQuickViewProvider>
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
