import { aiApiInstance } from "@/lib/api";

class AiAcceptanceService {
    async createAcceptanceRecord(userId: string): Promise<string> {
        try {
            const response = await aiApiInstance.POST("/ai-acceptance/record/{userId}", {
                params: {
                    path: { userId }
                }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to create AI acceptance record");
            }
            return response.data.data.id;
        } catch (error: any) {
            console.error("Error creating AI acceptance record:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to create AI acceptance record"
            );
        }
    }

    async updateAcceptanceRecord(id: string): Promise<void> {
        try {
            const response = await aiApiInstance.POST("/ai-acceptance/{id}", {
                params: {
                    path: { id },
                    query: { status: true } // query parameter status=true
                }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to update AI acceptance status");
            }
        } catch (error: any) {
            console.error("Error updating AI acceptance status:", error);
            throw new Error(
                error.response?.data?.message || error.message || "Failed to update AI acceptance status"
            );
        }
    }
}

export const aiAcceptanceService = new AiAcceptanceService();
