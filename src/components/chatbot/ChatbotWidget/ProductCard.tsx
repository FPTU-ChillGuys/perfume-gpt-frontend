import { useState } from "react";
import { Box, Paper, Typography, Chip, CircularProgress } from "@mui/material";
import {
  ShoppingCart as CartIcon,
  Storefront as StoreIcon,
} from "@mui/icons-material";
import type { ChatProduct, ChatVariant } from "@/types/chatbot";
import { formatPrice } from "./helpers";

interface ProductCardProps {
  product: ChatProduct;
  onAddToCart: (variantId: string, productName: string) => void;
  onNavigate: (productId: string) => void;
}

export function ProductCard({
  product,
  onAddToCart,
  onNavigate,
}: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<ChatVariant | null>(
    (product.variants && product.variants.length > 0
      ? product.variants[0]
      : null) ?? null,
  );
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedVariant) return;
    setAdding(true);
    try {
      await onAddToCart(selectedVariant.id, product.name);
    } finally {
      setAdding(false);
    }
  };

  const handleCardClick = async () => {
    onNavigate(product.id);
  };

  return (
    <Paper
      elevation={2}
      onClick={handleCardClick}
      sx={{
        minWidth: 200,
        maxWidth: 220,
        borderRadius: 2,
        overflow: "hidden",
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
        "&:hover": {
          boxShadow: 6,
          transform: "translateY(-2px)",
        },
      }}
    >
      {/* Image */}
      <Box
        sx={{
          height: 110,
          background: product.primaryImage
            ? `url(${product.primaryImage}) center/cover no-repeat`
            : "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!product.primaryImage && (
          <StoreIcon sx={{ fontSize: 36, color: "rgba(255,255,255,0.7)" }} />
        )}
      </Box>

      {/* Content */}
      <Box
        sx={{
          p: 1.2,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {product.brandName}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.name}
        </Typography>
        <Chip
          label={product.categoryName}
          size="small"
          sx={{
            alignSelf: "flex-start",
            height: 18,
            fontSize: "0.65rem",
            bgcolor: "#fef2f2",
            color: "#dc2626",
          }}
        />

        {/* Variant selector */}
        {product.variants && product.variants.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.4 }}
            >
              Chọn loại:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
              {product.variants.map((v) => (
                <Chip
                  key={v.id}
                  label={`${v.volumeMl}ml`}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVariant(v);
                  }}
                  variant={selectedVariant?.id === v.id ? "filled" : "outlined"}
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    cursor: "pointer",
                    bgcolor:
                      selectedVariant?.id === v.id ? "#dc2626" : undefined,
                    color: selectedVariant?.id === v.id ? "#fff" : undefined,
                    borderColor: "#dc2626",
                    "&:hover": { bgcolor: "#ef4444", color: "#fff" },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Price */}
        {selectedVariant && (
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: "#dc2626", mt: 0.3 }}
          >
            {formatPrice(selectedVariant.basePrice)}
          </Typography>
        )}
      </Box>

      {/* Add to cart button */}
      <Box sx={{ px: 1.2, pb: 1.2 }}>
        <Box
          component="button"
          onClick={handleAdd}
          disabled={adding || !selectedVariant}
          sx={{
            width: "100%",
            py: 0.7,
            border: "none",
            borderRadius: 1.5,
            background:
              adding || !selectedVariant
                ? "#ccc"
                : "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.75rem",
            cursor: adding || !selectedVariant ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            transition: "opacity 0.2s",
            "&:hover": { opacity: adding || !selectedVariant ? 1 : 0.9 },
          }}
        >
          {adding ? (
            <CircularProgress size={12} sx={{ color: "#fff" }} />
          ) : (
            <CartIcon sx={{ fontSize: 14 }} />
          )}
          Thêm vào giỏ
        </Box>
      </Box>
    </Paper>
  );
}
