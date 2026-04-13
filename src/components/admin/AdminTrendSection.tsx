import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  AutoGraph as AutoGraphIcon,
} from "@mui/icons-material";
import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useAdminTrend } from "@/hooks/useAdminTrend";

export const AdminTrendSection = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  const {
    trendingProducts,
    isInitialLoad,
    isRefreshing,
    isPolling,
    error,
    handleForceRefresh,
  } = useAdminTrend(isEnabled);

  const handleEnableFetch = () => {
    setIsEnabled(true);
  };

  return (
    <Paper
      sx={{ p: 4, mt: 4, mb: 4, borderRadius: 2, bgcolor: "background.paper" }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <AutoGraphIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">
            Xu hướng - AI Accepted
          </Typography>
        </Box>
        {!isEnabled ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleEnableFetch}
          >
            Tải dữ liệu AI
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="primary"
            startIcon={
              isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />
            }
            onClick={handleForceRefresh}
            disabled={isRefreshing || isPolling}
          >
            {isRefreshing
              ? "Đang yêu cầu AI chạy lại..."
              : "Làm Mới (Reset Trend)"}
          </Button>
        )}
      </Box>

      {!isEnabled && (
        <Box
          p={4}
          textAlign="center"
          border="1px dashed"
          borderColor="divider"
          borderRadius={2}
        >
          <Typography color="text.secondary">
            Dữ liệu AI chỉ được tải khi bấm nút để tránh gọi backend AI liên
            tục.
          </Typography>
        </Box>
      )}

      {isEnabled && (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {(isInitialLoad || isPolling) && !isRefreshing && (
            <Box
              display="flex"
              alignItems="center"
              gap={2}
              mb={3}
              p={2}
              bgcolor="info.50"
              borderRadius={1}
            >
              <CircularProgress size={24} color="info" />
              <Typography variant="body2" color="info.main">
                Hệ thống AI đang phân tích dữ liệu bán hàng mới nhất để tìm ra
                xu hướng. Quá trình này có thể tốn vài chục giây...
              </Typography>
            </Box>
          )}

          {!isInitialLoad &&
            trendingProducts.length === 0 &&
            !isPolling &&
            !isRefreshing &&
            !error && (
              <Box
                p={6}
                textAlign="center"
                border="1px dashed"
                borderColor="divider"
                borderRadius={2}
              >
                <Typography color="text.secondary">
                  Chưa có sản phẩm nào đạt đủ tiêu chí Xu hướng trong tuần này.
                </Typography>
              </Box>
            )}

          {trendingProducts.length > 0 && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(4, 1fr)",
                  xl: "repeat(5, 1fr)",
                },
                gap: 3,
              }}
            >
              {trendingProducts.map((product) => (
                <Box key={product.id}>
                  <ProductCard {...product} />
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};
