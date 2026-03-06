export interface AiInstruction {
    id: string;
    instruction: string;
    instructionType: string;
    createdAt: string;
    updatedAt: string;
}

export interface AiInstructionResponse {
    success: boolean;
    error: string | null;
    data: AiInstruction[];
}

export interface AiInstructionSingleResponse {
    success: boolean;
    error: string | null;
}
