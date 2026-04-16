import { useEffect, useState } from "react";
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Divider,
    List,
    ListItem,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip
} from "@mui/material";
import {
    Close as CloseIcon,
    History as HistoryIcon,
    CalendarToday as CalendarIcon,
    ExpandMore as ExpandMoreIcon
} from "@mui/icons-material";
import { surveyService } from "@/services/ai/surveyService";
import { getAnswerDisplayText } from "@/types/survey";
import type { UserSurveyRecord } from "@/types/survey";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface SurveyHistoryDrawerProps {
    open: boolean;
    onClose: () => void;
    userId: string;
}

export default function SurveyHistoryDrawer({ open, onClose, userId }: SurveyHistoryDrawerProps) {
    const [history, setHistory] = useState<UserSurveyRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && userId) {
            fetchHistory();
        }
    }, [open, userId]);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await surveyService.getUserSurveyHistory(userId);
            setHistory(res.data || []);
        } catch (err: any) {
            setError(err.message || "Failed to load history");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { width: { xs: "100%", sm: 400 }, p: 0, bgcolor: "background.default" }
            }}
        >
            <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <HistoryIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Lịch sử khảo sát
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box sx={{ p: 2, flex: 1, overflowY: "auto" }}>
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Typography color="error" align="center" sx={{ py: 3 }}>
                        {error}
                    </Typography>
                ) : history.length === 0 ? (
                    <Box sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                        <HistoryIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                        <Typography>Chưa có lịch sử khảo sát nào.</Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" align="right">
                            Tổng cộng: {history.length} lần khảo sát
                        </Typography>
                        {history.map((record, index) => (
                            <Accordion key={record.id} variant="outlined" sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                                        <CalendarIcon fontSize="small" />
                                        <Typography variant="caption" fontWeight="bold">
                                            Lần {history.length - index}: {format(new Date(record.updatedAt || record.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 0 }}>
                                    <Divider sx={{ mb: 2 }} />
                                    <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                        {record.details.map((detail) => (
                                            <ListItem key={detail.questionId} disablePadding sx={{ flexDirection: "column", alignItems: "flex-start" }}>
                                                <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                                    {detail.question}
                                                </Typography>
                                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                                    {detail.answers.map((ans) => (
                                                        <Chip
                                                            key={ans.detailId}
                                                            label={getAnswerDisplayText(ans.answer)}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                    ))}
                                                </Box>
                                            </ListItem>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                )}
            </Box>
        </Drawer>
    );
}
