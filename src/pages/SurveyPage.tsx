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
import { surveyService } from "@/services/ai/surveyService";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import { getOrCreateGuestUserId } from "@/utils/guestUserId";
import type { SurveyQuestion, SurveyQuesAnsDetailRequest } from "@/types/survey";
import type { AssistantPayload } from "@/types/chatbot";
import { Header } from "@/components/layout/Header";
import SurveyQuestionCard from "@/components/survey/user/SurveyQuestionCard";
import SurveyResultView from "@/components/survey/user/SurveyResultView";
import { dexieCache } from "@/utils/dexieCache";
import { CACHE_KEYS, CACHE_TTL } from "@/constants/cache";

interface CachedSurveyResult {
    result: AssistantPayload | null;
    selections: Array<{ questionId: string; answerIds: string[] }>;
    currentStep: number;
}

const serializeSelections = (source: Map<string, Set<string>>) =>
    Array.from(source.entries()).map(([questionId, answerIds]) => ({
        questionId,
        answerIds: Array.from(answerIds),
    }));

const deserializeSelections = (
    source?: Array<{ questionId: string; answerIds: string[] }>,
) => {
    const restored = new Map<string, Set<string>>();
    if (!source?.length) {
        return restored;
    }

    source.forEach(({ questionId, answerIds }) => {
        restored.set(questionId, new Set(answerIds));
    });

    return restored;
};

// ── Parse AI response string ────────────────────────────────────
function parseAiResponse(raw: string): AssistantPayload {
    try {
        const parsed = JSON.parse(raw);
        return {
            message: parsed.message || "",
            products: parsed.products || [],
            suggestedQuestions: parsed.suggestedQuestions || [],
        };
    } catch {
        return { message: raw, products: [], suggestedQuestions: [] };
    }
}

// ── Page ────────────────────────────────────────────────────────
export default function SurveyPage() {
    const authCtx = useContext(AuthContext);
    const userId = authCtx?.user?.id ?? getOrCreateGuestUserId();

    const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selections, setSelections] = useState<Map<string, Set<string>>>(new Map());
    const [currentStep, setCurrentStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<AssistantPayload | null>(null);
    const [lastResult, setLastResult] = useState<AssistantPayload | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const surveyResultCacheKey = `${CACHE_KEYS.SURVEY_RESULT}_${userId}`;

    // ── Fetch ─────────────────────────────────────────────────────
    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await surveyService.getQuestions();
            setQuestions([...res.data].reverse());
        } catch {
            // show empty state
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

    useEffect(() => {
        let isMounted = true;

        const restoreSurveyResult = async () => {
            const cached = await dexieCache.get<CachedSurveyResult>(surveyResultCacheKey);
            if (!isMounted) {
                return;
            }

            if (!cached) {
                setHydrated(true);
                return;
            }

            const restoredSelections = deserializeSelections(cached.selections);
            if (restoredSelections.size > 0) {
                setSelections(restoredSelections);
            }

            if (typeof cached.currentStep === "number" && cached.currentStep >= 0) {
                setCurrentStep(cached.currentStep);
            }

            if (cached.result) {
                setLastResult(cached.result);
                setResult(cached.result);
            }

            setHydrated(true);
        };

        void restoreSurveyResult();

        return () => {
            isMounted = false;
        };
    }, [surveyResultCacheKey]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        const payload: CachedSurveyResult = {
            result: lastResult,
            selections: serializeSelections(selections),
            currentStep,
        };

        void dexieCache.set<CachedSurveyResult>(
            surveyResultCacheKey,
            payload,
            CACHE_TTL.ONE_DAY,
        );
    }, [currentStep, hydrated, lastResult, surveyResultCacheKey, selections]);

    useEffect(() => {
        if (!questions.length) {
            return;
        }

        setCurrentStep((prev) => Math.min(prev, questions.length - 1));
    }, [questions.length]);

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
        const payload: SurveyQuesAnsDetailRequest[] = [];
        for (const [questionId, answerIds] of selections.entries()) {
            for (const answerId of answerIds) {
                payload.push({ questionId, answerId });
            }
        }
        setSubmitting(true);
        try {
            const res = await surveyService.submitSurveyV2(userId, payload);
            const parsedRes = parseAiResponse(res.data);
            setResult(parsedRes);
            setLastResult(parsedRes);
            await dexieCache.set<CachedSurveyResult>(
                surveyResultCacheKey,
                {
                    result: parsedRes,
                    selections: serializeSelections(selections),
                    currentStep,
                },
                CACHE_TTL.ONE_DAY,
            );
        } catch (err) {
            console.error("Survey submit error:", err);
            const fallbackResult: AssistantPayload = {
                message: "Đã xảy ra lỗi khi lấy gợi ý. Vui lòng thử lại.",
                products: [],
                suggestedQuestions: [],
            };
            setResult(fallbackResult);
            setLastResult(fallbackResult);
            await dexieCache.set<CachedSurveyResult>(
                surveyResultCacheKey,
                {
                    result: fallbackResult,
                    selections: serializeSelections(selections),
                    currentStep,
                },
                CACHE_TTL.ONE_DAY,
            );
        } finally {
            setSubmitting(false);
        }
    }, [userId, selections, currentStep, surveyResultCacheKey]);

    const handleReviewAnswers = useCallback(() => {
        setResult(null);
        setCurrentStep(0);
    }, []);

    const handleReanalyze = useCallback(async () => {
        await handleSubmit();
    }, [handleSubmit]);

    const handleViewLastResult = useCallback(() => {
        if (lastResult) {
            setResult(lastResult);
        }
    }, [lastResult]);

    const handleRestart = useCallback(() => {
        setSelections(new Map());
        setCurrentStep(0);
        setResult(null);
        setLastResult(null);
        void dexieCache.delete(surveyResultCacheKey);
    }, [surveyResultCacheKey]);

    // ── Loading ───────────────────────────────────────────────────
    if (loading && !result) {
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
                        Hiện chưa có câu hỏi survey. Vui lòng quay lại sau!
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
                    <SurveyResultView
                        result={result}
                        userId={userId}
                        onReviewAnswers={handleReviewAnswers}
                        onReanalyze={handleReanalyze}
                        onRestart={handleRestart}
                        isSubmitting={submitting}
                    />
                </Container>
            </>
        );
    }

    // ── Survey ──────────────────────────────────────────────────────
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
                    {lastResult && (
                        <Button
                            variant="text"
                            size="small"
                            onClick={handleViewLastResult}
                            sx={{ mt: 1.25, textTransform: "none" }}
                        >
                            Xem lại kết quả survey gần nhất
                        </Button>
                    )}
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
                    <SurveyQuestionCard
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
