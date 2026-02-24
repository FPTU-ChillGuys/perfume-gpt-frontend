import { useState, useEffect } from "react";
import {
  Popover,
  Box,
  Typography,
  Button,
  CircularProgress,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { cartService } from "@/services/cartService";
import type { CartItem } from "@/types/cart";

interface CartDropdownProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ";

export const CartDropdown = ({
  anchorEl,
  open,
  onClose,
}: CartDropdownProps) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (open) {
      loadCartItems();
    }
  }, [open]);

  const loadCartItems = async () => {
    setIsLoading(true);
    try {
      const fetchedItems = await cartService.getItems();
      setItems(fetchedItems);
      // Tính tổng từ items
      const totalAmount = fetchedItems.reduce(
        (sum, item) => sum + (Number(item.subTotal) || 0),
        0,
      );
      setTotal(totalAmount);
    } catch (error) {
      console.error("Failed to load cart items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCart = () => {
    onClose();
    navigate("/cart");
  };

  const getTotalQuantity = () => {
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      PaperProps={{
        sx: {
          mt: 1,
          width: 480,
          maxHeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          borderRadius: 2,
        },
      }}
      slotProps={{
        paper: {
          onMouseEnter: (e) => e.stopPropagation(),
          onMouseLeave: onClose,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Giỏ hàng
        </Typography>

        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        ) : items.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Giỏ hàng trống
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                maxHeight: 400,
                overflowY: "auto",
                mb: 2,
                "&::-webkit-scrollbar": {
                  width: 6,
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(0,0,0,0.2)",
                  borderRadius: 3,
                },
              }}
            >
              {items.map((item) => (
                <Box
                  key={item.cartItemId}
                  sx={{
                    display: "flex",
                    gap: 2,
                    py: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": {
                      borderBottom: "none",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      flexShrink: 0,
                      bgcolor: "grey.100",
                      borderRadius: 1,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.variantName || "Product"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No Image
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        mb: 0.5,
                      }}
                    >
                      {item.variantName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Số lượng: {item.quantity}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="error.main"
                      sx={{ mt: 0.5 }}
                    >
                      {formatCurrency(item.subTotal)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="body1" fontWeight={600}>
                Tổng ({getTotalQuantity()} sản phẩm)
              </Typography>
              <Typography variant="h6" fontWeight={700} color="error.main">
                {formatCurrency(total)}
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              color="error"
              size="large"
              onClick={handleViewCart}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                py: 1.5,
              }}
            >
              Xem giỏ hàng & thanh toán
            </Button>
          </>
        )}
      </Box>
    </Popover>
  );
};
