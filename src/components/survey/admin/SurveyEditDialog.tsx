import { useState, useEffect, useCallback } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    DialogTitle as ConfirmDialogTitle,
    Divider,
    IconButton,
    Select,
    MenuItem,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import {
    AddCircleOutline as AddAnswerIcon,
    Close as CloseIcon,
    DataObject as QueryIcon,
    Edit as EditIcon,
    RemoveCircleOutline as RemoveAnswerIcon,
    Save as SaveIcon,
    SwapHoriz as SwitchModeIcon,
    AttachMoney as BudgetIcon,
} from "@mui/icons-material";
import { QuestionType, tryParseQueryAnswer } from "@/types/survey";
import type { SurveyQuestion, SurveyAttributeTypeInfo, SurveyAttributeValueItem, SurveyAttributeType } from "@/types/survey";
import { surveyService } from "@/services/ai/surveyService";

type AnswerMode = "manual" | "attribute";

interface ParsedAnswer {
    raw: string;
    displayText: string;
    queryFragment: Record<string, unknown> | null;
    mode: AnswerMode;
    attributeType: SurveyAttributeType | "";
    selectedSubGroup: string;
    availableSubGroups: string[];
    availableValues: SurveyAttributeValueItem[];
    selectedValues: Set<string>;
    budgetMin?: number;
    budgetMax?: number;
}

interface SubmitPayload {
    question: string;
    questionType: QuestionType;
    budgetMode?: boolean;
    answers: { answer: string }[];
}

interface Props {
    open: boolean;
    isSaving: boolean;
    initialData: SurveyQuestion | null;
    onClose: () => void;
    onSubmit: (payload: SubmitPayload) => void;
}

function formatBudgetLabel(min?: number, max?: number): string {
    const fmt = (v: number) => v.toLocaleString("vi-VN") + "đ";
    if (min !== undefined && max !== undefined) return `${fmt(min)} - ${fmt(max)}`;
    if (min !== undefined) return `Trên ${fmt(min)}`;
    if (max !== undefined) return `Dưới ${fmt(max)}`;
    return "";
}

function createEmptyAnswer(mode: AnswerMode = "manual"): ParsedAnswer {
    return {
        raw: "",
        displayText: "",
        queryFragment: null,
        mode,
        attributeType: "",
        selectedSubGroup: "",
        availableSubGroups: [],
        availableValues: [],
        selectedValues: new Set(),
        budgetMin: undefined,
        budgetMax: undefined,
    };
}

function createEmptyBudgetRow(): ParsedAnswer {
    return {
        raw: "",
        displayText: "",
        queryFragment: null,
        mode: "manual",
        attributeType: "",
        selectedSubGroup: "",
        availableSubGroups: [],
        availableValues: [],
        selectedValues: new Set(),
        budgetMin: undefined,
        budgetMax: undefined,
    };
}

export default function SurveyEditDialog({ open, isSaving, initialData, onClose, onSubmit }: Props) {
    const [question, setQuestion] = useState("");
    const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.SINGLE);
    const [budgetMode, setBudgetMode] = useState(false);
    const [parsedAnswers, setParsedAnswers] = useState<ParsedAnswer[]>([]);

    const [attributeTypes, setAttributeTypes] = useState<SurveyAttributeTypeInfo[]>([]);
    const [loadingAttr, setLoadingAttr] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

    useEffect(() => {
        if (open && initialData) {
            setQuestion(initialData.question);
            setQuestionType(initialData.questionType);
            const parsed: ParsedAnswer[] = initialData.answers.map((a) => {
                const queryData = tryParseQueryAnswer(a.answer);
                if (queryData) {
                    const attrType = (queryData.queryFragment?.type as SurveyAttributeType) || "";
                    const isBudget = attrType === "budget";
                    if (isBudget) {
                        return {
                            raw: a.answer,
                            displayText: queryData.displayText,
                            queryFragment: queryData.queryFragment as unknown as Record<string, unknown>,
                            mode: "manual" as AnswerMode,
                            attributeType: "" as SurveyAttributeType | "",
                            selectedSubGroup: "",
                            availableSubGroups: [] as string[],
                            availableValues: [] as SurveyAttributeValueItem[],
                            selectedValues: new Set<string>(),
                            budgetMin: queryData.queryFragment?.min as number | undefined,
                            budgetMax: queryData.queryFragment?.max as number | undefined,
                        };
                    }
                    return {
                        raw: a.answer,
                        displayText: queryData.displayText,
                        queryFragment: queryData.queryFragment as unknown as Record<string, unknown>,
                        mode: "attribute" as AnswerMode,
                        attributeType: attrType,
                        selectedSubGroup: (queryData.queryFragment?.attributeName as string) || "",
                        availableSubGroups: [] as string[],
                        availableValues: [] as SurveyAttributeValueItem[],
                        selectedValues: new Set([queryData.displayText]),
                        budgetMin: undefined,
                        budgetMax: undefined,
                    };
                }
                return {
                    raw: a.answer,
                    displayText: a.answer,
                    queryFragment: null as Record<string, unknown> | null,
                    mode: "manual" as AnswerMode,
                    attributeType: "" as SurveyAttributeType | "",
                    selectedSubGroup: "",
                    availableSubGroups: [] as string[],
                    availableValues: [] as SurveyAttributeValueItem[],
                    selectedValues: new Set<string>(),
                    budgetMin: undefined,
                    budgetMax: undefined,
                };
            });

            const isBudgetQuestion = parsed.length > 0 && parsed.every((p) => p.budgetMin !== undefined || p.budgetMax !== undefined);
            setBudgetMode(isBudgetQuestion);
            setParsedAnswers(parsed);

            for (let i = 0; i < parsed.length; i++) {
                const p = parsed[i]!;
                if (p.queryFragment && p.mode === "attribute" && p.attributeType) {
                    surveyService.getAttributeValues(p.attributeType).then((res) => {
                        const values = res.data.values || [];
                        const subGroups = res.data.subGroups || [];
                        setParsedAnswers((prev) => prev.map((a, j) => {
                            if (j !== i) return a;
                            if (subGroups.length > 0 && subGroups[0]) {
                                const firstGroup = subGroups[0];
                                return {
                                    ...a,
                                    availableSubGroups: subGroups.map((g) => g.attributeName),
                                    availableValues: firstGroup.values,
                                    selectedSubGroup: a.selectedSubGroup || firstGroup.attributeName,
                                };
                            }
                            return { ...a, availableSubGroups: [], availableValues: values };
                        }));
                    }).catch(console.error);
                }
            }
        }
    }, [open, initialData]);

    useEffect(() => {
        if (open) {
            surveyService.getAttributeTypes().then((res) => setAttributeTypes(res.data)).catch(console.error);
        }
    }, [open]);

    const showConfirmDialog = (callback: () => void) => {
        setConfirmCallback(() => callback);
        setConfirmOpen(true);
    };

    const handleConfirmClose = (confirmed: boolean) => {
        setConfirmOpen(false);
        if (confirmed && confirmCallback) {
            confirmCallback();
        }
        setConfirmCallback(null);
    };

    const handleAttributeTypeChange = useCallback(async (index: number, type: string) => {
        setParsedAnswers((prev) => prev.map((a, i) => i === index ? {
            ...a,
            attributeType: type as SurveyAttributeType,
            selectedSubGroup: "",
            availableSubGroups: [],
            availableValues: [],
            selectedValues: new Set(),
        } : a));

        if (!type) return;
        setLoadingAttr(true);
        try {
            const res = await surveyService.getAttributeValues(type);
            const values = res.data.values || [];
            const subGroups = res.data.subGroups || [];

            setParsedAnswers((prev) => prev.map((a, i) => {
                if (i !== index) return a;
                if (subGroups.length > 0 && subGroups[0]) {
                    const firstGroup = subGroups[0];
                    return {
                        ...a,
                        availableSubGroups: subGroups.map((g) => g.attributeName),
                        availableValues: firstGroup.values,
                        selectedSubGroup: firstGroup.attributeName,
                    };
                }
                return { ...a, availableSubGroups: [], availableValues: values };
            }));
        } catch (err) {
            console.error("Failed to fetch attribute values:", err);
        } finally {
            setLoadingAttr(false);
        }
    }, []);

    const handleSubGroupChange = useCallback(async (index: number, subGroupName: string) => {
        const ans = parsedAnswers[index];
        if (!ans?.attributeType) return;

        setParsedAnswers((prev) => prev.map((a, i) => i === index ? { ...a, selectedSubGroup: subGroupName, selectedValues: new Set<string>() } : a));

        setLoadingAttr(true);
        try {
            const res = await surveyService.getAttributeValues(ans.attributeType);
            const group = res.data.subGroups?.find((g) => g.attributeName === subGroupName);
            setParsedAnswers((prev) => prev.map((a, i) => i === index ? { ...a, availableValues: group?.values || [] } : a));
        } catch (err) {
            console.error("Failed to fetch sub-group values:", err);
        } finally {
            setLoadingAttr(false);
        }
    }, [parsedAnswers]);

    const handleBudgetModeToggle = (enabled: boolean) => {
        const hasData = budgetMode
            ? parsedAnswers.some((a) => a.budgetMin !== undefined || a.budgetMax !== undefined)
            : parsedAnswers.some((a) => a.mode === "manual" ? (a.raw.trim() || a.displayText.trim()) : a.selectedValues.size > 0);

        const applyToggle = () => {
            setBudgetMode(enabled);
            if (enabled) {
                setParsedAnswers(parsedAnswers.map(() => createEmptyBudgetRow()));
            } else {
                setParsedAnswers([createEmptyAnswer("manual"), createEmptyAnswer("manual")]);
            }
        };

        if (hasData) {
            showConfirmDialog(applyToggle);
        } else {
            applyToggle();
        }
    };

    const handleSwitchToManual = (index: number) => {
        const ans = parsedAnswers[index];
        if (!ans) return;
        if (ans.queryFragment) {
            showConfirmDialog(() => {
                setParsedAnswers((prev) => prev.map((a, i) => i === index ? {
                    ...a,
                    mode: "manual" as AnswerMode,
                    queryFragment: null,
                    raw: ans.displayText,
                    attributeType: "",
                    availableSubGroups: [],
                    availableValues: [],
                    selectedValues: new Set(),
                } : a));
            });
        } else {
            setParsedAnswers((prev) => prev.map((a, i) => i === index ? { ...a, mode: "manual" as AnswerMode } : a));
        }
    };

    const handleSwitchToAttribute = (index: number) => {
        setParsedAnswers((prev) => prev.map((a, i) => i === index ? { ...a, mode: "attribute" as AnswerMode, attributeType: "", availableSubGroups: [], availableValues: [], selectedValues: new Set() } : a));
    };

    const updateParsedAnswer = (index: number, field: "displayText" | "raw", value: string) => {
        setParsedAnswers((prev) => prev.map((a, i) => {
            if (i !== index) return a;
            const answer = { ...a };
            if (field === "displayText") {
                answer.displayText = value;
                if (answer.queryFragment) {
                    answer.raw = JSON.stringify({ displayText: value, queryFragment: answer.queryFragment });
                } else {
                    answer.raw = value;
                }
            } else {
                answer.raw = value;
                answer.displayText = value;
                answer.queryFragment = null;
            }
            return answer;
        }));
    };

    const handleAddAnswer = () => {
        if (budgetMode) {
            setParsedAnswers((prev) => [...prev, createEmptyBudgetRow()]);
        } else {
            setParsedAnswers((prev) => [...prev, createEmptyAnswer("manual")]);
        }
    };

    const handleRemoveAnswer = (index: number) => {
        setParsedAnswers((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
    };

    const toggleValueSelection = (index: number, displayText: string) => {
        setParsedAnswers((prev) => prev.map((a, i) => {
            if (i !== index) return a;
            const sv = new Set(a.selectedValues);
            if (sv.has(displayText)) sv.delete(displayText);
            else sv.add(displayText);
            return { ...a, selectedValues: sv };
        }));
    };

    const selectAllValues = (index: number) => {
        setParsedAnswers((prev) => prev.map((a, i) => i === index ? { ...a, selectedValues: new Set(a.availableValues.map((v) => v.displayText)) } : a));
    };

    const deselectAllValues = (index: number) => {
        setParsedAnswers((prev) => prev.map((a, i) => i === index ? { ...a, selectedValues: new Set() } : a));
    };

    const handleSubmit = () => {
        let answers: { answer: string }[] = [];

        if (budgetMode) {
            answers = parsedAnswers
                .filter((a) => a.budgetMin !== undefined || a.budgetMax !== undefined)
                .map((a) => ({
                    answer: JSON.stringify({
                        displayText: formatBudgetLabel(a.budgetMin, a.budgetMax),
                        queryFragment: { type: "budget", min: a.budgetMin, max: a.budgetMax },
                    }),
                }));
        } else {
            answers = parsedAnswers.flatMap((a) => {
                if (a.mode === "manual") {
                    const text = a.raw.trim() || a.displayText.trim();
                    return text ? [{ answer: text }] : [];
                }
                const selectedItems = a.availableValues.filter((v) => a.selectedValues.has(v.displayText));
                return selectedItems.map((v) => ({
                    answer: JSON.stringify({ displayText: v.displayText, queryFragment: v.queryFragment }),
                }));
            });
        }

        onSubmit({ question: question.trim(), questionType, answers });
    };

    const isInvalid = (() => {
        if (!question.trim()) return true;
        if (budgetMode) {
            const validCount = parsedAnswers.filter((a) => a.budgetMin !== undefined || a.budgetMax !== undefined).length;
            return validCount < 2;
        }
        const validCount = parsedAnswers.reduce((count, a) => {
            if (a.mode === "manual") return count + (a.raw.trim() || a.displayText.trim() ? 1 : 0);
            return count + a.selectedValues.size;
        }, 0);
        return validCount < 2;
    })();

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid", borderColor: "divider", pb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <EditIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">Chỉnh sửa câu hỏi</Typography>
                    </Box>
                    <IconButton onClick={onClose} disabled={isSaving} size="small"><CloseIcon /></IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>Loại câu hỏi</Typography>
                    <ToggleButtonGroup value={questionType} exclusive onChange={(_, v) => { if (v) setQuestionType(v); }} size="small" sx={{ mb: 2.5 }} disabled={isSaving}>
                        <ToggleButton value={QuestionType.SINGLE}>Một đáp án (single)</ToggleButton>
                        <ToggleButton value={QuestionType.MULTIPLE}>Nhiều đáp án (multiple)</ToggleButton>
                    </ToggleButtonGroup>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: "bold", mb: 0 }}>Chế độ trả lời</Typography>
                        <ToggleButtonGroup value={budgetMode} exclusive onChange={(_, v) => { if (v !== null) handleBudgetModeToggle(v); }} size="small" disabled={isSaving}>
                            <ToggleButton value={false}>Thuộc tính</ToggleButton>
                            <ToggleButton value={true} color="success"><BudgetIcon sx={{ fontSize: 16, mr: 0.5 }} />Ngân sách</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>Nội dung câu hỏi *</Typography>
                    <TextField fullWidth multiline minRows={2} variant="outlined" placeholder="Nhập câu hỏi..." value={question} onChange={(e) => setQuestion(e.target.value)} disabled={isSaving} sx={{ mb: 3 }} />

                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">Danh sách câu trả lời * (tối thiểu 2)</Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <Button size="small" startIcon={<AddAnswerIcon />} onClick={handleAddAnswer} disabled={isSaving}>Thêm đáp án</Button>
                        </Box>
                    </Box>

                    {budgetMode ? (
                        parsedAnswers.map((ans, idx) => {
                            const autoLabel = formatBudgetLabel(ans.budgetMin, ans.budgetMax);
                            return (
                                <Box key={idx} sx={{ mb: 2, p: 1.5, border: "1px solid", borderColor: "success.light", borderRadius: 1.5, bgcolor: "success.50" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                        <Chip label={idx + 1} size="small" color="success" variant="outlined" sx={{ minWidth: 32, fontWeight: "bold" }} />
                                        <Chip label="Ngân sách" size="small" color="success" variant="outlined" sx={{ height: 22, fontSize: "0.7rem" }} />
                                        {autoLabel && <Chip label={autoLabel} size="small" color="success" variant="filled" sx={{ fontSize: "0.7rem" }} />}
                                        <Box sx={{ flexGrow: 1 }} />
                                        <IconButton size="small" color="error" onClick={() => handleRemoveAnswer(idx)} disabled={parsedAnswers.length <= 2 || isSaving}><RemoveAnswerIcon /></IconButton>
                                    </Box>
                                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                        <TextField size="small" type="number" label="Từ (VND)" value={ans.budgetMin ?? ""} onChange={(e) => {
                                            const val = e.target.value ? Number(e.target.value) : undefined;
                                            setParsedAnswers((prev) => prev.map((a, i) => i !== idx ? a : { ...a, budgetMin: val }));
                                        }} sx={{ flex: 1 }} disabled={isSaving} />
                                        <Typography color="text.secondary">—</Typography>
                                        <TextField size="small" type="number" label="Đến (VND)" value={ans.budgetMax ?? ""} onChange={(e) => {
                                            const val = e.target.value ? Number(e.target.value) : undefined;
                                            setParsedAnswers((prev) => prev.map((a, i) => i !== idx ? a : { ...a, budgetMax: val }));
                                        }} sx={{ flex: 1 }} disabled={isSaving} />
                                    </Box>
                                </Box>
                            );
                        })
                    ) : (
                        parsedAnswers.map((ans, idx) => {
                            const isQuery = ans.queryFragment !== null;

                            return (
                                <Box key={idx} sx={{ mb: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                        <Chip label={idx + 1} size="small" color="primary" variant="outlined" sx={{ minWidth: 32, fontWeight: "bold" }} />
                                        {ans.mode === "manual" ? (
                                            <Button size="small" variant="outlined" startIcon={<QueryIcon sx={{ fontSize: 16 }} />} onClick={() => handleSwitchToAttribute(idx)} disabled={isSaving} sx={{ textTransform: "none", fontSize: "0.75rem" }}>Thuộc tính</Button>
                                        ) : (
                                            <Button size="small" variant="outlined" color="warning" startIcon={<SwitchModeIcon sx={{ fontSize: 16 }} />} onClick={() => handleSwitchToManual(idx)} disabled={isSaving} sx={{ textTransform: "none", fontSize: "0.75rem" }}>Thủ công</Button>
                                        )}
                                        {ans.mode === "attribute" && <Chip label="Query" size="small" color="info" variant="outlined" sx={{ height: 22, fontSize: "0.7rem" }} />}
                                        <Box sx={{ flexGrow: 1 }} />
                                        <IconButton size="small" color="error" onClick={() => handleRemoveAnswer(idx)} disabled={parsedAnswers.length <= 2 || isSaving}><RemoveAnswerIcon /></IconButton>
                                    </Box>

                                    {ans.mode === "manual" ? (
                                        <TextField
                                            fullWidth size="small" placeholder={`Đáp án ${idx + 1}...`}
                                            value={isQuery ? ans.displayText : ans.raw}
                                            onChange={(e) => { if (!isQuery) updateParsedAnswer(idx, "raw", e.target.value); }}
                                            disabled={isSaving || isQuery}
                                            InputProps={{
                                                endAdornment: isQuery ? (
                                                    <Button size="small" variant="text" color="warning" onClick={() => handleSwitchToManual(idx)} sx={{ textTransform: "none", fontSize: "0.7rem", whiteSpace: "nowrap" }}>Sửa text</Button>
                                                ) : undefined,
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>Loại thuộc tính</Typography>
                                            <Select fullWidth size="small" value={ans.attributeType} onChange={(e) => handleAttributeTypeChange(idx, e.target.value)} displayEmpty disabled={isSaving} sx={{ mb: 1.5 }}>
                                                <MenuItem value="" disabled>-- Chọn thuộc tính --</MenuItem>
                                                {attributeTypes.filter((at) => at.type !== "budget").map((at) => (
                                                    <MenuItem key={at.type} value={at.type}>{at.label} — {at.description}</MenuItem>
                                                ))}
                                            </Select>

                                            {(attributeTypes.find((a) => a.type === ans.attributeType)?.type === "attribute") && (
                                                <>
                                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>Nhóm thuộc tính</Typography>
                                                    <Select fullWidth size="small" value={ans.selectedSubGroup} onChange={(e) => handleSubGroupChange(idx, e.target.value)} displayEmpty disabled={isSaving || loadingAttr} sx={{ mb: 1.5 }}>
                                                        <MenuItem value="" disabled>-- Chọn nhóm --</MenuItem>
                                                        {ans.availableSubGroups.map((name) => (<MenuItem key={name} value={name}>{name}</MenuItem>))}
                                                    </Select>
                                                </>
                                            )}

                                            {ans.availableValues.length > 0 && (
                                                <>
                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                                                        <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ fontSize: "0.75rem" }}>
                                                            Chọn giá trị ({ans.selectedValues.size}/{ans.availableValues.length})
                                                        </Typography>
                                                        <Box>
                                                            <Button size="small" onClick={() => selectAllValues(idx)} sx={{ mr: 0.5, fontSize: "0.7rem" }}>Chọn tất cả</Button>
                                                            <Button size="small" onClick={() => deselectAllValues(idx)} sx={{ fontSize: "0.7rem" }}>Bỏ chọn</Button>
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxHeight: 200, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
                                                        {ans.availableValues.map((val) => (
                                                            <Chip key={val.displayText} label={val.displayText} onClick={() => toggleValueSelection(idx, val.displayText)} color={ans.selectedValues.has(val.displayText) ? "primary" : "default"} variant={ans.selectedValues.has(val.displayText) ? "filled" : "outlined"} sx={{ cursor: "pointer", fontSize: "0.8rem" }} />
                                                        ))}
                                                    </Box>
                                                </>
                                            )}

                                            {loadingAttr ? (<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={20} /></Box>) : null}
                                        </>
                                    )}
                                </Box>
                            );
                        })
                    )}

                    {isInvalid && <Alert severity="warning" sx={{ mt: 1 }}>Cần ít nhất 2 đáp án hợp lệ{budgetMode ? " (khoảng ngân sách)" : ""}</Alert>}
                </DialogContent>

                <DialogActions sx={{ p: 3, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                    <Button onClick={onClose} color="inherit" disabled={isSaving} sx={{ px: 3, borderRadius: 2 }}>Hủy</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary" disabled={isSaving || isInvalid} startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} sx={{ px: 4, borderRadius: 2, fontWeight: "bold" }}>
                        {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmOpen} onClose={() => handleConfirmClose(false)} maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
                <ConfirmDialogTitle sx={{ fontWeight: "bold" }}>Xác nhận chuyển đổi</ConfirmDialogTitle>
                <DialogContent>
                    <DialogContentText>Chuyển chế độ sẽ đặt lại tất cả đáp án đang nhập. Bạn có muốn tiếp tục?</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => handleConfirmClose(false)} color="inherit">Hủy</Button>
                    <Button onClick={() => handleConfirmClose(true)} variant="contained" color="warning">Xác nhận chuyển</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}