import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    Box,
    Chip,
} from "@mui/material";
import type { RestockAIVariant } from "@/types/inventory";

interface RestockDetailDialogProps {
    open: boolean;
    onClose: () => void;
    data: RestockAIVariant[] | null;
    title?: string;
}

export const RestockDetailDialog: React.FC<RestockDetailDialogProps> = ({
    open,
    onClose,
    data,
    title = "Chi tiết dự đoán nhập hàng",
}) => {
    const navigate = useNavigate();

    // Helper function to format price
    const formatPrice = (price?: number) => {
        if (price === undefined) return "N/A";
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(price);
    };

    // Group items by supplier
    const groupedData = useMemo(() => {
        if (!data) return {};
        return data.reduce((acc, row) => {
            const supplier = row.supplierName || "Chưa xác định NCC";
            if (!acc[supplier]) {
                acc[supplier] = [];
            }
            acc[supplier].push(row);
            return acc;
        }, {} as Record<string, RestockAIVariant[]>);
    }, [data]);

    // Handle creating import order from restock suggestions
    const handleCreateImportOrder = (supplierId?: number, itemsToImport?: RestockAIVariant[]) => {
        const sourceData = itemsToImport || data;
        if (!sourceData || sourceData.length === 0) {
            return;
        }

        // Create import data structure
        const importData = sourceData.map((variant) => ({
            variantId: variant.id,
            quantity: variant.suggestedRestockQuantity,
            price: variant.negotiatedPrice || variant.basePrice,
        }));

        // Encode to base64 for URL
        const encodedData = btoa(JSON.stringify(importData));

        let url = `/admin/import-stock?importData=${encodedData}&tab=1`;
        if (supplierId) {
            url += `&supplierId=${supplierId}`;
        }

        // Navigate to import stock page with tab 1 (Create Import Stock)
        navigate(url);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle>
                <Typography variant="h6" fontWeight="bold">
                    {title}
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ backgroundColor: "grey.50" }}>
                {!data || data.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Typography variant="body1" color="text.secondary">
                            Không có dữ liệu chi tiết
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper} elevation={0} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: "grey.100" }}>
                                    <TableCell><strong>Sản phẩm</strong></TableCell>
                                    <TableCell><strong>Volume</strong></TableCell>
                                    <TableCell><strong>Type</strong></TableCell>
                                    <TableCell align="right"><strong>Giá Niêm Yết</strong></TableCell>
                                    <TableCell align="right"><strong>Giá Thương Lượng</strong></TableCell>
                                    <TableCell align="center"><strong>Tồn kho</strong></TableCell>
                                    <TableCell align="center"><strong>Lead Time</strong></TableCell>
                                    <TableCell align="center"><strong>Gợi ý nhập</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(groupedData).map(([supplier, items]) => (
                                    <React.Fragment key={supplier}>
                                        {/* Group Header Row */}
                                        <TableRow sx={{ bgcolor: "primary.light", opacity: 0.9 }}>
                                            <TableCell colSpan={8} sx={{ py: 0.5, px: 2 }}>
                                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                                    <Typography variant="subtitle2" color="white" fontWeight="bold">
                                                        Nhà cung cấp: {supplier} ({items.length} sản phẩm)
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="inherit"
                                                        sx={{
                                                            bgcolor: "white",
                                                            color: "primary.main",
                                                            "&:hover": { bgcolor: "grey.100" },
                                                            py: 0.5,
                                                            fontSize: "0.75rem"
                                                        }}
                                                        onClick={() => handleCreateImportOrder(items[0]?.supplierId, items)}
                                                    >
                                                        Tạo đơn cho NCC này
                                                    </Button>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                        {/* Product Rows */}
                                        {items.map((row) => (
                                            <TableRow key={row.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {row.productName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {row.sku}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{row.volumeMl}ml</TableCell>
                                                <TableCell>
                                                    <Chip label={row.type} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right">{formatPrice(row.basePrice)}</TableCell>
                                                <TableCell align="right">
                                                    {row.negotiatedPrice ? formatPrice(row.negotiatedPrice) : "—"}
                                                </TableCell>
                                                <TableCell align="center">{row.totalQuantity}</TableCell>
                                                <TableCell align="center">
                                                    {row.estimatedLeadTimeDays ? `${row.estimatedLeadTimeDays}d` : "—"}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography
                                                        fontWeight="bold"
                                                        color={row.suggestedRestockQuantity > 0 ? "error.main" : "text.secondary"}
                                                    >
                                                        {row.suggestedRestockQuantity}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined" color="primary">
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
