import axiosInstance from "../lib/axios";

interface ImportDetail {
  variantId: string;
  quantity: number;
  unitPrice: number;
}

interface ImportTicketResponse {
  payload: null;
  success: boolean;
  message: string;
  errors: string[];
  errorType: string;
}

export interface ImportTicket {
  id: string;
  createdByName: string;
  verifiedByName: string | null;
  supplierName: string;
  importDate: string;
  totalCost: number;
  status: "Pending" | "InProgress" | "Completed" | "Canceled";
  totalItems: number;
  createdAt: string;
}

export interface ImportTicketsResponse {
  payload: {
    items: ImportTicket[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  success: boolean;
  message: string;
  errors: string[];
  errorType: string;
}

export interface Batch {
  id: string;
  batchCode: string;
  manufactureDate: string;
  expiryDate: string;
  importQuantity: number;
  remainingQuantity: number;
  createdAt: string;
}

export interface ImportDetailData {
  id: string;
  variantId: string;
  variantName: string;
  variantSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rejectQuantity: number;
  note: string | null;
  batches: Batch[];
}

export interface ImportTicketDetail {
  id: string;
  createdById: string;
  createdByName: string;
  verifiedById: string | null;
  verifiedByName: string | null;
  supplierId: number;
  supplierName: string;
  importDate: string;
  totalCost: number;
  status: "Pending" | "InProgress" | "Completed" | "Canceled" | "Rejected";
  createdAt: string;
  importDetails: ImportDetailData[];
}

export interface ImportTicketDetailResponse {
  payload: ImportTicketDetail;
  success: boolean;
  message: string;
  errors: string[];
  errorType: string;
}

export interface VerifyBatch {
  batchCode: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
}

export interface VerifyImportDetail {
  importDetailId: string;
  rejectQuantity: number;
  note: string | null;
  batches: VerifyBatch[];
}

export interface VerifyTicketRequest {
  importDetails: VerifyImportDetail[];
}

class ImportStockService {
  private readonly IMPORT_ENDPOINT = "/api/importtickets";

  async createImportTicket(
    supplierId: number,
    importDate: string,
    importDetails: ImportDetail[],
  ): Promise<ImportTicketResponse> {
    try {
      if (
        !supplierId ||
        !importDate ||
        !importDetails ||
        importDetails.length === 0
      ) {
        throw new Error(
          "Invalid request: supplierId, importDate, and importDetails are required",
        );
      }

      const validatedDetails = importDetails.filter(
        (item) => item.variantId && item.quantity > 0 && item.unitPrice >= 0,
      );

      if (validatedDetails.length === 0) {
        throw new Error(
          "All items must have valid SKU, quantity > 0, and unit price >= 0",
        );
      }

      const payload = {
        supplierId: supplierId,
        importDate: importDate,
        importDetails: validatedDetails.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const response = await axiosInstance.post<ImportTicketResponse>(
        this.IMPORT_ENDPOINT,
        payload,
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Import ticket creation failed",
        );
      }

      return response.data;
    } catch (error: any) {
      console.error("Import ticket error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.join(", ") ||
        error.message ||
        "Failed to create import ticket";
      throw new Error(errorMessage);
    }
  }

  async getImportTickets(
    pageNumber: number = 1,
    pageSize: number = 10,
    status?: string,
  ): Promise<ImportTicketsResponse> {
    try {
      const params: any = {
        pageNumber,
        pageSize,
      };

      if (status) {
        params.status = status;
      }

      const response = await axiosInstance.get<ImportTicketsResponse>(
        this.IMPORT_ENDPOINT,
        { params },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch import tickets",
        );
      }

      return response.data;
    } catch (error: any) {
      console.error("Get import tickets error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch import tickets";
      throw new Error(errorMessage);
    }
  }

  async getImportTicketDetail(
    ticketId: string,
  ): Promise<ImportTicketDetailResponse> {
    try {
      const response = await axiosInstance.get<ImportTicketDetailResponse>(
        `${this.IMPORT_ENDPOINT}/${ticketId}`,
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch ticket detail",
        );
      }

      return response.data;
    } catch (error: any) {
      console.error("Get ticket detail error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch ticket detail";
      throw new Error(errorMessage);
    }
  }

  async updateTicketStatus(
    ticketId: string,
    status: "Pending" | "InProgress" | "Completed" | "Canceled" | "Rejected",
  ): Promise<ImportTicketResponse> {
    try {
      const response = await axiosInstance.put<ImportTicketResponse>(
        `${this.IMPORT_ENDPOINT}/${ticketId}/status`,
        { status },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to update ticket status",
        );
      }

      return response.data;
    } catch (error: any) {
      console.error("Update ticket status error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update ticket status";
      throw new Error(errorMessage);
    }
  }

  async verifyTicket(
    ticketId: string,
    verifyData: VerifyTicketRequest,
  ): Promise<ImportTicketResponse> {
    try {
      const response = await axiosInstance.post<ImportTicketResponse>(
        `${this.IMPORT_ENDPOINT}/${ticketId}/verify`,
        verifyData,
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to verify ticket");
      }

      return response.data;
    } catch (error: any) {
      console.error("Verify ticket error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to verify ticket";
      throw new Error(errorMessage);
    }
  }
}

export const importStockService = new ImportStockService();
