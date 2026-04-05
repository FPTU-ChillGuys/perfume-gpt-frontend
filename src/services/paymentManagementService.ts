import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type PaymentMethod = components["schemas"]["PaymentMethod"];
export type TransactionType = components["schemas"]["TransactionType"];
export type TransactionStatus = components["schemas"]["TransactionStatus"];
export type PaymentTransactionOverviewResponse =
  components["schemas"]["PaymentTransactionOverviewResponse"];

export interface GetManagementTransactionsParams {
  FromDate?: string;
  ToDate?: string;
  PaymentMethod?: PaymentMethod;
  TransactionType?: TransactionType;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
}

const EMPTY_OVERVIEW: PaymentTransactionOverviewResponse = {
  summary: {},
  transactions: {
    items: [],
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

class PaymentManagementService {
  async getManagementTransactions(
    params: GetManagementTransactionsParams,
  ): Promise<PaymentTransactionOverviewResponse> {
    const response = await apiInstance.GET(
      "/api/payments/management-transactions",
      {
        params: { query: params },
      },
    );

    if (!response.data?.success) {
      const errorDetails = response.data?.errors?.join("; ");
      throw new Error(
        errorDetails ||
          response.data?.message ||
          "Không thể tải dữ liệu giao dịch thu chi",
      );
    }

    return response.data.payload ?? EMPTY_OVERVIEW;
  }
}

export const paymentManagementService = new PaymentManagementService();
