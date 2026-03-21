import {
    Box,
    Button,
    Chip,
    Divider,
    Typography,
} from "@mui/material";
import {
    AutoAwesome as SparkleIcon,
    CheckCircle as CheckIcon,
    Refresh as RestartIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AssistantPayload } from "@/types/chatbot";
import QuizProductCard from "./QuizProductCard";

interface Props {
    result: AssistantPayload;
    userId: string;
    onRestart: () => void;
}

export default function QuizResultView({ result, userId, onRestart }: Props) {
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
                            <QuizProductCard key={p.id} product={p} userId={userId} />
                        ))}
                    </Box>
                </>
            )}

            {/* Restart */}
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
                <Button
                    variant="outlined"
                    startIcon={<RestartIcon />}
                    onClick={onRestart}
                    sx={{ borderRadius: 5, px: 4 }}
                >
                    Làm lại quiz
                </Button>
            </Box>
        </Box>
    );
}
