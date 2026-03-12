import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Paper,
    Alert,
} from "@mui/material";
import { Refresh as RefreshIcon, AutoGraph as AutoGraphIcon } from "@mui/icons-material";
import { ProductCard } from "@/components/product/ProductCard";
import { useAdminTrend } from "@/hooks/useAdminTrend";

export const AdminTrendSection = () => {
    const {
        trendingProducts,
        isInitialLoad,
        isRefreshing,
        isPolling,
        error,
        handleForceRefresh
    } = useAdminTrend();

    return (
        <Paper sx={{ p: 4, mt: 4, mb: 4, borderRadius: 2, bgcolor: "background.paper" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <AutoGraphIcon color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight="bold">
                        Xu hướng hiện tại (Trending Weekly)
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                    onClick={handleForceRefresh}
                    disabled={isRefreshing || isPolling}
                >
                    {isRefreshing ? "Đang yêu cầu AI chạy lại..." : "Làm Mới (Reset Trend)"}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* States Indicator */}
            {(isInitialLoad || isPolling) && !isRefreshing && (
                <Box display="flex" alignItems="center" gap={2} mb={3} p={2} bgcolor="info.50" borderRadius={1}>
                    <CircularProgress size={24} color="info" />
                    <Typography variant="body2" color="info.main">
                        Hệ thống AI đang phân tích dữ liệu bán hàng mới nhất để tìm ra xu hướng. Quá trình này có thể tốn vài chục giây...
                    </Typography>
                </Box>
            )}

            {/* Grid container for cards using standard Admin grid spacing */}
            {!isInitialLoad && trendingProducts.length === 0 && !isPolling && !isRefreshing && !error && (
                <Box p={6} textAlign="center" border="1px dashed" borderColor="divider" borderRadius={2}>
                    <Typography color="text.secondary">Chưa có sản phẩm nào đạt đủ tiêu chí Xu hướng trong tuần này.</Typography>
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
                            xl: "repeat(5, 1fr)"
                        },
                        gap: 3
                    }}
                >
                    {trendingProducts.map((product) => (
                        <Box key={product.id}>
                            {/* Wrapping with a fixed style to emulate standard Home layout proportions if needed */}
                            <ProductCard {...product} />
                        </Box>
                    ))}
                </Box>
            )}
        </Paper>
    );
};
