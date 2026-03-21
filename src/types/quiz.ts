import { z } from "zod";
import { productCardOutputItemSchema } from "./ai/product.output";

/** Loại câu hỏi quiz */
export const QuestionType = {
    SINGLE: 'single',
    MULTIPLE: 'multiple',
} as const;
export type QuestionType = typeof QuestionType[keyof typeof QuestionType];

export interface QuizAnswer {
    id: string;
    createdAt: string;
    updatedAt: string;
    questionId: string;
    answer: string;
}

export interface QuizQuestion {
    id: string;
    createdAt: string;
    updatedAt: string;
    question: string;
    questionType: QuestionType;
    answers: QuizAnswer[];
}

export interface QuizAnswerRequest {
    answer: string;
}

export interface QuizQuestionRequest {
    question: string;
    questionType?: QuestionType;
    answers: QuizAnswerRequest[];
}

export interface QuizQuestionsResponse {
    success: boolean;
    error: string | null;
    data: QuizQuestion[];
}

export interface QuizQuestionResponse {
    success: boolean;
    error: string | null;
    data: QuizQuestion;
}

export interface CreateQuizQuestionResponse {
    success: boolean;
    error: string | null;
    data: string; // Returns ID of the created question
}

export interface CheckFirstTimeResponse {
    success: boolean;
    error: string | null;
    data: boolean;
}

export interface QuizQuesAnsDetailRequest {
    questionId: string;
    answerId: string;
}

export interface UserQuizDetail {
    id: string;
    createdAt: string;
    updatedAt: string;
    questionId: string;
    question: string;
    answerId: string;
    answer: string;
}

export interface UserQuizRecord {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    details: UserQuizDetail[];
}

export interface SubmitQuizResponse {
    success: boolean;
    error: string | null;
    data: string; // Returns string (id or success string)
}

export interface UserQuizRecordResponse {
    success: boolean;
    error: string | null;
    data: UserQuizRecord;
}

// ============ AI Output Schemas & Parsers ============
export const quizOutputItemSchema = z.object({
    message: z.string(),
    products: z.array(productCardOutputItemSchema)
});

export const quizOutputSchema = quizOutputItemSchema;
export type QuizOutputItem = z.infer<typeof quizOutputItemSchema>;

export const convertQuizOutputToResult = (output: unknown): QuizOutputItem | null => {
    try {
        const jsonOutput = typeof output === 'string' ? JSON.parse(output) : output;
        const parsedOutput = quizOutputSchema.safeParse(jsonOutput);

        if (!parsedOutput.success) {
            console.error('[Quiz Output] Invalid structured output from AI.', parsedOutput.error.issues);
            console.warn('[Quiz Output] Output format:', JSON.stringify(jsonOutput).substring(0, 200));
            return null;
        }

        return parsedOutput.data;
    } catch (error) {
        console.error('[Quiz Output] Error parsing structured output:', error);
        return null;
    }
};
