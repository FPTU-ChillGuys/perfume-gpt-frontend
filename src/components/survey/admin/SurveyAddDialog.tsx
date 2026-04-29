import { useState, useEffect, useCallback } from "react";
import { v4 as uuid } from "uuid";
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
    SwapHoriz as SwitchModeIcon,
    AttachMoney as BudgetIcon,
} from "@mui/icons-material";
import { QuestionType } from "@/types/survey";
import type { SurveyQuestionRequest, SurveyAttributeTypeInfo, SurveyAttributeValueItem, SurveyAttributeType } from "@/types/survey";
import { surveyService } from "@/services/ai/surveyService";

type AnswerMode = "manual" | "attribute";

interface AnswerRow {
    id: string;
    mode: AnswerMode;
    text: string;
    attributeType: SurveyAttributeType | "";
    selectedSubGroup: string;
    availableSubGroups: string[];
    availableValues: SurveyAttributeValueItem[];
    selectedValues: Set<string>;
    budgetRanges: { min?: number; max?: number }[];
}

interface QuestionForm {
    id: string;
    question: string;
    questionType: QuestionType;
    budgetMode: boolean;
    answers: AnswerRow[];
}

function formatBudgetLabel(min?: number, max?: number): string {
    const fmt = (v: number) => v.toLocaleString("vi-VN") + "đ";
    if (min !== undefined && max !== undefined) return `${fmt(min)} - ${fmt(max)}`;
    if (min !== undefined) return `Trên ${fmt(min)}`;
    if (max !== undefined) return `Dưới ${fmt(max)}`;
    return "";
}

function createEmptyAnswerRow(mode: AnswerMode = "manual"): AnswerRow {
    return {
        id: uuid(),
        mode,
        text: "",
        attributeType: "",
        selectedSubGroup: "",
        availableSubGroups: [],
        availableValues: [],
        selectedValues: new Set(),
        budgetRanges: [],
    };
}

function createEmptyBudgetRow(): AnswerRow {
    return {
        id: uuid(),
        mode: "manual",
        text: "",
        attributeType: "",
        selectedSubGroup: "",
        availableSubGroups: [],
        availableValues: [],
        selectedValues: new Set(),
        budgetRanges: [{ max: 500000 }, { min: 500000, max: 1000000 }],
    };
}

interface Props {
    open: boolean;
    isCreating: boolean;
    onClose: () => void;
    onSubmit: (payload: SurveyQuestionRequest[]) => void;
}

export default function SurveyAddDialog({ open, isCreating, onClose, onSubmit }: Props) {
    const [attributeTypes, setAttributeTypes] = useState<SurveyAttributeTypeInfo[]>([]);
    const [loadingAttr, setLoadingAttr] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

    const createEmptyForm = (): QuestionForm => ({
        id: uuid(),
        question: "",
        questionType: QuestionType.SINGLE,
        budgetMode: false,
        answers: [createEmptyAnswerRow(), createEmptyAnswerRow()],
    });

    const [forms, setForms] = useState<QuestionForm[]>([createEmptyForm()]);

    useEffect(() => {
        if (open) {
            setForms([createEmptyForm()]);
            surveyService.getAttributeTypes().then((res) => setAttributeTypes(res.data)).catch(console.error);
        }
    }, [open]);

    const showConfirmDialog = (callback: () => void) => {
        setConfirmCallback(() => callback);
        setConfirmOpen(true);
    };

    const handleConfirmClose = (confirmed: boolean) => {
        setConfirmOpen(false);
        if (confirmed && confirmCallback) confirmCallback();
        setConfirmCallback(null);
    };

    const handleAttributeTypeChange = useCallback(async (formId: string, rowId: string, type: string) => {
        setForms((prev) => prev.map((f) => {
            if (f.id !== formId) return f;
            return { ...f, answers: f.answers.map((r) => r.id === rowId ? { ...r, attributeType: type as SurveyAttributeType, selectedSubGroup: "", availableSubGroups: [], availableValues: [], selectedValues: new Set() } : r) };
        }));

        if (!type) return;
        setLoadingAttr(true);
        try {
            const res = await surveyService.getAttributeValues(type);
            const values = res.data.values || [];
            const subGroups = res.data.subGroups || [];

            setForms((prev) => prev.map((f) => {
                if (f.id !== formId) return f;
                return {
                    ...f,
                    answers: f.answers.map((r) => {
                        if (r.id !== rowId) return r;
                        if (subGroups.length > 0 && subGroups[0]) {
                            const firstGroup = subGroups[0];
                            return { ...r, availableSubGroups: subGroups.map((g) => g.attributeName), availableValues: firstGroup.values, selectedSubGroup: firstGroup.attributeName };
                        }
                        return { ...r, availableSubGroups: [], availableValues: values };
                    }),
                };
            }));
        } catch (err) {
            console.error("Failed to fetch attribute values:", err);
        } finally {
            setLoadingAttr(false);
        }
    }, []);

    const handleSubGroupChange = useCallback(async (formId: string, rowId: string, subGroupName: string) => {
        const form = forms.find((f) => f.id === formId);
        const row = form?.answers.find((r) => r.id === rowId);
        if (!row?.attributeType) return;

        setForms((prev) => prev.map((f) => f.id !== formId ? f : { ...f, answers: f.answers.map((r) => r.id === rowId ? { ...r, selectedSubGroup: subGroupName, selectedValues: new Set() } : r) }));
        setLoadingAttr(true);
        try {
            const res = await surveyService.getAttributeValues(row.attributeType);
            const group = res.data.subGroups?.find((g) => g.attributeName === subGroupName);
            setForms((prev) => prev.map((f) => f.id !== formId ? f : { ...f, answers: f.answers.map((r) => r.id === rowId ? { ...r, availableValues: group?.values || [] } : r) }));
        } catch (err) {
            console.error("Failed to fetch sub-group values:", err);
        } finally {
            setLoadingAttr(false);
        }
    }, [forms]);

    const handleAddForm = () => setForms((prev) => [...prev, createEmptyForm()]);
    const handleRemoveForm = (id: string) => setForms((prev) => prev.filter((f) => f.id !== id));

    const updateForm = (formId: string, field: "question" | "questionType" | "budgetMode", value: string | boolean) => {
        setForms((prev) => prev.map((f) => (f.id === formId ? { ...f, [field]: value } : f)));
    };

    const handleBudgetModeToggle = (formId: string, enabled: boolean) => {
        const form = forms.find((f) => f.id === formId);
        if (!form) return;

        const hasData = form.budgetMode
            ? form.answers.some((r) => r.budgetRanges.some((br) => br.min !== undefined || br.max !== undefined))
            : form.answers.some((r) => r.mode === "manual" ? r.text.trim() : r.selectedValues.size > 0);

        const applyToggle = () => {
            setForms((prev) => prev.map((f) => {
                if (f.id !== formId) return f;
                const newAns = enabled ? f.answers.map(() => createEmptyBudgetRow()) : [createEmptyAnswerRow("manual"), createEmptyAnswerRow("manual")];
                return { ...f, budgetMode: enabled, answers: newAns };
            }));
        };

        if (hasData) {
            showConfirmDialog(applyToggle);
        } else {
            applyToggle();
        }
    };

    const handleAddAnswer = (formId: string) => {
        setForms((prev) => prev.map((f) => {
            if (f.id !== formId) return f;
            const row = f.budgetMode ? createEmptyBudgetRow() : createEmptyAnswerRow();
            return { ...f, answers: [...f.answers, row] };
        }));
    };

    const handleRemoveAnswer = (formId: string, rowId: string) => {
        setForms((prev) => prev.map((f) => {
            if (f.id !== formId) return f;
            if (f.answers.length <= 2) return f;
            return { ...f, answers: f.answers.filter((r) => r.id !== rowId) };
        }));
    };

    const switchRowMode = (formId: string, rowId: string, mode: AnswerMode) => {
        setForms((prev) => prev.map((f) => {
            if (f.id !== formId) return f;
            return {
                ...f,
                answers: f.answers.map((r) => {
                    if (r.id !== rowId) return r;
                    return {
                        ...r,
                        mode,
                        text: mode === "manual" ? r.text : "",
                        attributeType: mode === "attribute" ? "" as SurveyAttributeType | "" : "",
                        availableSubGroups: [],
                        availableValues: [],
                        selectedValues: new Set(),
                    };
                }),
            };
        }));
    };

    const updateAnswerText = (formId: string, rowId: string, value: string) => {
        setForms((prev) => prev.map((f) => f.id !== formId ? f : { ...f, answers: f.answers.map((r) => r.id === rowId ? { ...r, text: value } : r) }));
    };

    const toggleValueSelection = (formId: string, rowId: string, displayText: string) => {
        setForms((prev) => prev.map((f) => {
            if (f.id !== formId) return f;
            return { ...f, answers: f.answers.map((r) => { if (r.id !== rowId) return r; const next = new Set(r.selectedValues); if (next.has(displayText)) next.delete(displayText); else next.add(displayText); return { ...r, selectedValues: next }; }) };
        }));
    };

    const selectAllValues = (formId: string, rowId: string) => {
        setForms((prev) => prev.map((f) => f.id !== formId ? f : { ...f, answers: f.answers.map((r) => r.id === rowId ? { ...r, selectedValues: new Set(r.availableValues.map((v) => v.displayText)) } : r) }));
    };

    const deselectAllValues = (formId: string, rowId: string) => {
        setForms((prev) => prev.map((f) => f.id !== formId ? f : { ...f, answers: f.answers.map((r) => r.id === rowId ? { ...r, selectedValues: new Set() } : r) }));
    };

    const addBudgetRange = (formId: string, rowId: string) => {
        setForms((prev) => prev.map((f) => f.id !== formId ? f : { ...f, answers: f.answers.map((r) => r.id === rowId ? { ...r, budgetRanges: [...r.budgetRanges, { min: undefined, max: undefined }] } : r) }));
    };

    const updateBudgetRange = (formId: string, rowId: string, rangeIdx: number, field: "min" | "max", value: number | undefined) => {
        setForms((prev) => prev.map((f) => {
            if (f.id !== formId) return f;
            return {
                ...f,
                answers: f.answers.map((r) => {
                    if (r.id !== rowId) return r;
                    const ranges = [...r.budgetRanges];
                    const existing = ranges[rangeIdx]!;
                    ranges[rangeIdx] = { ...existing, [field]: value };
                    return { ...r, budgetRanges: ranges };
                }),
            };
        }));
    };

    const removeBudgetRange = (formId: string, rowId: string, rangeIdx: number) => {
        setForms((prev) => prev.map((f) => {
            if (f.id !== formId) return f;
            return {
                ...f,
                answers: f.answers.map((r) => {
                    if (r.id !== rowId) return r;
                    if (r.budgetRanges.length <= 2) return r;
                    return { ...r, budgetRanges: r.budgetRanges.filter((_, i) => i !== rangeIdx) };
                }),
            };
        }));
    };

    const handleSubmit = () => {
        const payload: SurveyQuestionRequest[] = forms.map((f) => {
            const answers: { answer: string }[] = [];
            if (f.budgetMode) {
                for (const row of f.answers) {
                    for (const r of row.budgetRanges) {
                        if (r.min !== undefined || r.max !== undefined) {
                            answers.push({ answer: JSON.stringify({ displayText: formatBudgetLabel(r.min, r.max), queryFragment: { type: "budget", min: r.min, max: r.max } }) });
                        }
                    }
                }
            } else {
                for (const row of f.answers) {
                    if (row.mode === "manual") {
                        if (row.text.trim()) answers.push({ answer: row.text.trim() });
                    } else {
                        const selectedItems = row.availableValues.filter((v) => row.selectedValues.has(v.displayText));
                        for (const v of selectedItems) {
                            answers.push({ answer: JSON.stringify({ displayText: v.displayText, queryFragment: v.queryFragment }) });
                        }
                    }
                }
            }
            return { question: f.question.trim(), questionType: f.questionType, answers };
        });
        onSubmit(payload);
    };

    const isInvalid = forms.some((f) => {
        if (!f.question.trim()) return true;
        if (f.budgetMode) {
            const validCount = f.answers.reduce((count, r) => count + r.budgetRanges.filter((br) => br.min !== undefined || br.max !== undefined).length, 0);
            return validCount < 2;
        }
        const validCount = f.answers.reduce((count, r) => {
            if (r.mode === "manual") return count + (r.text.trim() ? 1 : 0);
            return count + r.selectedValues.size;
        }, 0);
        return validCount < 2;
    });

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid", borderColor: "divider", pb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><SurveyIcon color="primary" /><Typography variant="h6" fontWeight="bold">Thêm câu hỏi mới</Typography></Box>
                    <IconButton onClick={onClose} disabled={isCreating} size="small"><CloseIcon /></IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    {forms.map((form, index) => (
                        <Paper key={form.id} variant="outlined" sx={{ p: 3, position: "relative", borderRadius: 2 }}>
                            {forms.length > 1 && <IconButton color="error" onClick={() => handleRemoveForm(form.id)} disabled={isCreating} sx={{ position: "absolute", top: 8, right: 8 }}><DeleteIcon /></IconButton>}

                            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>Câu hỏi {index + 1}</Typography>

                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>Loại câu hỏi</Typography>
                            <ToggleButtonGroup value={form.questionType} exclusive onChange={(_, v) => { if (v) updateForm(form.id, "questionType", v); }} size="small" sx={{ mb: 2.5 }} disabled={isCreating}>
                                <ToggleButton value={QuestionType.SINGLE}>Một đáp án (single)</ToggleButton>
                                <ToggleButton value={QuestionType.MULTIPLE}>Nhiều đáp án (multiple)</ToggleButton>
                            </ToggleButtonGroup>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: "bold", mb: 0 }}>Chế độ trả lời</Typography>
                                <ToggleButtonGroup value={form.budgetMode} exclusive onChange={(_, v) => { if (v !== null) handleBudgetModeToggle(form.id, v); }} size="small" disabled={isCreating}>
                                    <ToggleButton value={false}>Thuộc tính</ToggleButton>
                                    <ToggleButton value={true} color="success"><BudgetIcon sx={{ fontSize: 16, mr: 0.5 }} />Ngân sách</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>

                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>Nội dung câu hỏi *</Typography>
                            <TextField fullWidth multiline minRows={2} variant="outlined" placeholder="Nhập câu hỏi..." value={form.question} onChange={(e) => updateForm(form.id, "question", e.target.value)} disabled={isCreating} sx={{ mb: 3 }} />

                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">Danh sách câu trả lời * (tối thiểu 2)</Typography>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                    <Button size="small" startIcon={<AddAnswerIcon />} onClick={() => handleAddAnswer(form.id)} disabled={isCreating}>Thêm đáp án</Button>
                                </Box>
                            </Box>

                            {form.budgetMode ? (
                                form.answers.map((row, ansIdx) => (
                                    <Box key={row.id} sx={{ mb: 2, p: 1.5, border: "1px solid", borderColor: "success.light", borderRadius: 1.5, bgcolor: "success.50" }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                            <Chip label={ansIdx + 1} size="small" color="success" variant="outlined" sx={{ minWidth: 32, fontWeight: "bold" }} />
                                            <Chip label="Ngân sách" size="small" color="success" variant="outlined" sx={{ height: 22, fontSize: "0.7rem" }} />
                                            <Box sx={{ flexGrow: 1 }} />
                                            <IconButton size="small" color="error" onClick={() => handleRemoveAnswer(form.id, row.id)} disabled={form.answers.length <= 2 || isCreating}><RemoveAnswerIcon /></IconButton>
                                        </Box>

                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>Các khoảng ngân sách (tối thiểu 2)</Typography>
                                        {row.budgetRanges.map((range, rIdx) => {
                                            const autoLabel = formatBudgetLabel(range.min, range.max);
                                            return (
                                                <Box key={rIdx} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                                                    <Chip label={rIdx + 1} size="small" color="success" variant="outlined" sx={{ minWidth: 28 }} />
                                                    <TextField size="small" type="number" placeholder="Từ (VND)" value={range.min ?? ""} onChange={(e) => updateBudgetRange(form.id, row.id, rIdx, "min", e.target.value ? Number(e.target.value) : undefined)} sx={{ flex: 1 }} />
                                                    <Typography color="text.secondary">-</Typography>
                                                    <TextField size="small" type="number" placeholder="Đến (VND)" value={range.max ?? ""} onChange={(e) => updateBudgetRange(form.id, row.id, rIdx, "max", e.target.value ? Number(e.target.value) : undefined)} sx={{ flex: 1 }} />
                                                    {autoLabel && <Chip label={autoLabel} size="small" color="success" variant="filled" sx={{ fontSize: "0.7rem" }} />}
                                                    <IconButton size="small" color="error" onClick={() => removeBudgetRange(form.id, row.id, rIdx)} disabled={row.budgetRanges.length <= 2}><RemoveAnswerIcon /></IconButton>
                                                </Box>
                                            );
                                        })}
                                        <Button size="small" startIcon={<AddAnswerIcon />} onClick={() => addBudgetRange(form.id, row.id)}>Thêm khoảng giá</Button>
                                    </Box>
                                ))
                            ) : (
                                form.answers.map((row, ansIdx) => (
                                    <Box key={row.id} sx={{ mb: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                            <Chip label={ansIdx + 1} size="small" color="primary" variant="outlined" sx={{ minWidth: 32, fontWeight: "bold" }} />
                                            {row.mode === "manual" ? (
                                                <Button size="small" variant="outlined" startIcon={<QueryIcon sx={{ fontSize: 16 }} />} onClick={() => switchRowMode(form.id, row.id, "attribute")} disabled={isCreating} sx={{ textTransform: "none", fontSize: "0.75rem" }}>Thuộc tính</Button>
                                            ) : (
                                                <Button size="small" variant="outlined" color="warning" startIcon={<SwitchModeIcon sx={{ fontSize: 16 }} />} onClick={() => switchRowMode(form.id, row.id, "manual")} disabled={isCreating} sx={{ textTransform: "none", fontSize: "0.75rem" }}>Thủ công</Button>
                                            )}
                                            {row.mode === "attribute" && <Chip label="Query" size="small" color="info" variant="outlined" sx={{ height: 22, fontSize: "0.7rem" }} />}
                                            <Box sx={{ flexGrow: 1 }} />
                                            <IconButton size="small" color="error" onClick={() => handleRemoveAnswer(form.id, row.id)} disabled={form.answers.length <= 2 || isCreating}><RemoveAnswerIcon /></IconButton>
                                        </Box>

                                        {row.mode === "manual" ? (
                                            <TextField fullWidth size="small" placeholder={`Đáp án ${ansIdx + 1}...`} value={row.text} onChange={(e) => updateAnswerText(form.id, row.id, e.target.value)} disabled={isCreating} />
                                        ) : (
                                            <>
                                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>Loại thuộc tính</Typography>
                                                <Select fullWidth size="small" value={row.attributeType} onChange={(e) => handleAttributeTypeChange(form.id, row.id, e.target.value)} displayEmpty disabled={isCreating} sx={{ mb: 1.5 }}>
                                                    <MenuItem value="" disabled>-- Chọn thuộc tính --</MenuItem>
                                                    {attributeTypes.filter((at) => at.type !== "budget").map((at) => (<MenuItem key={at.type} value={at.type}>{at.label} — {at.description}</MenuItem>))}
                                                </Select>

                                                {(attributeTypes.find((a) => a.type === row.attributeType)?.type === "attribute") && (
                                                    <>
                                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>Nhóm thuộc tính</Typography>
                                                        <Select fullWidth size="small" value={row.selectedSubGroup} onChange={(e) => handleSubGroupChange(form.id, row.id, e.target.value)} displayEmpty disabled={isCreating || loadingAttr} sx={{ mb: 1.5 }}>
                                                            <MenuItem value="" disabled>-- Chọn nhóm --</MenuItem>
                                                            {row.availableSubGroups.map((name) => (<MenuItem key={name} value={name}>{name}</MenuItem>))}
                                                        </Select>
                                                    </>
                                                )}

                                                {row.availableValues.length > 0 && (
                                                    <>
                                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                                                            <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ fontSize: "0.75rem" }}>Chọn giá trị ({row.selectedValues.size}/{row.availableValues.length})</Typography>
                                                            <Box>
                                                                <Button size="small" onClick={() => selectAllValues(form.id, row.id)} sx={{ mr: 0.5, fontSize: "0.7rem" }}>Chọn tất cả</Button>
                                                                <Button size="small" onClick={() => deselectAllValues(form.id, row.id)} sx={{ fontSize: "0.7rem" }}>Bỏ chọn</Button>
                                                            </Box>
                                                        </Box>
                                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxHeight: 200, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
                                                            {row.availableValues.map((val) => (<Chip key={val.displayText} label={val.displayText} onClick={() => toggleValueSelection(form.id, row.id, val.displayText)} color={row.selectedValues.has(val.displayText) ? "primary" : "default"} variant={row.selectedValues.has(val.displayText) ? "filled" : "outlined"} sx={{ cursor: "pointer", fontSize: "0.8rem" }} />))}
                                                        </Box>
                                                    </>
                                                )}

                                                {loadingAttr ? (<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={20} /></Box>) : null}
                                            </>
                                        )}
                                    </Box>
                                ))
                            )}

                            {form.budgetMode ? (
                                form.answers.reduce((count, r) => count + r.budgetRanges.filter((br) => br.min !== undefined || br.max !== undefined).length, 0) < 2 && (<Alert severity="warning" sx={{ mt: 1 }}>Cần ít nhất 2 đáp án hợp lệ</Alert>)
                            ) : (
                                form.answers.reduce((count, r) => count + (r.mode === "manual" ? (r.text.trim() ? 1 : 0) : r.selectedValues.size), 0) < 2 && (<Alert severity="warning" sx={{ mt: 1 }}>Cần ít nhất 2 đáp án hợp lệ</Alert>)
                            )}
                        </Paper>
                    ))}

                    <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddForm} disabled={isCreating} sx={{ py: 1.5, borderStyle: "dashed", borderWidth: 2 }}>Thêm một câu hỏi nữa</Button>
                </DialogContent>

                <DialogActions sx={{ p: 3, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                    <Button onClick={onClose} color="inherit" disabled={isCreating} sx={{ px: 3, borderRadius: 2 }}>Hủy</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary" disabled={isCreating || isInvalid} startIcon={isCreating ? <CircularProgress size={18} color="inherit" /> : <AddIcon />} sx={{ px: 4, borderRadius: 2, fontWeight: "bold" }}>
                        {isCreating ? "Đang tạo..." : `Tạo ${forms.length > 1 ? `${forms.length} câu hỏi` : "câu hỏi"}`}
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
