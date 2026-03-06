import { aiApiInstance } from "@/lib/api";
import type {
    QuizQuestionRequest,
    QuizAnswerRequest,
    QuizQuestionsResponse,
    QuizQuestionResponse,
    CreateQuizQuestionResponse,
    CheckFirstTimeResponse,
    QuizQuesAnsDetailRequest,
    SubmitQuizResponse,
    UserQuizRecordResponse,
    QuestionType
} from "@/types/quiz";


class QuizService {
    // 1. GET /quizzes/questions
    async getQuestions(): Promise<QuizQuestionsResponse> {
        try {
            const response = await aiApiInstance.GET("/quizzes/questions", {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch quiz questions");
            }
            return response.data as QuizQuestionsResponse;
        } catch (error: any) {
            console.error("Error fetching quiz questions:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch quiz questions");
        }
    }

    // 2. GET /quizzes/questions/{id}
    async getQuestionById(id: string): Promise<QuizQuestionResponse> {
        try {
            const response = await aiApiInstance.GET(`/quizzes/questions/${id}`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch quiz question");
            }
            return response.data as QuizQuestionResponse;
        } catch (error: any) {
            console.error("Error fetching quiz question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch quiz question");
        }
    }

    // 3. POST /quizzes/questions
    async createQuestion(data: QuizQuestionRequest): Promise<CreateQuizQuestionResponse> {
        try {
            const response = await aiApiInstance.POST("/quizzes/questions", {
                body: data
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to create quiz question");
            }
            return response.data as CreateQuizQuestionResponse;
        } catch (error: any) {
            console.error("Error creating quiz question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to create quiz question");
        }
    }

    // 3.5. POST /quizzes/questions/list
    async createQuestions(data: QuizQuestionRequest[]): Promise<any> {
        try {
            const response = await aiApiInstance.POST("/quizzes/questions/list", {
                body: data
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to create quiz questions");
            }
            return response.data;
        } catch (error: any) {
            console.error("Error creating quiz questions:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to create quiz questions");
        }
    }


    // 4. PUT /quizzes/questions/{id} — update question, questionType, answers
    async updateQuestion(id: string, payload: { question: string; questionType?: QuestionType; answers: QuizAnswerRequest[] }): Promise<any> {
        try {
            const response = await aiApiInstance.PUT(`/quizzes/questions/${id}`, {
                body: payload
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to update quiz question");
            }
            return response.data;
        } catch (error: any) {
            console.error("Error updating quiz question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to update quiz question");
        }
    }

    // 5. GET /quizzes/user/{userId}/check-first-time
    async checkFirstTime(userId: string): Promise<CheckFirstTimeResponse> {
        try {
            const response = await aiApiInstance.GET(`/quizzes/user/${userId}/check-first-time`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to check first time status");
            }
            return response.data as CheckFirstTimeResponse;
        } catch (error: any) {
            console.error("Error checking first time status:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to check first time status");
        }
    }

    // 6. POST /quizzes/user?userId={userId}
    async submitQuizAndGetAI(userId: string, answers: QuizQuesAnsDetailRequest[]): Promise<SubmitQuizResponse> {
        try {
            const response = await aiApiInstance.POST("/quizzes/user", {
                params: {
                    query: { userId }
                },
                body: answers
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to submit quiz");
            }
            return response.data as SubmitQuizResponse;
        } catch (error: any) {
            console.error("Error submitting quiz:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to submit quiz");
        }
    }

    // 7. POST /quizzes/user/v2?userId={userId}
    async submitQuizV2(userId: string, answers: QuizQuesAnsDetailRequest[]): Promise<SubmitQuizResponse> {
        try {
            const response = await aiApiInstance.POST("/quizzes/user/v2", {
                params: {
                    query: { userId }
                },
                body: answers
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to submit quiz V2");
            }
            return response.data as SubmitQuizResponse;
        } catch (error: any) {
            console.error("Error submitting quiz V2:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to submit quiz V2");
        }
    }

    // 8. GET /quizzes/user/{userId}
    async getUserQuizRecord(userId: string): Promise<UserQuizRecordResponse> {
        try {
            const response = await aiApiInstance.GET(`/quizzes/user/${userId}`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch user quiz record");
            }
            return response.data as UserQuizRecordResponse;
        } catch (error: any) {
            console.error("Error fetching user quiz record:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch user quiz record");
        }
    }

    // 9. DELETE /quizzes/questions/{id} (soft delete)
    async deleteQuestion(id: string): Promise<{ success: boolean; error: string | null; data: boolean }> {
        try {
            const response = await aiApiInstance.DELETE(`/quizzes/questions/${id}`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to delete quiz question");
            }
            return response.data as { success: boolean; error: string | null; data: boolean };
        } catch (error: any) {
            console.error("Error deleting quiz question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to delete quiz question");
        }
    }
}

export const quizService = new QuizService();
