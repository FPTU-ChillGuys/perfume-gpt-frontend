import React from "react";
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
    Tooltip,
} from "@mui/material";
import { PictureAsPdf as PictureAsPdfIcon } from "@mui/icons-material";
import type { RestockAIVariant } from "@/types/inventory";
import { inventoryService } from "@/services/ai/inventoryService";
import { useToast } from "@/hooks/useToast";

interface RestockDetailDialogProps {
    open: boolean;
    onClose: () => void;
    data: RestockAIVariant[] | null;
    title?: string;
    logId?: string | null;
}

export const RestockDetailDialog: React.FC<RestockDetailDialogProps> = ({
    open,
    onClose,
    data,
    title = "Chi tiết dự đoán nhập hàng",
    logId,
}) => {
    const [downloadingPdf, setDownloadingPdf] = React.useState(false);
    const { showToast } = useToast();

    // Helper function to format price
    const formatPrice = (price?: number) => {
        if (price === undefined) return "N/A";
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(price);
    };

    const handleDownloadPdf = async () => {
        if (!logId) {
            showToast("Chỉ có thể tải PDF cho log đã lưu.", "warning");
            return;
        }

        try {
            setDownloadingPdf(true);
            const blob = await inventoryService.downloadRestockLogPdf(logId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `restock-log-${logId.substring(0, 8)}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download restock pdf failed:", error);
            showToast("Không thể tải PDF log dự đoán nhập hàng.", "error");
        } finally {
            setDownloadingPdf(false);
        }
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
                                <TableRow sx={{ bgcolor: "grey.50" }}>
                                    <TableCell><strong>SKU</strong></TableCell>
                                    <TableCell><strong>Tên sản phẩm</strong></TableCell>
                                    <TableCell><strong>Volume</strong></TableCell>
                                    <TableCell><strong>Type</strong></TableCell>
                                    <TableCell align="right"><strong>Giá</strong></TableCell>
                                    <TableCell align="center"><strong>Tồn kho</strong></TableCell>
                                    <TableCell align="center"><strong>Đã đặt</strong></TableCell>
                                    <TableCell align="center"><strong>Gợi ý nhập</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{row.sku}</TableCell>
                                        <TableCell>{row.productName || "N/A"}</TableCell>
                                        <TableCell>{row.volumeMl}ml</TableCell>
                                        <TableCell>
                                            <Chip label={row.type} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">{formatPrice(row.basePrice)}</TableCell>
                                        <TableCell align="center">{row.totalQuantity}</TableCell>
                                        <TableCell align="center">{row.reservedQuantity}</TableCell>
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
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Tooltip title={logId ? "Tải PDF log này" : "Log mới tạo chưa có mã để tải PDF"}>
                    <span>
                        <Button
                            variant="outlined"
                            color="inherit"
                            startIcon={<PictureAsPdfIcon />}
                            onClick={handleDownloadPdf}
                            disabled={!logId || downloadingPdf}
                        >
                            {downloadingPdf ? "Đang tải..." : "Tải PDF"}
                        </Button>
                    </span>
                </Tooltip>
                <Button onClick={onClose} variant="contained" color="primary">
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
