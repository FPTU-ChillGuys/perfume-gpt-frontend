import { apiInstance } from "@/lib/api";
import type {
  CreateImportTicketRequestPayload,
  ExcelUploadResponse,
  ImportDetail,
  ImportTicketResponse,
  ImportTicketsResponse,
  ImportTicketStatus,
  VerifyTicketRequest,
} from "@/types/import-ticket";

class ImportStockService {
  private readonly IMPORT_ENDPOINT = "/api/importtickets";

  private extractApiErrorMessage(
    apiResult: unknown,
    fallbackMessage: string,
  ): string {
    const payload = apiResult as {
      message?: string;
      error?: { message?: string; errors?: string[] | null };
      errors?: string[] | null;
    };

    return (
      payload?.message ||
      payload?.error?.message ||
      payload?.errors?.join(", ") ||
      payload?.error?.errors?.join(", ") ||
      fallbackMessage
    );
  }

  async createImportTicket(
    supplierId: number,
    importDetails: ImportDetail[],
    expectedArrivalDate: string,
  ): Promise<string> {
    try {
      if (
        !supplierId ||
        !expectedArrivalDate ||
        !importDetails ||
        importDetails.length === 0
      ) {
        throw new Error(
          "Vui lòng cung cấp đầy đủ thông tin nhà cung cấp, ngày dự kiến nhận và chi tiết nhập kho",
        );
      }

      const validatedDetails = importDetails.filter(
        (item) => item.variantId && item.quantity > 0 && item.unitPrice >= 0,
      );

      if (validatedDetails.length === 0) {
        throw new Error(
          "Mọi chi tiết nhập kho phải có mã sản phẩm, số lượng lớn hơn 0 và giá đơn vị không âm",
        );
      }

      const importTime = Date.parse(new Date().toISOString().split("T")[0]!);
      const expectedTime = Date.parse(expectedArrivalDate);

      if (
        !Number.isNaN(importTime) &&
        !Number.isNaN(expectedTime) &&
        expectedTime < importTime
      ) {
        throw new Error("Ngày dự kiến nhận không thể trước ngày tạo đơn");
      }

      const payload = {
        supplierId: supplierId,
        expectedArrivalDate: expectedArrivalDate,
        importDetails: validatedDetails.map((item) => ({
          variantId: item.variantId,
          expectedQuantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      //const response = await axiosInstance.post<ImportTicketResponse>(this.IMPORT_ENDPOINT,payload,);
      const response = await apiInstance.POST(this.IMPORT_ENDPOINT, {
        body: payload,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Import ticket creation failed",
        );
      }

      return response.data.payload!;
    } catch (error: any) {
      console.error("Tạo đơn nhập kho thất bại:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.join(", ") ||
        error.message ||
        "Tạo đơn nhập kho thất bại";
      throw new Error(errorMessage);
    }
  }

  async getImportTickets(
    pageNumber: number = 1,
    pageSize: number = 10,
    status?: string,
    verifiedById?: string,
  ): Promise<ImportTicketsResponse> {
    try {
      const params: any = {
        pageNumber,
        pageSize,
      };

      if (status) {
        params.status = status;
      }

      if (verifiedById) {
        params.VerifiedById = verifiedById;
      }

      const response = await apiInstance.GET("/api/importtickets", {
        params: {
          query: params,
        },
      });

      if (!response.data!.success) {
        throw new Error(
          response.data?.message || "Tải danh sách đơn nhập kho thất bại",
        );
      }

      return response.data!;
    } catch (error: any) {
      console.error("Tải danh sách đơn nhập kho thất bại:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Tải danh sách đơn nhập kho thất bại";
      throw new Error(errorMessage);
    }
  }

  async getImportTicketDetail(ticketId: string): Promise<ImportTicketResponse> {
    try {
      //const response = await axiosInstance.get<ImportTicketResponse>(`${this.IMPORT_ENDPOINT}/${ticketId}`,);
      const response = await apiInstance.GET(`/api/importtickets/{id}`, {
        params: {
          path: {
            id: ticketId,
          },
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Tải chi tiết đơn nhập kho thất bại",
        );
      }

      return response.data;
    } catch (error: any) {
      console.error("Tải chi tiết đơn nhập kho thất bại:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Tải chi tiết đơn nhập kho thất bại";
      throw new Error(errorMessage);
    }
  }

  async updateTicketStatus(
    ticketId: string,
    status: ImportTicketStatus,
  ): Promise<string> {
    try {
      //const response = await axiosInstance.put<ImportTicketResponse>(`${this.IMPORT_ENDPOINT}/${ticketId}/status`,{ status },);
      const response = await apiInstance.PUT(`/api/importtickets/{id}/status`, {
        params: {
          path: {
            id: ticketId,
          },
        },
        body: {
          status: status,
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Cập nhật trạng thái đơn nhập kho thất bại",
        );
      }

      return response.data.payload!;
    } catch (error: any) {
      console.error("Cập nhật trạng thái đơn nhập kho thất bại:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Cập nhật trạng thái đơn nhập kho thất bại";
      throw new Error(errorMessage);
    }
  }

  async verifyTicket(
    ticketId: string,
    verifyData: VerifyTicketRequest,
  ): Promise<string> {
    try {
      //const response = await axiosInstance.post<ImportTicketResponse>(`${this.IMPORT_ENDPOINT}/${ticketId}/verify`,verifyData,);
      const response = await apiInstance.POST(
        `/api/importtickets/{ticketId}/verify`,
        {
          params: {
            path: {
              ticketId: ticketId,
            },
          },
          body: verifyData,
        },
      );

      if (response.error) {
        throw new Error(
          this.extractApiErrorMessage(
            response.error,
            "Xác minh đơn nhập kho thất bại",
          ),
        );
      }

      if (!response.data?.success) {
        throw new Error(
          this.extractApiErrorMessage(
            response.data,
            "Xác minh đơn nhập kho thất bại",
          ),
        );
      }

      return response.data.payload!;
    } catch (error: any) {
      console.error("Verify ticket error:", error);
      const errorMessage =
        error?.response?.data?.errors?.join(", ") ||
        error.response?.data?.message ||
        error?.errors?.join(", ") ||
        error.message ||
        "Xác minh đơn nhập kho thất bại";
      throw new Error(errorMessage);
    }
  }

  async uploadImportTicketsExcel(
    file: File,
    supplierId: number,
    expectedArrivalDate?: string,
  ): Promise<{
    payload: CreateImportTicketRequestPayload;
    supplierId: number;
  }> {
    try {
      const formData = new FormData();
      formData.append("ExcelFile", file);
      formData.append("SupplierId", supplierId.toString());
      if (expectedArrivalDate) {
        formData.append("ExpectedArrivalDate", expectedArrivalDate);
      }

      const response = await apiInstance.POST(
        `/api/importtickets/excel-parser`,
        {
          body: {
            ExcelFile: "",
            SupplierId: supplierId,
            ExpectedArrivalDate: expectedArrivalDate,
          },
          bodySerializer() {
            return formData;
          },
        },
      );
      // Check for openapi-fetch error format
      if (response.error) {
        const errorMessage = (response.error as any)?.message || "Tải lên file Excel thất bại";
        throw new Error(errorMessage);
      }
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Tải lên file Excel thất bại",
        );
      }

      if (!response.data.payload) {
        throw new Error("Không nhận được dữ liệu danh sách từ file Excel");
      }

      // Trả về cả payload và supplierId để đồng bộ với selectbox
      return {
        payload: response.data.payload,
        supplierId: response.data.payload.supplierId || supplierId,
      };
    } catch (error: any) {
      console.error("Tải lên file Excel thất bại:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.join(", ") ||
        error.message ||
        "Tải lên file Excel thất bại";
      throw new Error(errorMessage);
    }
  }

  async downloadImportTemplate(supplierId?: number): Promise<Blob> {
    try {
      if (!supplierId) {
        throw new Error("Vui lòng chọn nhà cung cấp để tải mẫu Excel");
      }

      const response = await apiInstance.GET(
        `/api/importtickets/excel-template/{supplierId}`,
        {
          parseAs: "blob",
          params: {
            path: {
              supplierId: supplierId,
            },
          },
        },
      );

      if (!response.data) {
        throw new Error("Tải xuống mẫu Excel thất bại");
      }

      return response.data as Blob;
    } catch (error: any) {
      console.error("Tải xuống mẫu Excel thất bại:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Tải xuống mẫu Excel thất bại";
      throw new Error(errorMessage);
    }
  }
}

export const importStockService = new ImportStockService();
