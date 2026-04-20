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
import {
    AutoAwesome as AutoAwesomeIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
    Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useTimer } from "react-timer-hook";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { inventoryService } from "@/services/ai/inventoryService";

const POLL_INTERVAL_MS = 3000;
const FORCE_REFRESH_THRESHOLD_MS = 15000; // 15 seconds

type JobPhase = "idle" | "pending" | "done" | "error";

interface AIInventoryReportDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const AIInventoryReportDialog = ({ open, onClose, onSuccess }: AIInventoryReportDialogProps) => {
    const [phase, setPhase] = useState<JobPhase>("idle");
    const [reportText, setReportText] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showRateLimitMessage, setShowRateLimitMessage] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showForceRefresh, setShowForceRefresh] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        if (elapsedTimerRef.current !== null) {
            clearInterval(elapsedTimerRef.current);
            elapsedTimerRef.current = null;
        }
        setElapsedTime(0);
        setShowForceRefresh(false);
    }, []);

    // Cleanup polling when dialog closes
    useEffect(() => {
        if (!open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            stopPolling();
        }
        return () => stopPolling();
    }, [open, stopPolling]);

    const handleStart = async (forceRefresh: boolean = false) => {
        setPhase("pending");
        setReportText(null);
        setErrorMsg(null);
        let jobId: string;
        try {
            const res = await inventoryService.createInventoryReportJob(forceRefresh);
            jobId = res.data!.jobId;
            restart(new Date(res.data!.expirationTime), true);
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
                    setShowRateLimitMessage(true);
                    onSuccess?.();
                } else if (jobData?.status === "failed") {
                    stopPolling();
                    setErrorMsg(jobData.error ?? "Job thất bại.");
                    setPhase("error");
                    setShowRateLimitMessage(false);
                }
            } catch {
                stopPolling();
                setErrorMsg("Lỗi khi kiểm tra trạng thái job.");
                setPhase("error");
                setShowRateLimitMessage(false);
            }
        };

        pollRef.current = setInterval(checkResult, POLL_INTERVAL_MS);
        void checkResult();

        // Start elapsed time tracker
        if (elapsedTimerRef.current !== null) {
            clearInterval(elapsedTimerRef.current);
        }
        setElapsedTime(0);
        setShowForceRefresh(false);
        elapsedTimerRef.current = setInterval(() => {
            setElapsedTime((prev) => {
                const newTime = prev + 1000;
                if (newTime >= FORCE_REFRESH_THRESHOLD_MS && !showForceRefresh) {
                    setShowForceRefresh(true);
                }
                return newTime;
            });
        }, 1000);
    };

    const handleForceRefresh = () => {
        stopPolling();
        pause();
        setReportText(null);
        setShowRateLimitMessage(false);
        void handleStart(true);
    };

    const handleRetry = () => {
        stopPolling();
        pause();
        setPhase("idle");
        setReportText(null);
        setErrorMsg(null);
        setShowRateLimitMessage(false);
    };

    const handleDialogClose = () => {
        handleRetry();
        setIsFullscreen(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleDialogClose} fullScreen={isFullscreen} maxWidth={isFullscreen ? false : "md"} fullWidth={!isFullscreen}>
            <DialogTitle>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
                    <Box display="flex" alignItems="center" gap={1} flex={1}>
                        <AutoAwesomeIcon color="primary" />
                        <Box>
                            <Typography variant="h6" fontWeight="bold">
                                Tạo báo cáo tồn kho bằng AI
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Sử dụng AI để phân tích và tóm tắt dữ liệu tồn kho hiện tại
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
                minHeight: isFullscreen ? "calc(100vh - 200px)" : 200,
                pt: 3,
                display: "flex",
                flexDirection: "column",
                flex: isFullscreen ? 1 : "auto"
            }}>
                {phase === "idle" && (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4} flex={1} justifyContent="center">
                        <AutoAwesomeIcon sx={{ fontSize: 56, color: "primary.light" }} />
                        <Typography variant="body1" color="text.secondary" textAlign="center">
                            Nhấn nút bên dưới để AI tự động phân tích và tóm tắt báo cáo tồn kho.
                            <br />
                            Quá trình này có thể mất vài giây.
                        </Typography>
                    </Box>
                )}

                {phase === "pending" && (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={4} flex={1} justifyContent="center">
                        <CircularProgress size={48} />
                        <Typography variant="body1" color="text.secondary">
                            AI đang tóm tắt báo cáo tồn kho, vui lòng chờ...
                        </Typography>
                        <LinearProgress sx={{ width: "100%", borderRadius: 1 }} />
                        {showForceRefresh && (
                            <Button
                                variant="contained"
                                color="warning"
                                onClick={handleForceRefresh}
                                startIcon={<RefreshIcon />}
                            >
                                Làm mới bắt buộc (Yêu cầu quá hạn)
                            </Button>
                        )}
                    </Box>
                )}

                {phase === "done" && reportText !== null && (
                    <Box display="flex" flexDirection="column" gap={2} flex={isFullscreen ? 1 : "auto"}>
                        <Alert severity="success">Báo cáo đã được tạo thành công!</Alert>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                maxHeight: isFullscreen ? "calc(100vh - 300px)" : 420,
                                overflowY: "auto",
                                bgcolor: "grey.50",
                                borderRadius: 1,
                                flex: isFullscreen ? 1 : "auto",
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
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {reportText || "Không có nội dung."}
                            </ReactMarkdown>
                        </Paper>
                    </Box>
                )}

                {phase === "error" && (
                    <Box display="flex" flexDirection="column" gap={2} py={2} flex={1} justifyContent="center">
                        <Alert severity="error">{errorMsg ?? "Đã xảy ra lỗi."}</Alert>
                        <Typography variant="body2" color="text.secondary">
                            Bạn có thể thử lại ngay bây giờ hoặc thoát và thử lại sau.
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                {phase === "idle" && (
                    <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => handleStart(false)}>
                        Bắt đầu tóm tắt
                    </Button>
                )}
                {phase === "error" && (
                    <>
                        <Button variant="outlined" onClick={handleRetry} color="error">
                            Thử lại
                        </Button>
                        <Button variant="contained" onClick={handleForceRefresh} color="error">
                            Làm mới bắt buộc (Đặt lại)
                        </Button>
                    </>
                )}
                {phase === "done" && (
                    <>
                        <Tooltip title={!isExpired ? `Vui lòng chờ thêm ${formatRemaining(remainingSeconds)}` : ""}>
                            <span>
                                <Button variant="outlined" onClick={() => { handleRetry(); onSuccess?.(); }} disabled={!isExpired}>
                                    {isExpired ? "Tạo lại" : `Tạo lại (${formatRemaining(remainingSeconds)})`}
                                </Button>
                            </span>
                        </Tooltip>
                        <Button variant="contained" onClick={handleForceRefresh} color="warning">
                            Làm mới bắt buộc
                        </Button>
                        <Button
                            onClick={handleDialogClose}
                            variant="contained"
                            color="success"
                        >
                            Đóng
                        </Button>
                    </>
                )}
                {phase !== "done" && (
                    <Button onClick={handleDialogClose} color="inherit" disabled={phase === "pending"}>
                        Đóng
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
