import { lazy, Suspense } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastProvider";
import { CartProvider } from "./contexts/CartContext";
import { ProductQuickViewProvider } from "./contexts/ProductQuickViewContext";

import { RoleBasedRoute } from "./components/common/RoleBasedRoute";
import { CustomerPurchaseRoute } from "./components/common/CustomerPurchaseRoute";
import { ChatbotWidgetWrapper } from "./components/chatbot/ChatbotWidgetWrapper";
import "./App.css";

// Lazy-loaded pages — each becomes a separate chunk
const HomePage = lazy(() =>
  import("./pages/HomePage").then((m) => ({ default: m.HomePage })),
);
const ProductListPage = lazy(() =>
  import("./pages/ProductListPage").then((m) => ({
    default: m.ProductListPage,
  })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const ImportStock = lazy(() => import("./pages/ImportStock"));
const ProductManagement = lazy(() => import("./pages/ProductManagement"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ReceiveImportStock = lazy(() => import("./pages/ReceiveImportStock"));
const CartPage = lazy(() =>
  import("./pages/CartPage").then((m) => ({ default: m.CartPage })),
);
const CheckoutPage = lazy(() =>
  import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })),
);
const CounterCheckoutStaffPage = lazy(() =>
  import("./pages/checkout/CounterCheckoutStaffPage").then((m) => ({
    default: m.CounterCheckoutStaffPage,
  })),
);
const CounterCheckoutDisplayPage = lazy(() =>
  import("./pages/checkout/CounterCheckoutDisplayPage").then((m) => ({
    default: m.CounterCheckoutDisplayPage,
  })),
);
const PaymentSuccessPage = lazy(() =>
  import("./pages/PaymentSuccessPage").then((m) => ({
    default: m.PaymentSuccessPage,
  })),
);
const PaymentFailurePage = lazy(() =>
  import("./pages/PaymentFailurePage").then((m) => ({
    default: m.PaymentFailurePage,
  })),
);
const MyOrdersPage = lazy(() =>
  import("./pages/MyOrdersPage").then((m) => ({ default: m.MyOrdersPage })),
);
const MyOrderDetailPage = lazy(() =>
  import("./pages/MyOrderDetailPage").then((m) => ({
    default: m.MyOrderDetailPage,
  })),
);
const OrderManagementPage = lazy(() =>
  import("./pages/OrderManagementPage").then((m) => ({
    default: m.OrderManagementPage,
  })),
);
const OrderManagementDetailPage = lazy(() =>
  import("./pages/OrderManagementDetailPage").then((m) => ({
    default: m.OrderManagementDetailPage,
  })),
);
const ContentManagementPage = lazy(() =>
  import("./pages/ContentManagementPage").then((m) => ({
    default: m.ContentManagementPage,
  })),
);
const AIInstructionPage = lazy(() => import("./pages/AIInstructionPage"));
const QuizManagementPage = lazy(() => import("./pages/QuizManagementPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const UserLogsManagementPage = lazy(() =>
  import("./pages/UserLogsManagementPage").then((m) => ({
    default: m.UserLogsManagementPage,
  })),
);
const AdminConversationsPage = lazy(() =>
  import("./pages/AdminConversationsPage").then((m) => ({
    default: m.AdminConversationsPage,
  })),
);
const InventoryReportLogsPage = lazy(() =>
  import("./pages/InventoryReportLogsPage").then((m) => ({
    default: m.InventoryReportLogsPage,
  })),
);
const InventoryManagementPage = lazy(() =>
  import("./pages/InventoryManagementPage").then((m) => ({
    default: m.InventoryManagementPage,
  })),
);
const AIAcceptancePage = lazy(() =>
  import("./pages/AIAcceptancePage").then((m) => ({
    default: m.AIAcceptancePage,
  })),
);
const CampaignManagementPage = lazy(() =>
  import("./pages/CampaignManagementPage").then((m) => ({
    default: m.CampaignManagementPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage })),
);
const AdminVouchersPage = lazy(() =>
  import("./pages/AdminVouchersPage").then((m) => ({ default: m.AdminVouchersPage })),
);
const OrderCancelRequestsPage = lazy(() =>
  import("./pages/OrderCancelRequestsPage").then((m) => ({ default: m.OrderCancelRequestsPage })),
);
const SuppliersPage = lazy(() =>
  import("./pages/SuppliersPage").then((m) => ({ default: m.SuppliersPage })),
);
const LoyaltyTransactionsPage = lazy(() =>
  import("./pages/LoyaltyTransactionsPage").then((m) => ({ default: m.LoyaltyTransactionsPage })),
);

const PageLoader = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="60vh"
  >
    <CircularProgress />
  </Box>
);

// Google OAuth Client ID - Replace with your actual Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppThemeProvider>
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
                      <Route
                        path="/forgot-password"
                        element={<ForgotPasswordPage />}
                      />
                      <Route
                        path="/reset-password"
                        element={<ResetPasswordPage />}
                      />
                      <Route
                        path="/verify-email"
                        element={<VerifyEmailPage />}
                      />
                      <Route
                        path="/checkout/counter/staff"
                        element={
                          <RoleBasedRoute allowedRoles={["admin", "staff"]}>
                            <CounterCheckoutStaffPage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/checkout/counter/display"
                        element={<CounterCheckoutDisplayPage />}
                      />
                      <Route path="/products" element={<ProductListPage />} />
                      <Route path="/quiz" element={<QuizPage />} />
                      <Route
                        path="/products/:productId"
                        element={<ProductDetailPage />}
                      />
                      <Route
                        path="/unauthorized"
                        element={<UnauthorizedPage />}
                      />
                      <Route
                        path="/cart"
                        element={
                          <CustomerPurchaseRoute>
                            <CartPage />
                          </CustomerPurchaseRoute>
                        }
                      />
                      <Route
                        path="/checkout"
                        element={
                          <CustomerPurchaseRoute>
                            <CheckoutPage />
                          </CustomerPurchaseRoute>
                        }
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
                          <RoleBasedRoute allowedRoles={["user"]}>
                            <ProfilePage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/profile/address"
                        element={
                          <RoleBasedRoute allowedRoles={["user"]}>
                            <ProfilePage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/profile/change-password"
                        element={
                          <RoleBasedRoute allowedRoles={["user"]}>
                            <ProfilePage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/profile/vouchers"
                        element={
                          <RoleBasedRoute allowedRoles={["user"]}>
                            <ProfilePage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/profile/notifications"
                        element={
                          <RoleBasedRoute allowedRoles={["user"]}>
                            <ProfilePage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/my-orders"
                        element={
                          <RoleBasedRoute allowedRoles={["user"]}>
                            <MyOrdersPage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/my-orders/:orderId"
                        element={
                          <RoleBasedRoute allowedRoles={["user"]}>
                            <MyOrderDetailPage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/loyalty"
                        element={
                          <RoleBasedRoute allowedRoles={["user"]}>
                            <LoyaltyTransactionsPage />
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
                        path="/admin/orders/:orderId"
                        element={
                          <RoleBasedRoute allowedRoles={["admin"]}>
                            <OrderManagementDetailPage />
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
                        element={<UnauthorizedPage />}
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
                        path="/admin/inventory"
                        element={
                          <RoleBasedRoute allowedRoles={["admin"]}>
                            <InventoryManagementPage />
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
                        path="/admin/campaigns"
                        element={
                          <RoleBasedRoute allowedRoles={["admin"]}>
                            <CampaignManagementPage />
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
                      <Route
                        path="/admin/vouchers"
                        element={
                          <RoleBasedRoute allowedRoles={["admin"]}>
                            <AdminVouchersPage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/admin/cancel-requests"
                        element={
                          <RoleBasedRoute allowedRoles={["admin"]}>
                            <OrderCancelRequestsPage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/admin/suppliers"
                        element={
                          <RoleBasedRoute allowedRoles={["admin"]}>
                            <SuppliersPage />
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
                        path="/staff/orders/:orderId"
                        element={
                          <RoleBasedRoute allowedRoles={["staff"]}>
                            <OrderManagementDetailPage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/staff/inventory"
                        element={
                          <RoleBasedRoute allowedRoles={["staff"]}>
                            <InventoryManagementPage />
                          </RoleBasedRoute>
                        }
                      />
                      <Route
                        path="/staff/campaigns"
                        element={
                          <RoleBasedRoute allowedRoles={["staff"]}>
                            <CampaignManagementPage />
                          </RoleBasedRoute>
                        }
                      />

                      <Route
                        path="/staff/profile"
                        element={<UnauthorizedPage />}
                      />

                      {/* Fallback route for unknown URLs */}
                      <Route path="*" element={<UnauthorizedPage />} />
                    </Routes>
                  </Suspense>
                  <ChatbotWidgetWrapper />
                </ProductQuickViewProvider>
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </AppThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
