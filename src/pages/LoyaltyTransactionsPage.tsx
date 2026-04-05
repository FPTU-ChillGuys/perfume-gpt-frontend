import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
} from "@mui/material";
import { EmojiEvents, AccountBalanceWallet, Info } from "@mui/icons-material";
import { MainLayout } from "../layouts/MainLayout";
import { loyaltyService } from "../services/loyaltyService";
import { LoyaltyHistorySection } from "../components/profile/LoyaltyHistorySection";

export const LoyaltyTransactionsPage = () => {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loyaltyService
      .getMyBalance()
      .then((data) => {
        setBalance(data.pointBalance ?? 0);
      })
      .catch((err: any) => {
        setError(err?.message || "Không thể tải dữ liệu điểm thưởng");
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Điểm thưởng của tôi
        </Typography>

        {/* Balance Card */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "white",
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 56, height: 56 }}>
              <AccountBalanceWallet fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Số điểm hiện tại
              </Typography>
              {isLoading ? (
                <CircularProgress size={28} sx={{ color: "white", mt: 0.5 }} />
              ) : (
                <Typography variant="h4" fontWeight="bold">
                  {balance.toLocaleString("vi-VN")} điểm
                </Typography>
              )}
            </Box>
            <Box sx={{ ml: "auto", textAlign: "right" }}>
              <EmojiEvents sx={{ fontSize: 48, opacity: 0.3 }} />
            </Box>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Divider sx={{ mb: 3 }} />

        <Paper sx={{ p: 3, display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Info color="info" sx={{ mt: 0.3 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Cách tích điểm
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bạn sẽ được tích điểm sau mỗi lần mua hàng thành công. Điểm có thể được dùng để triết khấu các đơn hàng tiếp theo.
            </Typography>
          </Box>
        </Paper>

        <Divider sx={{ my: 3 }} />

        <LoyaltyHistorySection />
      </Container>
    </MainLayout>
  );
};

