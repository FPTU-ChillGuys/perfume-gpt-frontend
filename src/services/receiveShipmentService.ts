import axiosInstance from "../lib/axios";

export interface ImportTicketItem {
  id: string;
  createdByName: string;
  supplierName: string;
  importDate: string;
  totalCost: number;
  status: string;
  totalItems: number;
  createdAt: string;
}

export interface ImportTicketsResponse {
  payload: {
    items: ImportTicketItem[];
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

export interface BatchData {
  id: string;
  batchCode: string;
  manufactureDate: string;
  expiryDate: string;
  importQuantity: number;
  remainingQuantity: number;
  createdAt: string;
}

export interface BatchVerifyData {
  batchCode: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
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
  batches: BatchData[];
}

export interface ConfirmationBatchItem extends BatchVerifyData {
  // Additional fields for UI
}

export interface ConfirmationImportDetail {
  id: string;
  variantName: string;
  variantSku: string;
  quantity: number;
  rejectQuantity: number;
  note: string | null;
  batches: BatchVerifyData[];
}

export interface ImportTicketDetailResponse {
  payload: {
    id: string;
    createdById: string;
    createdByName: string;
    verifiedById: string | null;
    verifiedByName: string | null;
    supplierId: number;
    supplierName: string;
    importDate: string;
    totalCost: number;
    status: string;
    createdAt: string;
    importDetails: ImportDetailData[];
  };
  success: boolean;
  message: string;
  errors: string[];
  errorType: string;
}

export interface ImportDetailVerify {
  importDetailId: string;
  acceptedQuantity: number;
  rejectQuantity: number;
  note: string | null;
  batches: BatchVerifyData[];
}

export interface VerifyTicketRequest {
  importDetails: ImportDetailVerify[];
}

export interface VerifyTicketResponse {
  payload: null;
  success: boolean;
  message: string;
  errors: string[];
  errorType: string;
}

class ReceiveShipmentService {
  private readonly ENDPOINT = "/api/importtickets";

  async getImportTickets(
    supplierId?: number,
    status?: string,
    pageNumber: number = 1,
    pageSize: number = 10,
    isDescending: boolean = true
  ): Promise<ImportTicketsResponse> {
    try {
      const params = new URLSearchParams();
      if (supplierId) params.append("SupplierId", supplierId.toString());
      if (status) params.append("Status", status);
      params.append("PageNumber", pageNumber.toString());
      params.append("PageSize", pageSize.toString());
      params.append("IsDescending", isDescending.toString());

      const url = `${this.ENDPOINT}?${params.toString()}`;
      const response = await axiosInstance.get<ImportTicketsResponse>(url);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch import tickets");
      }

      return response.data;
    } catch (error: any) {
      console.error("Get import tickets error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch import tickets"
      );
    }
  }

  async getImportTicketDetail(ticketId: string): Promise<ImportTicketDetailResponse> {
    try {
      const response = await axiosInstance.get<ImportTicketDetailResponse>(
        `${this.ENDPOINT}/${ticketId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch ticket details");
      }

      return response.data;
    } catch (error: any) {
      console.error("Get ticket detail error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch ticket details"
      );
    }
  }

  async verifyTicket(
    ticketId: string,
    importDetails: ImportDetailVerify[]
  ): Promise<VerifyTicketResponse> {
    try {
      const payload: VerifyTicketRequest = {
        importDetails,
      };

      const response = await axiosInstance.post<VerifyTicketResponse>(
        `${this.ENDPOINT}/verify/${ticketId}`,
        payload
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Verification failed");
      }

      return response.data;
    } catch (error: any) {
      console.error("Verify ticket error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to verify ticket"
      );
    }
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<VerifyTicketResponse> {
    try {
      const response = await axiosInstance.put<VerifyTicketResponse>(
        `${this.ENDPOINT}/status/${ticketId}`,
        { status }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to update ticket status");
      }

      return response.data;
    } catch (error: any) {
      console.error("Update ticket status error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update ticket status"
      );
    }
  }
}

export const receiveShipmentService = new ReceiveShipmentService();
