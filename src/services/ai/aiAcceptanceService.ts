import { aiApiInstance } from "@/lib/api";
import type { AiAcceptanceRecord } from "@/types/chatbot";

class AiAcceptanceService {
    async getAllAcceptanceStatus(): Promise<AiAcceptanceRecord[]> {
        try {
            const response = await aiApiInstance.GET("/ai-acceptance/status/all", {});
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to get all AI acceptance status");
            }
            return response.data.data ?? [];
        } catch (error: any) {
            console.error("Error fetching all AI acceptance status:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to get all AI acceptance status"
            );
        }
    }

    async getAcceptanceStatusByUserId(userId: string): Promise<AiAcceptanceRecord> {
        try {
            const response = await aiApiInstance.GET("/ai-acceptance/status/{userId}", {
                params: { path: { userId } }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to get AI acceptance status");
            }
            return response.data.data;
        } catch (error: any) {
            console.error("Error fetching AI acceptance status:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to get AI acceptance status"
            );
        }
    }

    async getAcceptanceRate(isAccepted: boolean): Promise<number> {
        try {
            const response = await aiApiInstance.GET("/ai-acceptance/rate", {
                params: { query: { isAccepted: String(isAccepted) } }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to get AI acceptance rate");
            }
            return response.data.data;
        } catch (error: any) {
            console.error("Error fetching AI acceptance rate:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to get AI acceptance rate"
            );
        }
    }

    async getAcceptanceRateByUserId(userId: string): Promise<number> {
        try {
            const response = await aiApiInstance.GET("/ai-acceptance/rate/{userId}", {
                params: { path: { userId } }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to get AI acceptance rate by user");
            }
            return response.data.data;
        } catch (error: any) {
            console.error("Error fetching AI acceptance rate by user:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to get AI acceptance rate by user"
            );
        }
    }

    async createAcceptanceRecord(userId: string, isAccepted: boolean = false): Promise<AiAcceptanceRecord> {
        try {
            const response = await aiApiInstance.POST("/ai-acceptance/record/{userId}", {
                params: {
                    path: { userId },
                    query: { isAccepted: String(isAccepted) }
                }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to create AI acceptance record");
            }
            return response.data.data;
        } catch (error: any) {
            console.error("Error creating AI acceptance record:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to create AI acceptance record"
            );
        }
    }

    async updateAcceptanceRecord(id: string, status: boolean): Promise<AiAcceptanceRecord> {
        try {
            const response = await aiApiInstance.POST("/ai-acceptance/{id}", {
                params: {
                    path: { id },
                    query: { status: String(status) }
                }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to update AI acceptance status");
            }
            return response.data.data;
        } catch (error: any) {
            console.error("Error updating AI acceptance status:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to update AI acceptance status"
            );
        }
    }

    /**
     * Create AI acceptance record cho checkout flow
     * Lúc này trạng thái là false (draft)
     */
    async createCheckoutAcceptance(userId: string, cartItemId: string): Promise<AiAcceptanceRecord> {
        try {
            const response = await aiApiInstance.POST("/ai-acceptance/record/{userId}", {
                params: {
                    path: { userId },
                    query: { cartItemId , status: String(false) }
                },
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to create checkout acceptance");
            }
            return response.data.data;
        } catch (error: any) {
            console.error("Error creating checkout acceptance:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to create checkout acceptance"
            );
        }
    }

    /**
     * Get AI acceptance records cho user với cartItemId và status filters
     */
    async getAcceptancesByUserAndCart(userId: string, cartItemId?: string, status?: boolean): Promise<AiAcceptanceRecord[]> {
        try {
            const queryParams: Record<string, string> = {};
            if (cartItemId) queryParams.cartItemId = cartItemId;
            if (status !== undefined) queryParams.status = String(status);

            const response = await aiApiInstance.GET("/ai-acceptance/user/{userId}", {
                params: {
                    path: { userId },
                    query: queryParams
                }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to get user acceptances");
            }
            return response.data.data ?? [];
        } catch (error: any) {
            console.error("Error fetching user acceptances:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to get user acceptances"
            );
        }
    }

    /**
     * Update AI acceptance records khi checkout thành công
     * Set status = true cho cartItemId
     */
    async updateCheckoutAcceptance(userId: string, cartItemId: string, status: boolean = true): Promise<AiAcceptanceRecord> {
        try {
            const response = await aiApiInstance.PUT("/ai-acceptance/user/{userId}", {
                params: {
                    path: { userId },
                    query: { cartItemId, status: String(status) }
                },
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to update checkout acceptance");
            }
            return response.data.data;
        } catch (error: any) {
            console.error("Error updating checkout acceptance:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to update checkout acceptance"
            );
        }
    }
}

export const aiAcceptanceService = new AiAcceptanceService();
