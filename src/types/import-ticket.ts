import type { components } from "./api/v1";

export type ImportStatus = components["schemas"]["ImportStatus"];
export type ImportTicketResponse =
  components["schemas"]["BaseResponseOfImportTicketResponse"];
export type ImportTicketsResponse =
  components["schemas"]["BaseResponseOfPagedResultOfImportTicketListItem"];
export type ImportTicket = components["schemas"]["ImportTicketListItem"];
export type ImportTicketStatus = components["schemas"]["ImportStatus"];
export type ImportTicketDetail = components["schemas"]["ImportTicketResponse"];
export type ImportDetailData = components["schemas"]["ImportDetailResponse"];
export type Batch = components["schemas"]["BatchResponse"];
export type VerifyTicketRequest =
  components["schemas"]["VerifyImportTicketRequest"];
export type VerifyImportDetail =
  components["schemas"]["VerifyImportDetailRequest"];
export type VerifyBatch = components["schemas"]["CreateBatchRequest"];
export type CreateImportDetailRequestPayload =
  components["schemas"]["CreateImportDetailRequest"];
export type CreateImportTicketRequestPayload =
  components["schemas"]["CreateImportTicketRequest"];

export interface ImportDetail {
  variantId: string;
  quantity: number;
  unitPrice: number;
}

// Response từ Excel upload API
export interface ExcelUploadResponse {
  payload: {
    importDetails: {
      variantId: string;
      expectedQuantity: number;
      unitPrice: number;
    }[];
    supplierId: number;
    expectedArrivalDate: string;
  };
  success: boolean;
  message: string;
  errors: string[];
  errorType?: string;
}
