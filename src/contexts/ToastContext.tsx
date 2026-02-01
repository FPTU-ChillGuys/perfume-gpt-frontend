import { createContext } from "react";

interface ToastContextType {
  showToast: (
    message: string,
    severity?: "success" | "error" | "warning" | "info"
  ) => void;
}

export const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});
