import { useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Chip,
    CircularProgress,
    Typography,
} from "@mui/material";
import {
    ShoppingCart as CartIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { ChatProduct, ChatVariant } from "@/types/chatbot";
import { cartService } from "@/services/cartService";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import { useToast } from "@/hooks/useToast";

function formatPrice(price: number): string {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

interface Props {
    product: ChatProduct;
    userId: string;
}

export default function QuizProductCard({ product, userId }: Props) {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [selectedVariant, setSelectedVariant] = useState<ChatVariant | null>(
        (product.variants && product.variants.length > 0 ? product.variants[0] : null) ?? null
    );
    const [adding, setAdding] = useState(false);

    const goToProduct = () => {
        navigate(`/products/${product.id}`);
    };

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedVariant) return;

        setAdding(true);
        try {
            // Add item to cart
            await cartService.addItem(selectedVariant.id, 1);
            showToast(`Đã thêm "${product.name}" vào giỏ hàng`, "success");

            // Create AI acceptance record with the actual cartItemId
            try {
                // Fetch cart items to get the actual cartItemId
                const items = await cartService.getItems();
                // Find the item we just added by variantId
                const addedItem = items.find((item) => item.variantId === selectedVariant.id);
                if (addedItem?.cartItemId) {
                    await aiAcceptanceService.createCheckoutAcceptance(userId, addedItem.cartItemId);
                }
            } catch (err) {
                console.error("Failed to create AI acceptance:", err);
                // Don't fail the add-to-cart if acceptance creation fails
            }
        } catch (err) {
            console.error("AddToCart error:", err);
            showToast("Thêm vào giỏ hàng thất bại. Vui lòng thử lại.", "error");
        } finally {
            setAdding(false);
        }
    };

    return (
        <Card
            elevation={0}
            onClick={goToProduct}
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
                bgcolor: "background.paper",
            }}
        >
            {/* Image Section */}
            <Box
                sx={{
                    width: { xs: "100%", sm: 220 },
                    flexShrink: 0,
                    bgcolor: product.primaryImage ? "transparent" : "grey.100",
                    position: "relative",
                    minHeight: { xs: 200, sm: "auto" },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {product.primaryImage ? (
                    <CardMedia
                        component="img"
                        image={product.primaryImage}
                        alt={product.name}
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            p: 2,
                        }}
                    />
                ) : (
                    <Typography variant="body2" color="text.disabled">
                        Không có ảnh
                    </Typography>
                )}
            </Box>

            {/* Content Section */}
            <CardContent
                sx={{
                    flex: 1,
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    "&:last-child": { pb: 3 },
                    borderLeft: { sm: "1px solid" },
                    borderColor: { sm: "divider" },
                }}
            >
                {/* Brand & Category */}
                <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <Chip
                        label={product.brandName}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                    />
                    <Typography variant="caption" color="text.secondary" fontWeight="medium">
                        {product.categoryName}
                    </Typography>
                </Box>

                {/* Title */}
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, lineHeight: 1.3 }}>
                    {product.name}
                </Typography>

                {/* Description */}
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 2,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {product.description}
                </Typography>

                <Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                    {/* Variants Selection */}
                    {product.variants && product.variants.length > 0 && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                            {product.variants.map((v) => {
                                const isSelected = selectedVariant?.id === v.id;
                                return (
                                    <Chip
                                        key={v.id}
                                        label={`${v.volumeMl}ml`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedVariant(v);
                                        }}
                                        variant={isSelected ? "filled" : "outlined"}
                                        color={isSelected ? "error" : "default"}
                                        sx={{
                                            fontWeight: isSelected ? 600 : 400,
                                            transition: "all 0.2s",
                                            "&:hover": {
                                                borderColor: "error.main",
                                                color: isSelected ? "white" : "error.main",
                                            },
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    )}

                    {/* Price and Add to Cart Row */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, pt: 1 }}>
                        <Typography variant="h6" color="error.main" fontWeight="bold">
                            {selectedVariant ? formatPrice(selectedVariant.basePrice) : "Hết hàng"}
                        </Typography>

                        <Button
                            variant="contained"
                            color="error"
                            disabled={adding || !selectedVariant}
                            onClick={handleAddToCart}
                            startIcon={adding ? <CircularProgress size={20} color="inherit" /> : <CartIcon />}
                            sx={{
                                borderRadius: 8,
                                px: 4,
                                textTransform: "none",
                                fontWeight: "bold",
                                minWidth: 160,
                            }}
                        >
                            {adding ? "Đang xử lý..." : "Thêm vào giỏ"}
                        </Button>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}
