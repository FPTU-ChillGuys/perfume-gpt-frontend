import { aiApiInstance } from "@/lib/api";
import type { AiAcceptanceRecord } from "@/types/chatbot";

class AiAcceptanceService {
    /**
     * Get all AI acceptance records
     */
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

    /**
     * Get acceptance rate by status and context
     */
    async getAcceptanceRate(isAccepted: boolean, contextType?: string): Promise<number> {
        try {
            const response = await aiApiInstance.GET("/ai-acceptance/rate", {
                params: { 
                    query: { 
                        isAccepted: String(isAccepted),
                        contextType: contextType as any
                    } 
                }
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

    /**
     * Update AI acceptance record status
     */
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
     * Mark AI acceptance record as accepted by clicking or adding to cart
     */
    async clickAIAcceptance(aiAcceptanceId: string): Promise<AiAcceptanceRecord> {
        try {
            const response = await aiApiInstance.POST("/ai-acceptance/click/{aiAcceptanceId}", {
                params: {
                    path: { aiAcceptanceId }
                }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to mark AI acceptance as clicked");
            }
            return response.data.data;
        } catch (error: any) {
            console.error("Error clicking AI acceptance:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to mark AI acceptance as clicked"
            );
        }
    }
}

export const aiAcceptanceService = new AiAcceptanceService();
