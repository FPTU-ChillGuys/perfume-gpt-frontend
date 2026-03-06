import { aiApiInstance } from "@/lib/api";
import type { AiInstructionResponse, AiInstructionSingleResponse } from "@/types/aiInstruction";

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

    async updateInstruction(id: string, instruction: string, instructionType: string): Promise<AiInstructionSingleResponse> {
        try {
            const response = await aiApiInstance.PUT(`/admin/instructions/${id}`, {
                body: {
                    instruction: instruction,
                    instructionType: instructionType
                }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to update AI instruction");
            }
            return response.data as AiInstructionSingleResponse;
        } catch (error: any) {
            console.error("Error updating AI instruction:", error);
            throw new Error(
                error.response?.data?.error || error.message || "Failed to update AI instruction"
            );
        }
    }
}

export const aiInstructionService = new AiInstructionService();
