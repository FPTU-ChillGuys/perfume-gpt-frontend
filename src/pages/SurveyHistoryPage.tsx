import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Container,
    Divider,
    List,
    ListItemButton,
    Paper,
    Typography,
} from "@mui/material";
import {
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
import { MainLayout } from "@/layouts/MainLayout";
import { UserProfileSidebar } from "@/components/profile/UserProfileSidebar";
import { userService } from "@/services/userService";
import type { UserCredentials } from "@/services/userService";

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

    const [userInfo, setUserInfo] = useState<UserCredentials | null>(null);
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

    useEffect(() => {
        void userService.getUserMe().then(setUserInfo).catch(console.error);
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (error) {
            return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
        }

        if (records.length === 0) {
            return (
                <Box sx={{ p: 4, textAlign: "center" }}>
                    <HistoryIcon sx={{ fontSize: 56, opacity: 0.15, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Chưa có lịch sử khảo sát</Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                        Hãy thực hiện khảo sát đầu tiên để xem lịch sử tại đây.
                    </Typography>
                    <Chip
                        label="Thực hiện khảo sát"
                        color="primary"
                        onClick={() => navigate("/survey")}
                        sx={{ cursor: "pointer" }}
                    />
                </Box>
            );
        }

        return (
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, minHeight: 400 }}>
                {/* Record list */}
                <Box sx={{
                    width: { xs: "100%", md: 300 },
                    flexShrink: 0,
                    borderRight: { xs: "none", md: "1px solid" },
                    borderBottom: { xs: "1px solid", md: "none" },
                    borderColor: "divider",
                    maxHeight: { xs: "35vh", md: "none" },
                    overflowY: "auto",
                }}>
                    <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                        <HistoryIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1 }}>
                            Lịch sử khảo sát
                        </Typography>
                        <Chip label={records.length} size="small" color="primary" />
                    </Box>
                    <List disablePadding>
                        {records.map((record, index) => {
                            const isSelected = selectedId === record.id;
                            const productCount = parseHistoryProducts(record.aiResult).length;
                            const dateStr = format(
                                new Date(record.updatedAt || record.createdAt),
                                "dd/MM/yyyy HH:mm",
                                { locale: vi }
                            );
                            return (
                                <ListItemButton
                                    key={record.id}
                                    selected={isSelected}
                                    onClick={() => setSelectedId(record.id)}
                                    sx={{
                                        borderBottom: "1px solid",
                                        borderColor: "divider",
                                        py: 1.25,
                                        px: 2,
                                        "&.Mui-selected": { bgcolor: "rgba(238,77,45,0.06)" },
                                    }}
                                >
                                    <Box sx={{ width: "100%" }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                                            <CalendarIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                            <Typography variant="body2" fontWeight="bold">
                                                Lần {records.length - index}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {dateStr}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", gap: 0.5 }}>
                                            <Chip label={`${record.details.length} câu hỏi`} size="small" variant="outlined" sx={{ fontSize: "0.68rem", height: 20 }} />
                                            {productCount > 0 && (
                                                <Chip label={`${productCount} sản phẩm`} size="small" color="success" variant="outlined" sx={{ fontSize: "0.68rem", height: 20 }} />
                                            )}
                                        </Box>
                                    </Box>
                                </ListItemButton>
                            );
                        })}
                    </List>
                </Box>

                {/* Detail panel */}
                <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflowY: "auto" }}>
                    {!selectedRecord ? (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                            <Typography color="text.secondary">Chọn một lần khảo sát để xem chi tiết</Typography>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Kết quả khảo sát
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                {format(new Date(selectedRecord.updatedAt || selectedRecord.createdAt), "EEEE, dd MMMM yyyy 'lúc' HH:mm", { locale: vi })}
                            </Typography>

                            {/* Q&A */}
                            <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2, mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>
                                    Câu hỏi &amp; Trả lời
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                    {selectedRecord.details.map((detail, idx) => (
                                        <Box key={detail.questionId} sx={{ pb: idx < selectedRecord.details.length - 1 ? 1.5 : 0 }}>
                                            {idx > 0 && <Divider sx={{ mb: 1.5 }} />}
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

                            {/* Products */}
                            {selectedProducts.length > 0 && (
                                <Box>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                                        <ShoppingBagIcon color="primary" fontSize="small" />
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            Sản phẩm gợi ý ({selectedProducts.length})
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                        {selectedProducts.map((product) => (
                                            <SurveyProductCard key={product.id} product={product} />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {selectedProducts.length === 0 && selectedRecord.aiResult && (
                                <Alert severity="info">
                                    Kết quả AI đang được xử lý hoặc không có sản phẩm gợi ý.
                                </Alert>
                            )}
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    return (
        <MainLayout>
            <Box sx={{ bgcolor: "background.default", py: 4, flex: 1 }}>
                <Container maxWidth="lg">
                    <Paper
                        elevation={0}
                        sx={{
                            display: "flex",
                            overflow: "hidden",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            minHeight: 600,
                        }}
                    >
                        <UserProfileSidebar userInfo={userInfo} />
                        <Box sx={{
                            flex: 1,
                            minWidth: 0,
                            bgcolor: "background.paper",
                            pb: { xs: "72px", md: 0 },
                        }}>
                            {renderContent()}
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </MainLayout>
    );
}