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

class ShipmentService {
  private readonly SHIPMENT_ENDPOINT = "/api/importtickets";

  async createImportTicket(
    supplierId: number,
    importDate: string,
    importDetails: ImportDetail[]
  ): Promise<ImportTicketResponse> {
    try {
      // Validate inputs
      if (!supplierId || !importDate || !importDetails || importDetails.length === 0) {
        throw new Error("Invalid request: supplierId, importDate, and importDetails are required");
      }

      // Ensure all items have valid data
      const validatedDetails = importDetails.filter(
        (item) => item.variantId && item.quantity > 0 && item.unitPrice >= 0
      );

      if (validatedDetails.length === 0) {
        throw new Error("All items must have valid SKU, quantity > 0, and unit price >= 0");
      }

      // Create payload - try sending as query params + body
      const payload = {
        supplierId: supplierId,
        importDate: importDate,
        importDetails: validatedDetails.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      console.log("🚀 Full request details:");
      console.log("URL:", `${axiosInstance.defaults.baseURL}${this.SHIPMENT_ENDPOINT}`);
      console.log("Method: POST");
      console.log("Payload:", JSON.stringify(payload, null, 2));

      // Try with transformRequest to see exact data being sent
      const response = await axiosInstance.post<ImportTicketResponse>(
        this.SHIPMENT_ENDPOINT,
        payload,
        {
          transformRequest: [(data, headers) => {
            console.log("📤 Transform Request - Original data:", data);
            console.log("📤 Transform Request - Type:", typeof data);
            console.log("📤 Transform Request - Headers:", headers);
            const stringified = JSON.stringify(data);
            console.log("📤 Transform Request - Stringified:", stringified);
            return stringified;
          }],
        }
      );

      console.log("📥 Response status:", response.status);
      console.log("📥 Response data:", response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Import ticket creation failed");
      }

      console.log("✅ Success:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ Import ticket error:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error config data:", error.config?.data);
      
      // More detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.join(", ") ||
                          error.message || 
                          "Failed to create import ticket";
      
      throw new Error(errorMessage);
    }
  }
}

export const shipmentService = new ShipmentService();
