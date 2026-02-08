import { apiInstance } from "@/lib/api";
import type { ImportDetail, ImportTicketResponse, ImportTicketsResponse, ImportTicketStatus, VerifyTicketRequest } from "@/types/import-ticket";

class ImportStockService {
  private readonly IMPORT_ENDPOINT = "/api/importtickets";

  async createImportTicket(
    supplierId: number,
    importDate: string,
    importDetails: ImportDetail[],
    expectedArrivalDate: string,
  ): Promise<string> {
    try {
      if (
        !supplierId ||
        !importDate ||
        !expectedArrivalDate ||
        !importDetails ||
        importDetails.length === 0
      ) {
        throw new Error(
          "Invalid request: supplierId, importDate, expectedArrivalDate, and importDetails are required",
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

      const importTime = Date.parse(importDate);
      const expectedTime = Date.parse(expectedArrivalDate);

      if (
        !Number.isNaN(importTime) &&
        !Number.isNaN(expectedTime) &&
        expectedTime < importTime
      ) {
        throw new Error(
          "Expected arrival date cannot be earlier than the import date",
        );
      }

      const payload = {
        supplierId: supplierId,
        importDate: importDate,
        expectedArrivalDate: expectedArrivalDate,
        importDetails: validatedDetails.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
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
        }
      });


      if (!response.data!.success) {
        throw new Error(
          response.data?.message || "Failed to fetch import tickets",
        );
      }

      return response.data!;
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
  ): Promise<ImportTicketResponse> {
    try {
      //const response = await axiosInstance.get<ImportTicketResponse>(`${this.IMPORT_ENDPOINT}/${ticketId}`,);
      const response = await apiInstance.GET(`/api/importtickets/{id}`, {
        params: {
          path: {
            id: ticketId,
          },
        }
      });

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
          response.data?.message || "Failed to update ticket status",
        );
      }

      return response.data.payload!;
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
  ): Promise<string> {
    try {
      //const response = await axiosInstance.post<ImportTicketResponse>(`${this.IMPORT_ENDPOINT}/${ticketId}/verify`,verifyData,);
      const response = await apiInstance.POST(`/api/importtickets/{ticketId}/verify`, {
        params: {
          path: {
            ticketId: ticketId,
          },
        },
        body: verifyData,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to verify ticket");
      }

      return response.data.payload!;
    } catch (error: any) {
      console.error("Verify ticket error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to verify ticket";
      throw new Error(errorMessage);
    }
  }

  async uploadImportTicketsExcel(
    file: File,
    supplierId: number,
    expectedArrivalDate?: string,
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("ExcelFile", file);
      formData.append("SupplierId", supplierId.toString());
      if (expectedArrivalDate) {
        formData.append("ExpectedArrivalDate", expectedArrivalDate);
      }

      /*
      const response = await axiosInstance.post<string>(
        `${this.IMPORT_ENDPOINT}/upload-excel`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      */
      const response = await apiInstance.POST(`/api/importtickets/upload-excel`, {
        body: {
          ExcelFile: "",
          SupplierId: supplierId,
          ExpectedArrivalDate: expectedArrivalDate,
        },
        bodySerializer() {
          return formData;
        },
        // headers: {
        //   "Content-Type": "multipart/form-data",
        // }
      });


      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Import Excel upload failed",
        );
      }

      return response.data.payload!;
    } catch (error: any) {
      console.error("Upload import Excel error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.join(", ") ||
        error.message ||
        "Failed to upload import Excel file";
      throw new Error(errorMessage);
    }
  }

  async downloadImportTemplate(): Promise<Blob> {
    try {
      //const response = await axiosInstance.get(`${this.IMPORT_ENDPOINT}/download-template`,{responseType: "blob",},);
      const response = await apiInstance.GET(`/api/importtickets/download-template`, {
        parseAs: "blob",
      });

      if (!response.data) {
        throw new Error("Failed to download import template");
      }

      return response.data;
    } catch (error: any) {
      console.error("Download import template error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to download import template";
      throw new Error(errorMessage);
    }
  }
}

export const importStockService = new ImportStockService();
