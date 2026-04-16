import { useCallback, useState, type ReactNode } from "react";
import { Snackbar, Alert } from "@mui/material";
import { ToastContext } from "./ToastContext";

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", severity: "info" });

  const showToast = useCallback(
    (
      message: string,
      severity: "success" | "error" | "warning" | "info" = "info"
    ) => {
      setToast({ open: true, message, severity });
    },
    [],
  );

  const handleClose = () => {
    setToast({ ...toast, open: false });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};
