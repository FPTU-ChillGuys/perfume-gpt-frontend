import { aiApiInstance } from "@/lib/api";
import type { AiInstructionResponse } from "@/types/aiInstruction";

class AiInstructionService {
    async getInstructions(): Promise<AiInstructionResponse> {
        try {
            const response = await aiApiInstance.GET("/admin/instructions", {});
            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch AI instructions");
            }
            return response.data as AiInstructionResponse;
        } catch (error: any) {
            console.error("Error fetching AI instructions:", error);
            throw new Error(
                error.response?.data?.error || error.message || "Failed to fetch AI instructions"
            );
        }
    }
}

export const aiInstructionService = new AiInstructionService();
