import { aiApiInstance } from "@/lib/api";
import type {
    SurveyQuestionRequest,
    SurveyAnswerRequest,
    SurveyQuestionsResponse,
    SurveyQuestionResponse,
    CreateSurveyQuestionResponse,
    CheckFirstTimeResponse,
    SurveyQuesAnsDetailRequest,
    SubmitSurveyResponse,
    UserSurveyRecordResponse,
    QuestionType
} from "@/types/survey";


class SurveyService {

    // 1. GET /surveyzes/questions
    async getQuestions(): Promise<SurveyQuestionsResponse> {
        try {
            const response = await aiApiInstance.GET("/surveyzes/questions", {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch survey questions");
            }
            return response.data as SurveyQuestionsResponse;
        } catch (error: any) {
            console.error("Error fetching survey questions:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch survey questions");
        }
    }

    // 2. GET /surveyzes/questions/{id}
    async getQuestionById(id: string): Promise<SurveyQuestionResponse> {
        try {
            const response = await aiApiInstance.GET(`/surveyzes/questions/${id}`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch survey question");
            }
            return response.data as SurveyQuestionResponse;
        } catch (error: any) {
            console.error("Error fetching survey question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch survey question");
        }
    }

    // 3. POST /surveyzes/questions
    async createQuestion(data: SurveyQuestionRequest): Promise<CreateSurveyQuestionResponse> {
        try {
            const response = await aiApiInstance.POST("/surveyzes/questions", {
                body: data
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to create survey question");
            }
            return response.data as CreateSurveyQuestionResponse;
        } catch (error: any) {
            console.error("Error creating survey question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to create survey question");
        }
    }

    // 3.5. POST /surveyzes/questions/list
    async createQuestions(data: SurveyQuestionRequest[]): Promise<any> {
        try {
            const response = await aiApiInstance.POST("/surveyzes/questions/list", {
                body: data
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to create survey questions");
            }
            return response.data;
        } catch (error: any) {
            console.error("Error creating survey questions:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to create survey questions");
        }
    }


    // 4. PUT /surveyzes/questions/{id} — update question, questionType, answers
    async updateQuestion(id: string, payload: { question: string; questionType?: QuestionType; answers: SurveyAnswerRequest[] }): Promise<any> {
        try {
            const response = await aiApiInstance.PUT(`/surveyzes/questions/${id}`, {
                body: payload
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to update survey question");
            }
            return response.data;
        } catch (error: any) {
            console.error("Error updating survey question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to update survey question");
        }
    }

    // 5. GET /surveyzes/user/{userId}/check-first-time
    async checkFirstTime(userId: string): Promise<CheckFirstTimeResponse> {
        try {
            const response = await aiApiInstance.GET(`/surveyzes/user/${userId}/check-first-time`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to check first time status");
            }
            return response.data as CheckFirstTimeResponse;
        } catch (error: any) {
            console.error("Error checking first time status:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to check first time status");
        }
    }

    // 6. POST /surveyzes/user?userId={userId}
    async submitSurveyAndGetAI(userId: string, answers: SurveyQuesAnsDetailRequest[]): Promise<SubmitSurveyResponse> {
        try {
            const response = await aiApiInstance.POST("/surveyzes/user", {
                params: {
                    query: { userId }
                },
                body: answers
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to submit survey");
            }
            return response.data as SubmitSurveyResponse;
        } catch (error: any) {
            console.error("Error submitting survey:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to submit survey");
        }
    }

    // 7. POST /surveyzes/user/v2?userId={userId}
    async submitSurveyV2(userId: string, answers: SurveyQuesAnsDetailRequest[]): Promise<SubmitSurveyResponse> {
        try {
            const response = await aiApiInstance.POST("/surveyzes/user/v2", {
                params: {
                    query: { userId }
                },
                body: answers
            });

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to submit survey V2");
            }
            return response.data as SubmitSurveyResponse;
        } catch (error: any) {
            console.error("Error submitting survey V2:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to submit survey V2");
        }
    }

    // 8. GET /surveyzes/user/{userId}
    async getUserSurveyRecord(userId: string): Promise<UserSurveyRecordResponse> {
        try {
            const response = await aiApiInstance.GET(`/surveyzes/user/${userId}`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch user survey record");
            }
            return response.data as UserSurveyRecordResponse;
        } catch (error: any) {
            console.error("Error fetching user survey record:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch user survey record");
        }
    }

    // 9. DELETE /surveyzes/questions/{id} (soft delete)
    async deleteQuestion(id: string): Promise<{ success: boolean; error: string | null; data: boolean }> {
        try {
            const response = await aiApiInstance.DELETE(`/surveyzes/questions/${id}`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to delete survey question");
            }
            return response.data as { success: boolean; error: string | null; data: boolean };
        } catch (error: any) {
            console.error("Error deleting survey question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to delete survey question");
        }
    }
}

export const surveyService = new SurveyService();
