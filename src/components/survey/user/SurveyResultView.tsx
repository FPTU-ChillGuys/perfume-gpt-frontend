import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Typography,
} from "@mui/material";
import {
    AutoAwesome as SparkleIcon,
    CheckCircle as CheckIcon,
    RestartAlt as ResetIcon,
    Refresh as RestartIcon,
    Visibility as ReviewIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AssistantPayload } from "@/types/chatbot";
import SurveyProductCard from "./SurveyProductCard";

interface Props {
    result: AssistantPayload;
    userId: string;
    onReviewAnswers: () => void;
    onReanalyze: () => void;
    onRestart: () => void;
    isSubmitting?: boolean;
}

export default function SurveyResultView({ result, userId, onReviewAnswers, onReanalyze, onRestart, isSubmitting }: Props) {
    return (
        <Box>
            {/* Header */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
                <CheckIcon sx={{ fontSize: 56, color: "success.main", mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Gợi ý nước hoa cho bạn
                </Typography>
                <Box
                    sx={{
                        maxWidth: 680,
                        mx: "auto",
                        color: "text.secondary",
                        lineHeight: 1.7,
                        textAlign: "left",
                        "& p": { my: 0, mb: 1.25 },
                        "& p:last-child": { mb: 0 },
                        "& ul, & ol": { my: 0, mb: 1.25, pl: 3 },
                        "& li": { mb: 0.5 },
                        "& strong": { color: "text.primary" },
                        "& table": {
                            width: "100%",
                            borderCollapse: "collapse",
                            my: 1.5,
                            backgroundColor: "background.paper",
                        },
                        "& th, & td": {
                            border: "1px solid",
                            borderColor: "divider",
                            px: 1.25,
                            py: 0.85,
                            textAlign: "left",
                            verticalAlign: "top",
                        },
                        "& th": { fontWeight: 700 },
                    }}
                >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.message}
                    </ReactMarkdown>
                </Box>
            </Box>

            {/* Product list */}
            {result.products.length > 0 && (
                <>
                    <Divider sx={{ mb: 3 }}>
                        <Chip
                            icon={<SparkleIcon />}
                            label={`${result.products.length} sản phẩm phù hợp`}
                            color="primary"
                        />
                    </Divider>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {result.products.map((p) => (
                            <SurveyProductCard key={p.id} product={p} userId={userId} />
                        ))}
                    </Box>
                </>
            )}

            {/* Restart */}
            <Box
                sx={{
                    mt: 4,
                    display: "flex",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    gap: 1.25,
                }}
            >
                <Button
                    variant="outlined"
                    startIcon={<ReviewIcon />}
                    onClick={onReviewAnswers}
                    sx={{ borderRadius: 5, px: 3 }}
                >
                    Xem lại đáp án
                </Button>

                <Button
                    variant="outlined"
                    color="warning"
                    startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <ResetIcon />}
                    onClick={onReanalyze}
                    disabled={isSubmitting}
                    sx={{ borderRadius: 5, px: 3 }}
                >
                    {isSubmitting ? "Đang phân tích..." : "Reset đáp án"}
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<RestartIcon />}
                    onClick={onRestart}
                    sx={{ borderRadius: 5, px: 3 }}
                >
                    Làm lại survey
                </Button>
            </Box>
        </Box>
    );
}
