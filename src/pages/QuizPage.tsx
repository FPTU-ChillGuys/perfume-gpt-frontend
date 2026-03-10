import { useState, useEffect, useContext, useCallback } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Container,
    LinearProgress,
    Step,
    StepLabel,
    Stepper,
    Typography,
} from "@mui/material";
import {
    AutoAwesome as SparkleIcon,
    NavigateBefore as PrevIcon,
    NavigateNext as NextIcon,
} from "@mui/icons-material";
import { AuthContext } from "@/contexts/AuthContextType";
import { quizService } from "@/services/ai/quizService";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import { getOrCreateGuestUserId } from "@/utils/guestUserId";
import type { QuizQuestion, QuizQuesAnsDetailRequest } from "@/types/quiz";
import type { AssistantPayload } from "@/types/chatbot";
import { Header } from "@/components/layout/Header";
import QuizQuestionCard from "@/components/quiz/user/QuizQuestionCard";
import QuizResultView from "@/components/quiz/user/QuizResultView";

// ── Parse AI response string ────────────────────────────────────
function parseAiResponse(raw: string): AssistantPayload {
    try {
        return JSON.parse(raw) as AssistantPayload;
    } catch {
        return { message: raw, products: [] };
    }
}

// ── Page ────────────────────────────────────────────────────────
export default function QuizPage() {
    const authCtx = useContext(AuthContext);
    const userId = authCtx?.user?.id ?? getOrCreateGuestUserId();

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selections, setSelections] = useState<Map<string, Set<string>>>(new Map());
    const [currentStep, setCurrentStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<AssistantPayload | null>(null);

    // ── Fetch ─────────────────────────────────────────────────────
    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await quizService.getQuestions();
            setQuestions([...res.data].reverse());
        } catch {
            // show empty state
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

    // ── Selection handlers ────────────────────────────────────────
    const handleSingleSelect = useCallback((questionId: string, answerId: string) => {
        setSelections((prev) => new Map(prev).set(questionId, new Set([answerId])));
    }, []);

    const handleMultiSelect = useCallback((questionId: string, answerId: string, checked: boolean) => {
        setSelections((prev) => {
            const next = new Map(prev);
            const cur = new Set(next.get(questionId) ?? []);
            if (checked) {
                cur.add(answerId);
            } else {
                cur.delete(answerId);
            }
            return next.set(questionId, cur);
        });
    }, []);

    // ── Navigation ────────────────────────────────────────────────
    const currentQ = questions[currentStep];
    const selectedIds = (currentQ ? selections.get(currentQ.id) : undefined) ?? new Set<string>();
    const canNext = selectedIds.size > 0;
    const isLastQuestion = currentStep === questions.length - 1;
    const allAnswered = questions.every((q) => (selections.get(q.id)?.size ?? 0) > 0);

    const handleNext = () => setCurrentStep((s) => Math.min(s + 1, questions.length - 1));
    const handlePrev = () => setCurrentStep((s) => Math.max(0, s - 1));

    // ── Submit ────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        const payload: QuizQuesAnsDetailRequest[] = [];
        for (const [questionId, answerIds] of selections.entries()) {
            for (const answerId of answerIds) {
                payload.push({ questionId, answerId });
            }
        }
        setSubmitting(true);
        try {
            const res = await quizService.submitQuizV2(userId, payload);
            const parsedRes = parseAiResponse(res.data);
            setResult(parsedRes);
        } catch (err) {
            console.error("Quiz submit error:", err);
            setResult({ message: "Đã xảy ra lỗi khi lấy gợi ý. Vui lòng thử lại.", products: [] });
        } finally {
            setSubmitting(false);
        }
    }, [userId, selections]);

    const handleRestart = () => {
        setSelections(new Map());
        setCurrentStep(0);
        setResult(null);
    };

    // ── Loading ───────────────────────────────────────────────────
    if (loading) {
        return (
            <>
                <Header />
                <Container maxWidth="md" sx={{ mt: 10, display: "flex", justifyContent: "center" }}>
                    <CircularProgress />
                </Container>
            </>
        );
    }

    if (!questions.length) {
        return (
            <>
                <Header />
                <Container maxWidth="md" sx={{ mt: 10, textAlign: "center" }}>
                    <Typography variant="h6" color="text.secondary">
                        Hiện chưa có câu hỏi quiz. Vui lòng quay lại sau!
                    </Typography>
                </Container>
            </>
        );
    }

    // ── Result ────────────────────────────────────────────────────
    if (result) {
        return (
            <>
                <Header />
                <Container maxWidth="md" sx={{ py: 6 }}>
                    <QuizResultView result={result} userId={userId} onRestart={handleRestart} />
                </Container>
            </>
        );
    }

    // ── Quiz ──────────────────────────────────────────────────────
    return (
        <>
            <Header />
            <Container maxWidth="md" sx={{ py: 6 }}>
                {/* Hero */}
                <Box sx={{ textAlign: "center", mb: 5 }}>
                    <SparkleIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Tìm nước hoa phù hợp với bạn
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Trả lời {questions.length} câu hỏi ngắn để nhận gợi ý cá nhân hóa từ AI.
                    </Typography>
                </Box>

                {/* Progress bar */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Câu {currentStep + 1} / {questions.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {Math.round(((currentStep + 1) / questions.length) * 100)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={((currentStep + 1) / questions.length) * 100}
                        sx={{ height: 6, borderRadius: 3 }}
                    />
                </Box>

                {/* Stepper (desktop) */}
                <Box sx={{ display: { xs: "none", md: "block" }, mb: 4 }}>
                    <Stepper activeStep={currentStep} alternativeLabel>
                        {questions.map((q, idx) => (
                            <Step key={idx} completed={(selections.get(q.id)?.size ?? 0) > 0}>
                                <StepLabel />
                            </Step>
                        ))}
                    </Stepper>
                </Box>

                {/* Question card */}
                {currentQ && (
                    <QuizQuestionCard
                        question={currentQ}
                        selectedIds={selectedIds}
                        onSingleSelect={handleSingleSelect}
                        onMultiSelect={handleMultiSelect}
                    />
                )}

                {/* Navigation */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Button
                        variant="outlined"
                        startIcon={<PrevIcon />}
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        sx={{ borderRadius: 5, px: 3 }}
                    >
                        Trước
                    </Button>

                    {isLastQuestion ? (
                        <Button
                            variant="contained"
                            endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SparkleIcon />}
                            onClick={handleSubmit}
                            disabled={!allAnswered || submitting}
                            sx={{ borderRadius: 5, px: 4, fontWeight: "bold" }}
                        >
                            {submitting ? "Đang phân tích..." : "Nhận gợi ý từ AI"}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            endIcon={<NextIcon />}
                            onClick={handleNext}
                            disabled={!canNext}
                            sx={{ borderRadius: 5, px: 4, fontWeight: "bold" }}
                        >
                            Tiếp theo
                        </Button>
                    )}
                </Box>

                {isLastQuestion && !allAnswered && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 1.5 }}>
                        Vui lòng trả lời tất cả các câu hỏi trước khi nhận gợi ý.
                    </Typography>
                )}
            </Container>
        </>
    );
}
