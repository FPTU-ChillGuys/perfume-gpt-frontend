import { useState, useEffect, useRef, useCallback } from "react";
import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Divider,
    LinearProgress,
    Alert,
    Tooltip,
} from "@mui/material";
import { AutoAwesome as AutoAwesomeIcon } from "@mui/icons-material";
import { useTimer } from "react-timer-hook";
import { inventoryService } from "@/services/ai/inventoryService";

const POLL_INTERVAL_MS = 3000;

type JobPhase = "idle" | "pending" | "done" | "error";

interface AIInventoryReportDialogProps {
    open: boolean;
    onClose: () => void;
}

export const AIInventoryReportDialog = ({ open, onClose }: AIInventoryReportDialogProps) => {
    const [phase, setPhase] = useState<JobPhase>("idle");
    const [reportText, setReportText] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { seconds, minutes, isRunning, restart, pause } = useTimer({
        expiryTimestamp: new Date(),
        autoStart: false,
    });

    const isExpired = !isRunning;
    const remainingSeconds = minutes * 60 + seconds;

    const formatRemaining = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return m > 0 ? `${m}p ${s}s` : `${s}s`;
    };

    const stopPolling = useCallback(() => {
        if (pollRef.current !== null) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    // Cleanup polling when dialog closes
    useEffect(() => {
        if (!open) {
            stopPolling();
        }
        return () => stopPolling();
    }, [open, stopPolling]);

    const handleStart = async () => {
        setPhase("pending");
        setReportText(null);
        setErrorMsg(null);
        let jobId: string;
        try {
            const res = await inventoryService.createInventoryReportJob();
            jobId = res.data.jobId;
            restart(new Date(res.data.expirationTime), true);
        } catch (err: any) {
            setPhase("error");
            setErrorMsg(err?.message ?? "Không thể khởi tạo job.");
            return;
        }

        const checkResult = async () => {
            try {
                const res = await inventoryService.getInventoryReportJobResult(jobId);
                const jobData = res.data;
                if (jobData?.status === "completed") {
                    stopPolling();
                    setReportText(jobData.data ?? "");
                    setPhase("done");
                } else if (jobData?.status === "failed") {
                    stopPolling();
                    setErrorMsg(jobData.error ?? "Job thất bại.");
                    setPhase("error");
                }
            } catch {
                stopPolling();
                setErrorMsg("Lỗi khi kiểm tra trạng thái job.");
                setPhase("error");
            }
        };

        pollRef.current = setInterval(checkResult, POLL_INTERVAL_MS);
        void checkResult();
    };

    const handleClose = () => {
        stopPolling();
        onClose();
    };

    const handleRetry = () => {
        stopPolling();
        pause();
        setPhase("idle");
        setReportText(null);
        setErrorMsg(null);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <AutoAwesomeIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Tạo báo cáo tồn kho bằng AI
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                    Sử dụng AI để phân tích và tóm tắt dữ liệu tồn kho hiện tại
                </Typography>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ minHeight: 200, pt: 3 }}>
                {phase === "idle" && (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
                        <AutoAwesomeIcon sx={{ fontSize: 56, color: "primary.light" }} />
                        <Typography variant="body1" color="text.secondary" textAlign="center">
                            Nhấn nút bên dưới để AI tự động phân tích và tóm tắt báo cáo tồn kho.
                            <br />
                            Quá trình này có thể mất vài giây.
                        </Typography>
                    </Box>
                )}

                {phase === "pending" && (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={4}>
                        <CircularProgress size={48} />
                        <Typography variant="body1" color="text.secondary">
                            AI đang tóm tắt báo cáo tồn kho, vui lòng chờ...
                        </Typography>
                        <LinearProgress sx={{ width: "100%", borderRadius: 1 }} />
                    </Box>
                )}

                {phase === "done" && reportText !== null && (
                    <Box display="flex" flexDirection="column" gap={2}>
                        <Alert severity="success">Báo cáo đã được tạo thành công!</Alert>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                maxHeight: 420,
                                overflowY: "auto",
                                bgcolor: "grey.50",
                                borderRadius: 1,
                            }}
                        >
                            <Typography
                                variant="body2"
                                component="pre"
                                sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", m: 0 }}
                            >
                                {reportText || "Không có nội dung."}
                            </Typography>
                        </Paper>
                    </Box>
                )}

                {phase === "error" && (
                    <Box display="flex" flexDirection="column" gap={2} py={2}>
                        <Alert severity="error">{errorMsg ?? "Đã xảy ra lỗi."}</Alert>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                {phase === "idle" && (
                    <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={handleStart}>
                        Bắt đầu tóm tắt
                    </Button>
                )}
                {phase === "error" && (
                    <Tooltip title={!isExpired ? `Vui lòng chờ thêm ${formatRemaining(remainingSeconds)}` : ""}>
                        <span>
                            <Button variant="outlined" onClick={handleRetry} disabled={!isExpired}>
                                {isExpired ? "Thử lại" : `Thử lại (${formatRemaining(remainingSeconds)})`}
                            </Button>
                        </span>
                    </Tooltip>
                )}
                {phase === "done" && (
                    <Tooltip title={!isExpired ? `Vui lòng chờ thêm ${formatRemaining(remainingSeconds)}` : ""}>
                        <span>
                            <Button variant="outlined" onClick={handleRetry} disabled={!isExpired}>
                                {isExpired ? "Tạo lại" : `Tạo lại (${formatRemaining(remainingSeconds)})`}
                            </Button>
                        </span>
                    </Tooltip>
                )}
                <Button onClick={handleClose} color="inherit" disabled={phase === "pending"}>
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
