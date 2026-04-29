import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    Paper,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import {
    ArrowBack as ArrowBackIcon,
    CalendarToday as CalendarIcon,
    History as HistoryIcon,
    ShoppingBag as ShoppingBagIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { surveyService } from "@/services/ai/surveyService";
import { getAnswerDisplayText } from "@/types/survey";
import type { UserSurveyRecord } from "@/types/survey";
import type { ChatProduct } from "@/types/chatbot";
import { parseAssistantPayload } from "@/components/chatbot/ChatbotWidget/helpers";
import SurveyProductCard from "@/components/survey/user/SurveyProductCard";

function parseHistoryProducts(aiResult: string | undefined): ChatProduct[] {
    if (!aiResult) return [];
    try {
        const payload = parseAssistantPayload(aiResult);
        return payload.products || [];
    } catch {
        return [];
    }
}

export default function SurveyHistoryPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const [records, setRecords] = useState<UserSurveyRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedRecord = records.find((r) => r.id === selectedId) || null;
    const selectedProducts = parseHistoryProducts(selectedRecord?.aiResult);

    const fetchHistory = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await surveyService.getUserSurveyHistory(user.id);
            setRecords(res.data || []);
            if (res.data && res.data.length > 0) {
                setSelectedId(res.data[0]!.id);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Không thể tải lịch sử khảo sát";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (records.length === 0) {
        return (
            <Box sx={{ p: 3, maxWidth: 800, mx: "auto", textAlign: "center", py: 10 }}>
                <HistoryIcon sx={{ fontSize: 64, opacity: 0.15, mb: 2 }} />
                <Typography variant="h6" gutterBottom>Chưa có lịch sử khảo sát</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>Hãy thực hiện khảo sát đầu tiên để xem lịch sử tại đây.</Typography>
                <Chip label="Thực hiện khảo sát" color="primary" onClick={() => navigate("/survey")} sx={{ cursor: "pointer" }} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "80vh", bgcolor: "background.default" }}>
            {/* Sidebar - Record List */}
            <Box sx={{
                width: isMobile ? "100%" : 360,
                flexShrink: 0,
                borderRight: isMobile ? "none" : "1px solid",
                borderBottom: isMobile ? "1px solid" : "none",
                borderColor: "divider",
                bgcolor: "background.paper",
                overflow: "auto",
                maxHeight: isMobile ? "40vh" : "none",
            }}>
                <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                    {isMobile && (
                        <IconButton onClick={() => navigate(-1)} size="small">
                            <ArrowBackIcon />
                        </IconButton>
                    )}
                    <HistoryIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>Lịch sử khảo sát</Typography>
                    <Chip label={records.length} size="small" color="primary" />
                </Box>

                <List disablePadding>
                    {records.map((record, index) => {
                        const isSelected = selectedId === record.id;
                        const productCount = parseHistoryProducts(record.aiResult).length;
                        const dateStr = format(new Date(record.updatedAt || record.createdAt), "dd/MM/yyyy HH:mm", { locale: vi });

                        return (
                            <ListItemButton
                                key={record.id}
                                selected={isSelected}
                                onClick={() => setSelectedId(record.id)}
                                sx={{
                                    borderBottom: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: isSelected ? "primary.50" : "transparent",
                                    "&:hover": { bgcolor: isSelected ? "primary.50" : "action.hover" },
                                    py: 1.5,
                                    px: 2,
                                }}
                            >
                                <Box sx={{ width: "100%" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                        <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                                        <Typography variant="body2" fontWeight="bold">
                                            Lần {records.length - index}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {dateStr}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: "flex", gap: 0.5 }}>
                                        <Chip label={`${record.details.length} câu hỏi`} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 22 }} />
                                        {productCount > 0 && (
                                            <Chip label={`${productCount} sản phẩm`} size="small" color="success" variant="outlined" sx={{ fontSize: "0.7rem", height: 22 }} />
                                        )}
                                    </Box>
                                </Box>
                            </ListItemButton>
                        );
                    })}
                </List>
            </Box>

            {/* Main Content - Record Detail */}
            <Box sx={{ flex: 1, overflow: "auto", p: isMobile ? 2 : 3 }}>
                {!selectedRecord ? (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
                        <Typography color="text.secondary">Chọn một lần khảo sát để xem chi tiết</Typography>
                    </Box>
                ) : (
                    <Box sx={{ maxWidth: 900, mx: "auto" }}>
                        {/* Header */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                Kết quả khảo sát
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {format(new Date(selectedRecord.updatedAt || selectedRecord.createdAt), "EEEE, dd MMMM yyyy 'lúc' HH:mm", { locale: vi })}
                            </Typography>
                        </Box>

                        {/* Q&A Section */}
                        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3, mb: 3 }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                Câu hỏi & Trả lời
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {selectedRecord.details.map((detail, idx) => (
                                    <Box key={detail.questionId} sx={{ pb: idx < selectedRecord.details.length - 1 ? 2 : 0 }}>
                                        {idx < selectedRecord.details.length - 1 && idx > 0 && <Divider sx={{ mb: 2 }} />}
                                        <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                            {idx + 1}. {detail.question}
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
                                    </Box>
                                ))}
                            </Box>
                        </Paper>

                        {/* Products Section */}
                        {selectedProducts.length > 0 && (
                            <Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                                    <ShoppingBagIcon color="primary" />
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        Sản phẩm gợi ý ({selectedProducts.length})
                                    </Typography>
                                </Box>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    {selectedProducts.map((product) => (
                                        <SurveyProductCard key={product.id} product={product} />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {selectedProducts.length === 0 && selectedRecord.aiResult && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Kết quả AI đang được xử lý hoặc không có sản phẩm gợi ý cho lần khảo sát này.
                            </Alert>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
}