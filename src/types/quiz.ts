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
