import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const ChatbotWidget = lazy(() => import("./ChatbotWidget"));

export function ChatbotWidgetWrapper() {
  const location = useLocation();

  // Hiển thị chatbot chỉ trên Home và Product pages
  const showChatbot =
    location.pathname === "/" || // Home page
    location.pathname.startsWith("/products") || // Product list & detail pages
    location.pathname.startsWith("/survey") || // Survey page
    location.pathname.startsWith("/staff") || // Staff pages
    location.pathname.startsWith("/admin") || // Admin pages
    location.pathname.startsWith("/checkout/counter/staff"); // Counter checkout staff page

  if (!showChatbot) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ChatbotWidget />
    </Suspense>
  );
}