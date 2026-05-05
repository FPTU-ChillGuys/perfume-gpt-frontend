import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LockReset as LockResetIcon, MarkEmailRead as MarkEmailReadIcon } from "@mui/icons-material";
import { authService } from "@/services/authService";

interface ChangePasswordSectionProps {
  email?: string | null;
}

export const ChangePasswordSection = ({ email }: ChangePasswordSectionProps) => {
  const [emailInput, setEmailInput] = useState((email || "").trim());
  const normalizedEmail = useMemo(() => emailInput.trim(), [emailInput]);
  const [emailError, setEmailError] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateEmail = (value: string) => {
    if (!value.trim()) return "Email không được để trống";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return "Email không đúng định dạng";
    return "";
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSendReset = async () => {
    const validationError = validateEmail(normalizedEmail);
    setEmailError(validationError);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSuccess("");
    setIsSending(true);
    try {
      // Keep same processing as ForgotPasswordPage.
      const clientUri = `${window.location.origin}/reset-password`;
      const message = await authService.forgotPassword(normalizedEmail, clientUri);
      setSuccess(
        message ||
          "Link đổi mật khẩu đã được gửi vào mail của bạn. Vui lòng kiểm tra hộp thư (và thư mục Spam).",
      );
      setCooldownSeconds(30);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể gửi yêu cầu đổi mật khẩu.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: { xs: 2, sm: 3 },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
        <LockResetIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Đổi mật khẩu
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Nhập email để xác nhận chính chủ tài khoản. Hệ thống sẽ gửi link đổi mật
        khẩu vào mail của bạn.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <MarkEmailReadIcon fontSize="small" />
            <span>{success}</span>
          </Stack>
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label="Email tài khoản"
          value={emailInput}
          onChange={(e) => {
            setEmailInput(e.target.value);
            if (emailError) setEmailError("");
          }}
          onBlur={() => setEmailError(validateEmail(normalizedEmail))}
          size="small"
          fullWidth
          error={Boolean(emailError)}
          helperText={emailError || "Nhập đúng email của tài khoản cần đổi mật khẩu"}
        />
        <Button
          variant="contained"
          onClick={handleSendReset}
          disabled={isSending || cooldownSeconds > 0}
          sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
        >
          {isSending
            ? "Đang gửi..."
            : cooldownSeconds > 0
              ? `Thực hiện lại sau ${cooldownSeconds}s`
              : "Gửi link đổi mật khẩu"}
        </Button>
      </Stack>
    </Paper>
  );
};

