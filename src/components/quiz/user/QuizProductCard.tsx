import {
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Chip,
    Typography,
} from "@mui/material";
import {
    LocalOffer as PriceIcon,
    ShoppingCart as CartIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { ChatProduct } from "@/types/chatbot";

function formatPrice(price: number): string {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

interface Props {
    product: ChatProduct;
}

export default function QuizProductCard({ product }: Props) {
    const navigate = useNavigate();
    const lowestPrice = product.variants?.length
        ? Math.min(...product.variants.map((v) => v.basePrice))
        : null;

    const goToProduct = () =>
        navigate(`/products?search=${encodeURIComponent(product.name)}`);

    return (
        <Card
            elevation={0}
            sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
                overflow: "hidden",
                transition: "box-shadow 0.2s, transform 0.2s",
                "&:hover": { boxShadow: 4, transform: "translateY(-2px)" },
                cursor: "pointer",
            }}
            onClick={goToProduct}
        >
            {/* Image */}
            <Box sx={{ width: { xs: "100%", sm: 160 }, flexShrink: 0, bgcolor: "#f5f5f5", minHeight: 160 }}>
                {product.primaryImage ? (
                    <CardMedia
                        component="img"
                        image={product.primaryImage}
                        alt={product.name}
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <Box sx={{ width: "100%", height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="body2" color="text.disabled">Không có ảnh</Typography>
                    </Box>
                )}
            </Box>

            {/* Info */}
            <CardContent sx={{ flex: 1, py: 2, px: 3 }}>
                <Chip
                    label={product.brandName}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 1, fontWeight: 600, fontSize: "0.7rem" }}
                />
                <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    sx={{ mb: 0.5, lineHeight: 1.3 }}
                >
                    {product.name}
                </Typography>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {product.description}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    {lowestPrice !== null && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <PriceIcon sx={{ fontSize: 16, color: "primary.main" }} />
                            <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                                Từ {formatPrice(lowestPrice)}
                            </Typography>
                        </Box>
                    )}
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CartIcon sx={{ fontSize: 14 }} />}
                        onClick={(e) => { e.stopPropagation(); goToProduct(); }}
                        sx={{ borderRadius: 5, fontSize: "0.75rem" }}
                    >
                        Xem sản phẩm
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}
