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

export interface ImportDetail {
  variantId: string;
  quantity: number;
  unitPrice: number;
}
