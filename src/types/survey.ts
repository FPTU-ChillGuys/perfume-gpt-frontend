import { z } from "zod";
import { productCardOutputItemSchema } from "./ai/product.output";

/** Loại câu hỏi survey */
export const QuestionType = {
    SINGLE: 'single',
    MULTIPLE: 'multiple',
} as const;
export type QuestionType = typeof QuestionType[keyof typeof QuestionType];

export interface SurveyAnswer {
    id: string;
    createdAt: string;
    updatedAt: string;
    questionId: string;
    answer: string;
}

export interface SurveyQuestion {
    id: string;
    createdAt: string;
    updatedAt: string;
    question: string;
    questionType: QuestionType;
    answers: SurveyAnswer[];
}

export interface SurveyAnswerRequest {
    answer: string;
}

export interface SurveyQuestionRequest {
    question: string;
    questionType?: QuestionType;
    answers: SurveyAnswerRequest[];
}

export interface SurveyQuestionsResponse {
    success: boolean;
    error: string | null;
    data: SurveyQuestion[];
}

export interface SurveyQuestionResponse {
    success: boolean;
    error: string | null;
    data: SurveyQuestion;
}

export interface CreateSurveyQuestionResponse {
    success: boolean;
    error: string | null;
    data: string; // Returns ID of the created question
}

export interface CheckFirstTimeResponse {
    success: boolean;
    error: string | null;
    data: boolean;
}

export interface SurveyQuesAnsDetailRequest {
    questionId: string;
    answerId: string;
}

export interface UserSurveyDetail {
    id: string;
    createdAt: string;
    updatedAt: string;
    questionId: string;
    question: string;
    answerId: string;
    answer: string;
}

export interface UserSurveyRecord {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    details: UserSurveyDetail[];
}

export interface SubmitSurveyResponse {
    success: boolean;
    error: string | null;
    data: string; // Returns string (id or success string)
}

export interface UserSurveyRecordResponse {
    success: boolean;
    error: string | null;
    data: UserSurveyRecord;
}

// ============ AI Output Schemas & Parsers ============
export const surveyOutputItemSchema = z.object({
    message: z.string(),
    products: z.array(productCardOutputItemSchema)
});

export const surveyOutputSchema = surveyOutputItemSchema;
export type SurveyOutputItem = z.infer<typeof surveyOutputItemSchema>;

export const convertSurveyOutputToResult = (output: unknown): SurveyOutputItem | null => {
    try {
        const jsonOutput = typeof output === 'string' ? JSON.parse(output) : output;
        const parsedOutput = surveyOutputSchema.safeParse(jsonOutput);

        if (!parsedOutput.success) {
            console.error('[Survey Output] Invalid structured output from AI.', parsedOutput.error.issues);
            console.warn('[Survey Output] Output format:', JSON.stringify(jsonOutput).substring(0, 200));
            return null;
        }

        return parsedOutput.data;
    } catch (error) {
        console.error('[Survey Output] Error parsing structured output:', error);
        return null;
    }
};

// ============ Survey V4 — Query-based Types ============

export type SurveyAttributeType =
    | 'gender' | 'origin' | 'brand' | 'category'
    | 'concentration' | 'note' | 'family' | 'attribute' | 'budget';

export interface SurveyAttributeTypeInfo {
    type: SurveyAttributeType;
    label: string;
    description: string;
}

export interface QueryFragment {
    type: SurveyAttributeType;
    match?: string;
    attributeName?: string;
    min?: number;
    max?: number;
}

export interface SurveyAttributeValueItem {
    displayText: string;
    queryFragment: QueryFragment;
}

export interface SurveyAttributeValuesResponse {
    type: SurveyAttributeType;
    label: string;
    values?: SurveyAttributeValueItem[];
    subGroups?: {
        attributeName: string;
        values: SurveyAttributeValueItem[];
    }[];
}

export interface CreateQuestionFromAttributeRequest {
    question: string;
    questionType: 'single' | 'multiple';
    attributeType: SurveyAttributeType;
    attributeName?: string;
    selectedValues?: string[];
    budgetRanges?: { label: string; min?: number; max?: number }[];
}

/** Parse answer text nếu nó chứa JSON query payload */
export function tryParseQueryAnswer(answerText: string): { displayText: string; queryFragment: QueryFragment } | null {
    try {
        const parsed = JSON.parse(answerText);
        if (parsed?.displayText && parsed?.queryFragment) return parsed;
        return null;
    } catch {
        return null;
    }
}

/** Lấy displayText từ answer. Nếu answer là JSON query sẽ parse lấy displayText, nếu không trả về nguyên text */
export function getAnswerDisplayText(answerText: string): string {
    const parsed = tryParseQueryAnswer(answerText);
    return parsed ? parsed.displayText : answerText;
}

