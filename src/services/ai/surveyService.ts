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
    QuestionType,
    SurveyAttributeTypeInfo,
    SurveyAttributeValuesResponse,
    CreateQuestionFromAttributeRequest,
} from "@/types/survey";


class SurveyService {

    // 1. GET /surveys/questions
    async getQuestions(): Promise<SurveyQuestionsResponse> {
        try {
            const response = await aiApiInstance.GET("/surveys/questions", {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch survey questions");
            }
            return response.data as SurveyQuestionsResponse;
        } catch (error: any) {
            console.error("Error fetching survey questions:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch survey questions");
        }
    }

    // 2. GET /surveys/questions/{id}
    async getQuestionById(id: string): Promise<SurveyQuestionResponse> {
        try {
            const response = await aiApiInstance.GET(`/surveys/questions/${id}`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch survey question");
            }
            return response.data as SurveyQuestionResponse;
        } catch (error: any) {
            console.error("Error fetching survey question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch survey question");
        }
    }

    // 3. POST /surveys/questions
    async createQuestion(data: SurveyQuestionRequest): Promise<CreateSurveyQuestionResponse> {
        try {
            const response = await aiApiInstance.POST("/surveys/questions", {
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

    // 3.5. POST /surveys/questions/list
    async createQuestions(data: SurveyQuestionRequest[]): Promise<any> {
        try {
            const response = await aiApiInstance.POST("/surveys/questions/list", {
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


    // 4. PUT /surveys/questions/{id} — update question, questionType, answers
    async updateQuestion(id: string, payload: { question: string; questionType?: QuestionType; answers: SurveyAnswerRequest[] }): Promise<any> {
        try {
            const response = await aiApiInstance.PUT(`/surveys/questions/${id}`, {
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

    // 5. GET /surveys/user/{userId}/check-first-time
    async checkFirstTime(userId: string): Promise<CheckFirstTimeResponse> {
        try {
            const response = await aiApiInstance.GET(`/surveys/user/${userId}/check-first-time`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to check first time status");
            }
            return response.data as CheckFirstTimeResponse;
        } catch (error: any) {
            console.error("Error checking first time status:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to check first time status");
        }
    }

    // 6. POST /surveys/user?userId={userId}
    async submitSurveyAndGetAI(userId: string, answers: SurveyQuesAnsDetailRequest[]): Promise<SubmitSurveyResponse> {
        try {
            const response = await aiApiInstance.POST("/surveys/user", {
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

    // 7. POST /surveys/user/v3?userId={userId}
    async submitSurveyV2(userId: string, answers: SurveyQuesAnsDetailRequest[]): Promise<SubmitSurveyResponse> {
        try {
            const response = await aiApiInstance.POST("/surveys/user/v3", {
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

    // 8. GET /surveys/user/{userId}
    async getUserSurveyRecord(userId: string): Promise<UserSurveyRecordResponse> {
        try {
            const response = await aiApiInstance.GET(`/surveys/user/${userId}`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch user survey record");
            }
            return response.data as UserSurveyRecordResponse;
        } catch (error: any) {
            console.error("Error fetching user survey record:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch user survey record");
        }
    }

    // 9. DELETE /surveys/questions/{id} (soft delete)
    async deleteQuestion(id: string): Promise<{ success: boolean; error: string | null; data: boolean }> {
        try {
            const response = await aiApiInstance.DELETE(`/surveys/questions/${id}`, {});

            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to delete survey question");
            }
            return response.data as { success: boolean; error: string | null; data: boolean };
        } catch (error: any) {
            console.error("Error deleting survey question:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to delete survey question");
        }
    }

    // ============ Survey V4 — Query-based APIs ============

    // 10. GET /surveys/attributes — lấy danh sách loại thuộc tính
    async getAttributeTypes(): Promise<{ success: boolean; data: SurveyAttributeTypeInfo[] }> {
        try {
            const response = await aiApiInstance.GET("/surveys/attributes", {});
            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch attribute types");
            }
            return response.data as { success: boolean; data: SurveyAttributeTypeInfo[] };
        } catch (error: any) {
            console.error("Error fetching attribute types:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch attribute types");
        }
    }

    // 11. GET /surveys/attributes/:type/values — lấy giá trị của 1 loại thuộc tính
    async getAttributeValues(type: string): Promise<{ success: boolean; data: SurveyAttributeValuesResponse }> {
        try {
            const response = await aiApiInstance.GET(`/surveys/attributes/${type}/values`, {});
            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch attribute values");
            }
            return response.data as { success: boolean; data: SurveyAttributeValuesResponse };
        } catch (error: any) {
            console.error("Error fetching attribute values:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch attribute values");
        }
    }

    // 12. POST /surveys/questions/from-attribute — tạo câu hỏi từ thuộc tính
    async createQuestionFromAttribute(data: CreateQuestionFromAttributeRequest): Promise<CreateSurveyQuestionResponse> {
        try {
            const response = await aiApiInstance.POST("/surveys/questions/from-attribute", {
                body: data
            });
            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to create question from attribute");
            }
            return response.data as CreateSurveyQuestionResponse;
        } catch (error: any) {
            console.error("Error creating question from attribute:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to create question from attribute");
        }
    }

    // 13. POST /surveys/user/v4?userId={userId} — submit survey V4 (query-based)
    async submitSurveyV4(userId: string, answers: SurveyQuesAnsDetailRequest[]): Promise<SubmitSurveyResponse> {
        try {
            const response = await aiApiInstance.POST("/surveys/user/v4", {
                params: {
                    query: { userId }
                },
                body: answers
            });
            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to submit survey V4");
            }
            return response.data as SubmitSurveyResponse;
        } catch (error: any) {
            console.error("Error submitting survey V4:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to submit survey V4");
        }
    }
}

export const surveyService = new SurveyService();

