import { Box, CircularProgress, LinearProgress, Paper, Typography } from "@mui/material";

interface Props {
    loading: boolean;
    totalRecords: number;
    totalAccepted: number;
    totalRejected: number;
    totalPending: number;
    rateAccepted: number;
    rateRejected: number;
    ratePending: number;
}

export const AIAcceptanceStatsCards = ({
    loading,
    totalRecords,
    totalAccepted,
    totalRejected,
    totalPending,
    rateAccepted,
    rateRejected,
    ratePending,
}: Props) => {
    const acceptedPct = totalRecords > 0 ? Math.round((totalAccepted / totalRecords) * 100) : 0;
    const rejectedPct = totalRecords > 0 ? Math.round((totalRejected / totalRecords) * 100) : 0;
    const pendingPct = totalRecords > 0 ? Math.round((totalPending / totalRecords) * 100) : 0;

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 3,
                mb: 3,
            }}
        >
            <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Tổng bản ghi
                </Typography>
                {loading ? (
                    <CircularProgress size={24} />
                ) : (
                    <Typography variant="h3" fontWeight="bold">
                        {totalRecords}
                    </Typography>
                )}
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Tỷ lệ chấp nhận
                </Typography>
                {loading ? (
                    <CircularProgress size={24} />
                ) : (
                    <>
                        <Typography variant="h3" fontWeight="bold" color="success.main">
                                {rateAccepted.toFixed(1)}%
                        </Typography>
                        <Box mt={1}>
                            <LinearProgress
                                variant="determinate"
                                value={rateAccepted}
                                color="success"
                                sx={{ borderRadius: 1, height: 6 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {totalAccepted} / {totalRecords} bản ghi ({acceptedPct}%)
                            </Typography>
                        </Box>
                    </>
                )}
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Tỷ lệ từ chối
                </Typography>
                {loading ? (
                    <CircularProgress size={24} />
                ) : (
                    <>
                        <Typography variant="h3" fontWeight="bold" color="error.main">
                                {rateRejected.toFixed(1)}%
                        </Typography>
                        <Box mt={1}>
                            <LinearProgress
                                variant="determinate"
                                value={rateRejected}
                                color="error"
                                sx={{ borderRadius: 1, height: 6 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {totalRejected} / {totalRecords} bản ghi ({rejectedPct}%)
                            </Typography>
                        </Box>
                    </>
                )}
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Tỷ lệ chưa xác định
                </Typography>
                {loading ? (
                    <CircularProgress size={24} />
                ) : (
                    <>
                        <Typography variant="h3" fontWeight="bold" color="warning.main">
                            {ratePending.toFixed(1)}%
                        </Typography>
                        <Box mt={1}>
                            <LinearProgress
                                variant="determinate"
                                value={ratePending}
                                color="warning"
                                sx={{ borderRadius: 1, height: 6 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {totalPending} / {totalRecords} bản ghi ({pendingPct}%)
                            </Typography>
                        </Box>
                    </>
                )}
            </Paper>
        </Box>
    );
};
