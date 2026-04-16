import { useState, useEffect, useCallback } from "react";
import { v4 as uuid } from "uuid";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    MenuItem,
    Paper,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import {
    Add as AddIcon,
    AddCircleOutline as AddAnswerIcon,
    Close as CloseIcon,
    Quiz as SurveyIcon,
    RemoveCircleOutline as RemoveAnswerIcon,
    DeleteOutline as DeleteIcon,
    DataObject as QueryIcon,
} from "@mui/icons-material";
import { QuestionType, getAnswerDisplayText } from "@/types/survey";
import type { SurveyQuestionRequest, SurveyAttributeTypeInfo, SurveyAttributeValueItem } from "@/types/survey";
import { surveyService } from "@/services/ai/surveyService";

type AnswerMode = "manual" | "attribute";

interface Props {
    open: boolean;
    isCreating: boolean;
    onClose: () => void;
    onSubmit: (payload: SurveyQuestionRequest[]) => void;
}

interface QuestionForm {
    id: string; // for React key
    question: string;
    questionType: QuestionType;
    answerMode: AnswerMode;
    // Manual mode
    answers: string[];
    // Attribute mode
    selectedAttributeType: string;
    selectedSubGroup: string;
    availableSubGroups: string[]; // Thêm field này để lưu danh sách các nhóm
    availableValues: SurveyAttributeValueItem[];
    selectedValues: Set<string>;
    // Budget mode
    budgetRanges: { label: string; min?: number; max?: number }[];
}

export default function SurveyAddDialog({ open, isCreating, onClose, onSubmit }: Props) {
    const [attributeTypes, setAttributeTypes] = useState<SurveyAttributeTypeInfo[]>([]);
    const [loadingAttr, setLoadingAttr] = useState(false);

    const createEmptyForm = (): QuestionForm => ({
        id: uuid(),
        question: "",
        questionType: QuestionType.SINGLE,
        answerMode: "manual",
        answers: ["", ""],
        selectedAttributeType: "",
        selectedSubGroup: "",
        availableSubGroups: [],
        availableValues: [],
        selectedValues: new Set(),
        budgetRanges: [
            { label: "Dưới 500.000đ", max: 500000 },
            { label: "500.000đ - 1.000.000đ", min: 500000, max: 1000000 },
        ],
    });


    const [forms, setForms] = useState<QuestionForm[]>([createEmptyForm()]);

    // Fetch attribute types on open
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setForms([createEmptyForm()]);
            surveyService.getAttributeTypes().then(res => {
                setAttributeTypes(res.data);
            }).catch(console.error);
        }
    }, [open]);

    // Fetch values when attribute type changes
    const handleAttributeTypeChange = useCallback(async (formId: string, type: string) => {
        setForms(prev => prev.map(f => f.id === formId ? { ...f, selectedAttributeType: type, availableSubGroups: [], availableValues: [], selectedSubGroup: "", selectedValues: new Set() } : f));

        if (!type) return;
        setLoadingAttr(true);
        try {
            const res = await surveyService.getAttributeValues(type);
            setForms(prev => prev.map(f => {
                if (f.id !== formId) return f;
                const values = res.data.values || [];
                const subGroups = res.data.subGroups || [];

                // If sub-groups exist (attribute type), store them all and use first one by default
                if (subGroups.length > 0) {
                    const subGroupNames = subGroups.map(g => g.attributeName);
                    return {
                        ...f,
                        availableSubGroups: subGroupNames,
                        availableValues: subGroups[0].values,
                        selectedSubGroup: subGroups[0].attributeName
                    };
                }
                return { ...f, availableSubGroups: [], availableValues: values };
            }));
        } catch (err) {
            console.error("Failed to fetch attribute values:", err);
        } finally {
            setLoadingAttr(false);
        }
    }, []);

    const handleSubGroupChange = useCallback(async (formId: string, subGroupName: string) => {
        const type = forms.find(f => f.id === formId)?.selectedAttributeType;
        if (!type) return;

        setLoadingAttr(true);
        try {
            const res = await surveyService.getAttributeValues(type);
            const group = res.data.subGroups?.find(g => g.attributeName === subGroupName);
            setForms(prev => prev.map(f => f.id === formId ? { ...f, selectedSubGroup: subGroupName, availableValues: group?.values || [], selectedValues: new Set() } : f));
        } catch (err) {
            console.error("Failed to fetch sub-group values:", err);
        } finally {
            setLoadingAttr(false);
        }
    }, [forms]);

    // Form handlers
    const handleAddForm = () => setForms(prev => [...prev, createEmptyForm()]);
    const handleRemoveForm = (id: string) => setForms(prev => prev.filter(f => f.id !== id));

    const updateForm = (id: string, field: keyof QuestionForm, value: any) => {
        setForms(prev => prev.map(f => (f.id === id ? { ...f, [field]: value } : f)));
    };

    const updateAnswer = (formId: string, answerIndex: number, value: string) => {
        setForms(prev =>
            prev.map(f => {
                if (f.id !== formId) return f;
                const newAnswers = [...f.answers];
                newAnswers[answerIndex] = value;
                return { ...f, answers: newAnswers };
            })
        );
    };

    const handleAddAnswer = (formId: string) => {
        setForms(prev => prev.map(f => (f.id === formId ? { ...f, answers: [...f.answers, ""] } : f)));
    };

    const handleRemoveAnswer = (formId: string, answerIndex: number) => {
        setForms(prev =>
            prev.map(f => {
                if (f.id !== formId) return f;
                if (f.answers.length <= 2) return f;
                return { ...f, answers: f.answers.filter((_, i) => i !== answerIndex) };
            })
        );
    };

    const toggleValueSelection = (formId: string, displayText: string) => {
        setForms(prev => prev.map(f => {
            if (f.id !== formId) return f;
            const next = new Set(f.selectedValues);
            if (next.has(displayText)) next.delete(displayText);
            else next.add(displayText);
            return { ...f, selectedValues: next };
        }));
    };

    const selectAllValues = (formId: string) => {
        setForms(prev => prev.map(f => {
            if (f.id !== formId) return f;
            return { ...f, selectedValues: new Set(f.availableValues.map(v => v.displayText)) };
        }));
    };

    const deselectAllValues = (formId: string) => {
        setForms(prev => prev.map(f => (f.id === formId ? { ...f, selectedValues: new Set() } : f)));
    };

    // Budget range handlers
    const addBudgetRange = (formId: string) => {
        setForms(prev => prev.map(f => (f.id === formId ? { ...f, budgetRanges: [...f.budgetRanges, { label: "", min: undefined, max: undefined }] } : f)));
    };

    const updateBudgetRange = (formId: string, idx: number, field: string, value: any) => {
        setForms(prev => prev.map(f => {
            if (f.id !== formId) return f;
            const ranges = [...f.budgetRanges];
            ranges[idx] = { ...ranges[idx], [field]: value };
            return { ...f, budgetRanges: ranges };
        }));
    };

    const removeBudgetRange = (formId: string, idx: number) => {
        setForms(prev => prev.map(f => {
            if (f.id !== formId) return f;
            if (f.budgetRanges.length <= 2) return f;
            return { ...f, budgetRanges: f.budgetRanges.filter((_, i) => i !== idx) };
        }));
    };

    // Submit
    const handleSubmit = () => {
        const payload: SurveyQuestionRequest[] = forms.map(f => {
            if (f.answerMode === "attribute") {
                if (f.selectedAttributeType === "budget") {
                    // Budget: serialize budget ranges as query answers
                    const budgetAnswers = f.budgetRanges.filter(r => r.label.trim()).map(r => ({
                        answer: JSON.stringify({
                            displayText: r.label,
                            queryFragment: { type: "budget", min: r.min, max: r.max },
                        }),
                    }));
                    return {
                        question: f.question.trim(),
                        questionType: f.questionType,
                        answers: budgetAnswers,
                    };
                }

                // Attribute: serialize selected values as query answers
                const selectedItems = f.availableValues.filter(v => f.selectedValues.has(v.displayText));
                return {
                    question: f.question.trim(),
                    questionType: f.questionType,
                    answers: selectedItems.map(v => ({
                        answer: JSON.stringify({
                            displayText: v.displayText,
                            queryFragment: v.queryFragment,
                        }),
                    })),
                };
            }

            // Manual mode
            const filled = f.answers.filter(a => a.trim());
            return {
                question: f.question.trim(),
                questionType: f.questionType,
                answers: filled.map(a => ({ answer: a.trim() })),
            };
        });
        onSubmit(payload);
    };

    // Validation
    const isInvalid = forms.some(f => {
        if (!f.question.trim()) return true;
        if (f.answerMode === "manual") return f.answers.filter(a => a.trim()).length < 2;
        if (f.answerMode === "attribute") {
            if (f.selectedAttributeType === "budget") return f.budgetRanges.filter(r => r.label.trim()).length < 2;
            return f.selectedValues.size < 2;
        }
        return true;
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    pb: 2,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <SurveyIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Thêm câu hỏi mới</Typography>
                </Box>
                <IconButton onClick={onClose} disabled={isCreating} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                {forms.map((form, index) => {
                    const isAttributeMode = form.answerMode === "attribute";
                    const isBudget = form.selectedAttributeType === "budget";
                    const hasSubGroups = attributeTypes.find(a => a.type === form.selectedAttributeType)?.type === "attribute";

                    return (
                        <Paper key={form.id} variant="outlined" sx={{ p: 3, position: "relative", borderRadius: 2 }}>
                            {forms.length > 1 && (
                                <IconButton
                                    color="error"
                                    onClick={() => handleRemoveForm(form.id)}
                                    disabled={isCreating}
                                    sx={{ position: "absolute", top: 8, right: 8 }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            )}

                            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                                Câu hỏi {index + 1}
                            </Typography>

                            {/* Question Type */}
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>
                                Loại câu hỏi
                            </Typography>
                            <ToggleButtonGroup
                                value={form.questionType}
                                exclusive
                                onChange={(_, v) => { if (v) updateForm(form.id, "questionType", v); }}
                                size="small"
                                sx={{ mb: 2.5 }}
                                disabled={isCreating}
                            >
                                <ToggleButton value={QuestionType.SINGLE}>Một đáp án (single)</ToggleButton>
                                <ToggleButton value={QuestionType.MULTIPLE}>Nhiều đáp án (multiple)</ToggleButton>
                            </ToggleButtonGroup>

                            {/* Question Text */}
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>
                                Nội dung câu hỏi *
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                variant="outlined"
                                placeholder="Nhập câu hỏi..."
                                value={form.question}
                                onChange={(e) => updateForm(form.id, "question", e.target.value)}
                                disabled={isCreating}
                                sx={{ mb: 3 }}
                            />

                            <Divider sx={{ mb: 2 }} />

                            {/* Answer Mode Toggle */}
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>
                                Cách nhập đáp án
                            </Typography>
                            <ToggleButtonGroup
                                value={form.answerMode}
                                exclusive
                                onChange={(_, v) => { if (v) updateForm(form.id, "answerMode", v); }}
                                size="small"
                                sx={{ mb: 2.5 }}
                                disabled={isCreating}
                            >
                                <ToggleButton value="manual">Nhập thủ công</ToggleButton>
                                <ToggleButton value="attribute">
                                    <QueryIcon sx={{ mr: 0.5, fontSize: 18 }} /> Chọn từ thuộc tính
                                </ToggleButton>
                            </ToggleButtonGroup>

                            {/* ── Manual Mode ─────────────────────────────── */}
                            {!isAttributeMode && (
                                <>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                                        <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                                            Danh sách câu trả lời * (tối thiểu 2)
                                        </Typography>
                                        <Button size="small" startIcon={<AddAnswerIcon />} onClick={() => handleAddAnswer(form.id)} disabled={isCreating}>
                                            Thêm đáp án
                                        </Button>
                                    </Box>

                                    {form.answers.map((ans, idx) => (
                                        <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
                                            <Chip label={idx + 1} size="small" color="primary" variant="outlined" sx={{ minWidth: 32, fontWeight: "bold" }} />
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder={`Đáp án ${idx + 1}...`}
                                                value={ans}
                                                onChange={(e) => updateAnswer(form.id, idx, e.target.value)}
                                                disabled={isCreating}
                                            />
                                            <IconButton size="small" color="error" onClick={() => handleRemoveAnswer(form.id, idx)} disabled={form.answers.length <= 2 || isCreating}>
                                                <RemoveAnswerIcon />
                                            </IconButton>
                                        </Box>
                                    ))}

                                    {form.answers.filter(a => a.trim()).length < 2 && (
                                        <Alert severity="warning" sx={{ mt: 1 }}>Cần ít nhất 2 đáp án hợp lệ</Alert>
                                    )}
                                </>
                            )}

                            {/* ── Attribute Mode ─────────────────────────── */}
                            {isAttributeMode && (
                                <>
                                    {/* Attribute type picker */}
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>
                                        Chọn loại thuộc tính *
                                    </Typography>
                                    <Select
                                        fullWidth
                                        size="small"
                                        value={form.selectedAttributeType}
                                        onChange={(e) => handleAttributeTypeChange(form.id, e.target.value)}
                                        displayEmpty
                                        disabled={isCreating}
                                        sx={{ mb: 2 }}
                                    >
                                        <MenuItem value="" disabled>-- Chọn thuộc tính --</MenuItem>
                                        {attributeTypes.map(at => (
                                            <MenuItem key={at.type} value={at.type}>
                                                {at.label} — {at.description}
                                            </MenuItem>
                                        ))}
                                    </Select>

                                    {/* Sub-group picker (for 'attribute' type) */}
                                    {hasSubGroups && form.selectedAttributeType === "attribute" && (
                                        <>
                                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>
                                                Chọn nhóm thuộc tính *
                                            </Typography>
                                            <Select
                                                fullWidth
                                                size="small"
                                                value={form.selectedSubGroup}
                                                onChange={(e) => handleSubGroupChange(form.id, e.target.value)}
                                                displayEmpty
                                                disabled={isCreating || loadingAttr}
                                                sx={{ mb: 2 }}
                                            >
                                                <MenuItem value="" disabled>-- Chọn nhóm --</MenuItem>
                                                {form.availableSubGroups.map(name => (
                                                    <MenuItem key={name} value={name}>{name}</MenuItem>
                                                ))}
                                            </Select>
                                        </>
                                    )}

                                    {/* Budget ranges input */}
                                    {isBudget && (
                                        <>
                                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: "bold" }}>
                                                Các khoảng ngân sách * (tối thiểu 2)
                                            </Typography>
                                            {form.budgetRanges.map((range, idx) => (
                                                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
                                                    <Chip label={idx + 1} size="small" color="primary" variant="outlined" sx={{ minWidth: 32 }} />
                                                    <TextField
                                                        size="small"
                                                        placeholder="Nhãn hiển thị"
                                                        value={range.label}
                                                        onChange={(e) => updateBudgetRange(form.id, idx, "label", e.target.value)}
                                                        sx={{ flex: 2 }}
                                                    />
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        placeholder="Từ (VND)"
                                                        value={range.min ?? ""}
                                                        onChange={(e) => updateBudgetRange(form.id, idx, "min", e.target.value ? Number(e.target.value) : undefined)}
                                                        sx={{ flex: 1 }}
                                                    />
                                                    <Typography color="text.secondary">-</Typography>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        placeholder="Đến (VND)"
                                                        value={range.max ?? ""}
                                                        onChange={(e) => updateBudgetRange(form.id, idx, "max", e.target.value ? Number(e.target.value) : undefined)}
                                                        sx={{ flex: 1 }}
                                                    />
                                                    <IconButton size="small" color="error" onClick={() => removeBudgetRange(form.id, idx)} disabled={form.budgetRanges.length <= 2}>
                                                        <RemoveAnswerIcon />
                                                    </IconButton>
                                                </Box>
                                            ))}
                                            <Button size="small" startIcon={<AddAnswerIcon />} onClick={() => addBudgetRange(form.id)} sx={{ mt: 0.5 }}>
                                                Thêm khoảng giá
                                            </Button>
                                        </>
                                    )}

                                    {/* Values checkbox grid */}
                                    {!isBudget && form.availableValues.length > 0 && (
                                        <>
                                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                                                    Chọn giá trị làm đáp án * ({form.selectedValues.size}/{form.availableValues.length})
                                                </Typography>
                                                <Box>
                                                    <Button size="small" onClick={() => selectAllValues(form.id)} sx={{ mr: 0.5 }}>Chọn tất cả</Button>
                                                    <Button size="small" onClick={() => deselectAllValues(form.id)}>Bỏ chọn</Button>
                                                </Box>
                                            </Box>
                                            <Box sx={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: 1,
                                                maxHeight: 300,
                                                overflow: "auto",
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 1,
                                                p: 1.5,
                                            }}>
                                                {form.availableValues.map(val => (
                                                    <Chip
                                                        key={val.displayText}
                                                        label={val.displayText}
                                                        onClick={() => toggleValueSelection(form.id, val.displayText)}
                                                        color={form.selectedValues.has(val.displayText) ? "primary" : "default"}
                                                        variant={form.selectedValues.has(val.displayText) ? "filled" : "outlined"}
                                                        sx={{ cursor: "pointer" }}
                                                    />
                                                ))}
                                            </Box>

                                            {form.selectedValues.size < 2 && (
                                                <Alert severity="warning" sx={{ mt: 1 }}>Cần chọn ít nhất 2 giá trị</Alert>
                                            )}
                                        </>
                                    )}

                                    {loadingAttr && (
                                        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    )}
                                </>
                            )}
                        </Paper>
                    );
                })}

                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddForm}
                    disabled={isCreating}
                    sx={{ py: 1.5, borderStyle: "dashed", borderWidth: 2 }}
                >
                    Thêm một câu hỏi nữa
                </Button>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                <Button onClick={onClose} color="inherit" disabled={isCreating} sx={{ px: 3, borderRadius: 2 }}>Hủy</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={isCreating || isInvalid}
                    startIcon={isCreating ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                    sx={{ px: 4, borderRadius: 2, fontWeight: "bold" }}
                >
                    {isCreating ? "Đang tạo..." : `Tạo ${forms.length > 1 ? `${forms.length} câu hỏi` : "câu hỏi"}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
