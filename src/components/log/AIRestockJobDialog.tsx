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
    AutoGraph as AutoGraphIcon,
    Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useTimer } from "react-timer-hook";
import { inventoryService } from "@/services/ai/inventoryService";
import type { RestockAIPredictionData } from "@/types/inventory";

const POLL_INTERVAL_MS = 3000;
const FORCE_REFRESH_THRESHOLD_MS = 15000; // 15 seconds

type JobPhase = "idle" | "pending" | "done" | "error";

interface AIRestockJobDialogProps {
    open: boolean;
    onClose: () => void;
    onJobSuccess: (data: RestockAIPredictionData) => void;
}

export const AIRestockJobDialog = ({ open, onClose, onJobSuccess }: AIRestockJobDialogProps) => {
    const [phase, setPhase] = useState<JobPhase>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showForceRefresh, setShowForceRefresh] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
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
        setJobId(null);
    }, []);

    // Cleanup polling when dialog closes
    useEffect(() => {
        if (!open) {
            stopPolling();
        }
        return () => stopPolling();
    }, [open, stopPolling]);

    // Handle polling when jobId changes
    useEffect(() => {
        if (!jobId || phase !== "pending") {
            return;
        }

        const checkResult = async () => {
            try {
                const res = await inventoryService.getRestockJobResult(jobId);
                const jobData = res.data;
                if (jobData?.status === "completed") {
                    stopPolling();
                    setPhase("done");

                    // Parse the JSON data directly to pass back to the tab
                    if (jobData.data) {
                        try {
                            console.log("=== DEBUG RESTOCK JOB DATA ===");
                            console.log("jobData.data:", jobData.data);
                            console.log("Type:", typeof jobData.data);
                            
                            let parsedData: RestockAIPredictionData;
                            
                            // Check if jobData.data is already an object or a string
                            if (typeof jobData.data === 'object' && !Array.isArray(jobData.data)) {
                                // It's already an object
                                console.log("✓ jobData.data is already an object");
                                
                                // Check if it's wrapped in ApiResponse format
                                if ((jobData.data as any).success && (jobData.data as any).data) {
                                    parsedData = (jobData.data as any).data as RestockAIPredictionData;
                                    console.log("✓ Unwrapped from ApiResponse wrapper");
                                } else if ((jobData.data as any).variants) {
                                    parsedData = jobData.data as RestockAIPredictionData;
                                    console.log("✓ Direct format detected");
                                } else {
                                    throw new Error("Unexpected object format: " + JSON.stringify(jobData.data));
                                }
                            } else if (typeof jobData.data === 'string') {
                                // It's a JSON string, need to parse
                                console.log("✓ jobData.data is a string, parsing...");
                                const rawParsed = JSON.parse(jobData.data);
                                
                                if (rawParsed.success && rawParsed.data) {
                                    parsedData = rawParsed.data as RestockAIPredictionData;
                                    console.log("✓ Unwrapped from ApiResponse wrapper (string)");
                                } else if (rawParsed.variants) {
                                    parsedData = rawParsed as RestockAIPredictionData;
                                    console.log("✓ Direct format detected (string)");
                                } else {
                                    throw new Error("Unexpected string format");
                                }
                            } else {
                                throw new Error("Unexpected data type: " + typeof jobData.data);
                            }
                            
                            console.log("Final parsed data:", parsedData);
                            console.log("=== END DEBUG ===");
                            
                            // Small delay to let user see "Success" alert briefly
                            setTimeout(() => {
                                onJobSuccess(parsedData);
                                onClose();
                            }, 1000);
                        } catch (parseError) {
                            console.error("=== PARSE ERROR ===");
                            console.error("Failed to parse restock job data:", parseError);
                            console.error("Raw data received:", jobData.data);
                            console.error("=== END PARSE ERROR ===");
                            setPhase("error");
                            setErrorMsg("Dữ liệu phân tích trả về không đúng định dạng.");
                        }
                    } else {
                        setPhase("error");
                        setErrorMsg("Không nhận được dữ liệu hợp lệ từ AI.");
                    }

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

        return () => {
            if (pollRef.current !== null) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [jobId, phase, stopPolling, onJobSuccess, onClose]);

    const handleStart = async (forceRefresh: boolean = false) => {
        setPhase("pending");
        setErrorMsg(null);
        setJobId(null); // Reset old job ID

        try {
            const res = await inventoryService.createRestockJob(forceRefresh);
            setJobId(res.data.jobId); // This will trigger polling via useEffect
            restart(new Date(res.data.expirationTime), true);
        } catch (err: any) {
            setPhase("error");
            setErrorMsg(err?.message ?? "Không thể khởi tạo job dự đoán nhập hàng.");
            return;
        }

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
        setErrorMsg(null);
        void handleStart(true);
    };

    const handleClose = () => {
        stopPolling();
        onClose();
        // Option to reset phase after close
        setTimeout(() => {
            setPhase("idle");
            setErrorMsg(null);
            pause();
        }, 500);
    };

    const handleRetry = () => {
        stopPolling();
        pause();
        setPhase("idle");
        setErrorMsg(null);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <AutoGraphIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        AI Dự đoán nhu cầu nhập hàng
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                    Quá trình phân tích chuyên sâu có thể mất khoảng vài chục giây
                </Typography>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ minHeight: 200, pt: 3 }}>
                {phase === "idle" && (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
                        <AutoGraphIcon sx={{ fontSize: 48, color: "primary.light" }} />
                        <Typography variant="body1" color="text.secondary" textAlign="center">
                            Hệ thống sẽ tổng hợp số liệu tồn kho, kết hợp AI dự đoán số lượng hàng cần thiết nên nhập kho.
                            <br />
                            Nhấn nút bên dưới để bắt đầu.
                        </Typography>
                    </Box>
                )}

                {phase === "pending" && (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={4}>
                        <CircularProgress size={48} />
                        <Typography variant="body1" color="text.secondary">
                            AI đang phân tích các mẫu tồn kho và bán hàng...
                        </Typography>
                        <LinearProgress sx={{ width: "100%", borderRadius: 1 }} />
                        {showForceRefresh && (
                            <Button
                                variant="contained"
                                color="warning"
                                onClick={handleForceRefresh}
                                startIcon={<RefreshIcon />}
                            >
                                Force Refresh (Request timed out)
                            </Button>
                        )}
                    </Box>
                )}

                {phase === "done" && (
                    <Box display="flex" flexDirection="column" gap={2} py={4} alignItems="center">
                        <AutoGraphIcon sx={{ fontSize: 56, color: "success.main" }} />
                        <Alert severity="success" sx={{ width: "100%" }}>
                            Phân tích hoàn tất! Đang hiển thị kết quả...
                        </Alert>
                    </Box>
                )}

                {phase === "error" && (
                    <Box display="flex" flexDirection="column" gap={2} py={2}>
                        <Alert severity="error">{errorMsg ?? "Đã xảy ra lỗi hệ thống."}</Alert>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                {phase === "idle" && (
                    <Button variant="contained" startIcon={<AutoGraphIcon />} onClick={ () => void handleStart() }>
                        Bắt đầu phân tích
                    </Button>
                )}
                {phase === "done" && (
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<RefreshIcon />}
                        onClick={handleForceRefresh}
                    >
                        Thử lại
                    </Button>
                )}
                {phase === "error" && (
                    <Button
                        variant="contained"
                        color="warning"
                        startIcon={<RefreshIcon />}
                        onClick={handleForceRefresh}
                    >
                        Thử lại (Force Refresh)
                    </Button>
                )}
                <Button onClick={handleClose} color="inherit" disabled={phase === "pending"}>
                    {phase === "done" ? "Đóng" : "Hủy"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
