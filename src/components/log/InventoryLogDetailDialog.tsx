import { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Divider,
    Tooltip,
} from "@mui/material";
import { 
    Assessment as AssessmentIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
    PictureAsPdf as PictureAsPdfIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AIInventoryReportLog } from "@/types/inventory";
import { inventoryService } from "@/services/ai/inventoryService";
import { useToast } from "@/hooks/useToast";

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

interface InventoryLogDetailDialogProps {
    open: boolean;
    onClose: () => void;
    log: AIInventoryReportLog | null;
}

export const InventoryLogDetailDialog = ({ open, onClose, log }: InventoryLogDetailDialogProps) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const { showToast } = useToast();

    if (!log) return null;

    const handleClose = () => {
        setIsFullscreen(false);
        onClose();
    };

    const handleDownloadPdf = async () => {
        if (!log?.id) {
            showToast("Không tìm thấy mã log để tải PDF.", "warning");
            return;
        }

        try {
            setDownloadingPdf(true);
            const blob = await inventoryService.downloadInventoryReportLogPdf(log.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `inventory-report-log-${log.id.substring(0, 8)}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download inventory report pdf failed:", error);
            showToast("Không thể tải PDF log báo cáo tồn kho.", "error");
        } finally {
            setDownloadingPdf(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullScreen={isFullscreen} maxWidth={isFullscreen ? false : "md"} fullWidth={!isFullscreen}>
            <DialogTitle>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
                    <Box display="flex" alignItems="center" gap={1} flex={1}>
                        <AssessmentIcon color="primary" />
                        <Box>
                            <Typography variant="h6" fontWeight="bold">
                                Chi tiết Log Báo cáo Tồn kho
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                ID: {log.id}
                            </Typography>
                        </Box>
                    </Box>
                    <Tooltip title={isFullscreen ? "Thu nhỏ" : "Phóng to"}>
                        <Button
                            size="small"
                            variant="text"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            sx={{ minWidth: "auto", p: 0.5 }}
                        >
                            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </Button>
                    </Tooltip>
                </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ 
                display: "flex",
                flexDirection: "column",
                gap: 2,
                pt: 1,
                minHeight: isFullscreen ? "calc(100vh - 200px)" : "auto",
                flex: isFullscreen ? 1 : "auto"
            }}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Ngày tạo
                        </Typography>
                        <Typography variant="body2">{formatDate(log.createdAt)}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Cập nhật lần cuối
                        </Typography>
                        <Typography variant="body2">{formatDate(log.updatedAt)}</Typography>
                    </Box>
                </Box>

                <Divider />

                <Box flex={isFullscreen ? 1 : "auto"} display="flex" flexDirection="column">
                    <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom display="block">
                        Nội dung phản hồi AI
                    </Typography>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            maxHeight: isFullscreen ? "calc(100vh - 350px)" : 400,
                            overflowX: "auto",
                            overflowY: "auto",
                            bgcolor: "grey.50",
                            borderRadius: 1,
                            flex: isFullscreen ? 1 : "auto",
                        }}
                    >
                        {log.inventoryLog ? (
                            <Box
                                className="markdown-content"
                                sx={{
                                    fontSize: "0.9rem",
                                    lineHeight: 1.6,
                                    "& p": { m: 0, mb: 1.2 },
                                    "& ul, & ol": { m: 0, mb: 1.2, pl: 3 },
                                    "& li": { mb: 0.4 },
                                    "& table": {
                                        width: "100%",
                                        minWidth: 640,
                                        borderCollapse: "collapse",
                                        my: 1.25,
                                        backgroundColor: "background.paper",
                                    },
                                    "& thead tr": { backgroundColor: "grey.100" },
                                    "& th, & td": {
                                        border: "1px solid",
                                        borderColor: "divider",
                                        px: 1.25,
                                        py: 0.85,
                                        textAlign: "left",
                                        verticalAlign: "top",
                                        fontSize: "0.875rem",
                                    },
                                    "& th": { fontWeight: 700, whiteSpace: "nowrap" },
                                    "& td": { whiteSpace: "nowrap" },
                                    "& td:first-of-type": { whiteSpace: "normal", minWidth: 220 },
                                    "& pre": {
                                        m: 0,
                                        mb: 1,
                                        p: 1.5,
                                        borderRadius: 1,
                                        backgroundColor: "grey.100",
                                        overflowX: "auto",
                                    },
                                    "& code": {
                                        fontFamily: "monospace",
                                        fontSize: "0.85em",
                                        px: 0.5,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        backgroundColor: "grey.200",
                                    },
                                }}
                            >
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ ...props }) => <Typography variant="h6" sx={{ mt: 1.5, mb: 1 }} {...props} />,
                                        h2: ({ ...props }) => <Typography variant="subtitle1" sx={{ mt: 1.5, mb: 1 }} {...props} />,
                                        h3: ({ ...props }) => (
                                            <Typography variant="body1" fontWeight={600} sx={{ mt: 1, mb: 1 }} {...props} />
                                        ),
                                    }}
                                >
                                    {log.inventoryLog}
                                </ReactMarkdown>
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Không có nội dung
                            </Typography>
                        )}
                    </Paper>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                >
                    {downloadingPdf ? "Đang tải..." : "Tải PDF"}
                </Button>
                <Button onClick={handleClose} variant="outlined">
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
