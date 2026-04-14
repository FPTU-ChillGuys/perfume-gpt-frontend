import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { OrderDetailResponse } from "@/types/order";

interface OrderItemsSummaryProps {
  items?: OrderDetailResponse[];
  shippingFee?: number;
  totalAmount?: number;
}

const fmt = (value?: number | null) => {
  if (!value) return "0 đ";
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
};

export const OrderItemsSummary = ({
  items = [],
  shippingFee = 0,
  totalAmount = 0,
}: OrderItemsSummaryProps) => {
  const subtotal = items.reduce(
    (sum, item) => sum + (item.itemTotal ?? item.total ?? 0),
    0,
  );

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography fontWeight={700} variant="subtitle2">
          Sản phẩm trong đơn
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell sx={{ width: 80 }}>Ảnh</TableCell>
              <TableCell>Sản phẩm</TableCell>
              <TableCell align="center" sx={{ width: 70 }}>
                Số lượng
              </TableCell>
              <TableCell align="right" sx={{ width: 100 }}>
                Giá
              </TableCell>
              <TableCell align="right" sx={{ width: 100 }}>
                Thành tiền
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    {item.imageUrl ? (
                      <Box
                        component="img"
                        src={item.imageUrl}
                        alt={item.variantName}
                        sx={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          bgcolor: "grey.100",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {item.variantName}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">x{item.quantity}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                      {fmt(item.unitPrice)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="#ee4d2d"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {fmt(item.itemTotal ?? item.total)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Không có sản phẩm.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
        <Stack spacing={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Tạm tính:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ whiteSpace: "nowrap", ml: 1 }}
            >
              {fmt(subtotal)}
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Phí vận chuyển:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color="success.main"
              sx={{ whiteSpace: "nowrap", ml: 1 }}
            >
              {fmt(shippingFee)}
            </Typography>
          </Box>

          <Box
            display="flex"
            justifyContent="space-between"
            sx={{
              pt: 1,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Tổng thanh toán:
            </Typography>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{
                color: "#ee4d2d",
                fontSize: "1.1rem",
                whiteSpace: "nowrap",
              }}
            >
              {fmt(totalAmount)}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};
