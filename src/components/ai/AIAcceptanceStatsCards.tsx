import { Box, CircularProgress, LinearProgress, Paper, Typography } from "@mui/material";

interface Props {
    loading: boolean;
    totalRecords: number;
    totalAccepted: number;
    totalRejected: number;
    rateAccepted: number | null;
    rateRejected: number | null;
}

export const AIAcceptanceStatsCards = ({
    loading,
    totalRecords,
    totalAccepted,
    totalRejected,
    rateAccepted,
    rateRejected,
}: Props) => {
    const acceptedPct = totalRecords > 0 ? Math.round((totalAccepted / totalRecords) * 100) : 0;
    const rejectedPct = totalRecords > 0 ? Math.round((totalRejected / totalRecords) * 100) : 0;

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
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
                    Tỷ lệ chấp nhận (isAccepted=true)
                </Typography>
                {loading ? (
                    <CircularProgress size={24} />
                ) : (
                    <>
                        <Typography variant="h3" fontWeight="bold" color="success.main">
                            {rateAccepted !== null ? `${rateAccepted.toFixed(1)}%` : "N/A"}
                        </Typography>
                        <Box mt={1}>
                            <LinearProgress
                                variant="determinate"
                                value={rateAccepted ?? 0}
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
                    Tỷ lệ từ chối (isAccepted=false)
                </Typography>
                {loading ? (
                    <CircularProgress size={24} />
                ) : (
                    <>
                        <Typography variant="h3" fontWeight="bold" color="error.main">
                            {rateRejected !== null ? `${rateRejected.toFixed(1)}%` : "N/A"}
                        </Typography>
                        <Box mt={1}>
                            <LinearProgress
                                variant="determinate"
                                value={rateRejected ?? 0}
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
        </Box>
    );
};
