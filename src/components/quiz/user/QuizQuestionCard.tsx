import {
    Box,
    Checkbox,
    Chip,
    FormControlLabel,
    Paper,
    Radio,
    RadioGroup,
    Typography,
} from "@mui/material";
import type { QuizQuestion } from "@/types/quiz";
import { QuestionType } from "@/types/quiz";

interface Props {
    question: QuizQuestion;
    selectedIds: Set<string>;
    onSingleSelect: (questionId: string, answerId: string) => void;
    onMultiSelect: (questionId: string, answerId: string, checked: boolean) => void;
}

export default function QuizQuestionCard({
    question,
    selectedIds,
    onSingleSelect,
    onMultiSelect,
}: Props) {
    const isMultiple = question.questionType === QuestionType.MULTIPLE;

    return (
        <Paper
            elevation={0}
            sx={{ p: 4, border: "1px solid", borderColor: "divider", borderRadius: 4, mb: 3 }}
        >
            {/* Type badge */}
            <Box sx={{ mb: 2 }}>
                <Chip
                    label={isMultiple ? "Chọn nhiều đáp án" : "Chọn một đáp án"}
                    size="small"
                    color={isMultiple ? "secondary" : "primary"}
                    variant="outlined"
                />
            </Box>

            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, lineHeight: 1.5 }}>
                {question.question}
            </Typography>

            {/* Single choice */}
            {!isMultiple && (
                <RadioGroup
                    value={selectedIds.size > 0 ? [...selectedIds][0] : ""}
                    onChange={(e) => onSingleSelect(question.id, e.target.value)}
                >
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {question.answers.map((ans) => {
                            const selected = selectedIds.has(ans.id);
                            return (
                                <Paper
                                    key={ans.id}
                                    elevation={0}
                                    onClick={() => onSingleSelect(question.id, ans.id)}
                                    sx={{
                                        px: 2, py: 1.5,
                                        border: "2px solid",
                                        borderColor: selected ? "primary.main" : "divider",
                                        borderRadius: 2,
                                        cursor: "pointer",
                                        bgcolor: selected ? "primary.50" : "background.paper",
                                        transition: "all 0.15s",
                                        "&:hover": { borderColor: "primary.light", bgcolor: "primary.50" },
                                    }}
                                >
                                    <FormControlLabel
                                        value={ans.id}
                                        control={<Radio size="small" sx={{ pointerEvents: "none" }} />}
                                        label={<Typography variant="body1">{ans.answer}</Typography>}
                                        sx={{ m: 0, width: "100%", pointerEvents: "none" }}
                                    />
                                </Paper>
                            );
                        })}
                    </Box>
                </RadioGroup>
            )}

            {/* Multiple choice */}
            {isMultiple && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {question.answers.map((ans) => {
                        const selected = selectedIds.has(ans.id);
                        return (
                            <Paper
                                key={ans.id}
                                elevation={0}
                                onClick={() => onMultiSelect(question.id, ans.id, !selected)}
                                sx={{
                                    px: 2, py: 1.5,
                                    border: "2px solid",
                                    borderColor: selected ? "secondary.main" : "divider",
                                    borderRadius: 2,
                                    cursor: "pointer",
                                    bgcolor: selected ? "secondary.50" : "background.paper",
                                    transition: "all 0.15s",
                                    "&:hover": { borderColor: "secondary.light", bgcolor: "secondary.50" },
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={selected}
                                            size="small"
                                            color="secondary"
                                            sx={{ pointerEvents: "none" }}
                                        />
                                    }
                                    label={<Typography variant="body1">{ans.answer}</Typography>}
                                    sx={{ m: 0, width: "100%", pointerEvents: "none" }}
                                />
                            </Paper>
                        );
                    })}
                </Box>
            )}
        </Paper>
    );
}
