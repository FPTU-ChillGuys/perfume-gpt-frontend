import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type CampaignStatus = components["schemas"]["CampaignStatus"];
export type CampaignType = components["schemas"]["CampaignType"];
export type PromotionType = components["schemas"]["PromotionType"];
export type DiscountType = components["schemas"]["DiscountType"];
export type VoucherType = components["schemas"]["VoucherType"];
export type CampaignResponse = components["schemas"]["CampaignResponse"];
export type CampaignPromotionItemResponse =
  components["schemas"]["CampaignPromotionItemResponse"];
export type PagedCampaignResponse =
  components["schemas"]["PagedResultOfCampaignResponse"];
export type CreateCampaignRequest =
  components["schemas"]["CreateCampaignRequest"];

export type UpdateCampaignRequest =
  components["schemas"]["UpdateCampaignRequest"];
export type UpdateCampaignStatusRequest =
  components["schemas"]["UpdateCampaignStatusRequest"];
export type CreateCampaignPromotionItemRequest =
  components["schemas"]["CreateCampaignPromotionItemRequest"];
export type UpdateCampaignPromotionItemRequest =
  components["schemas"]["UpdateCampaignPromotionItemRequest"];
export type VoucherResponse = components["schemas"]["VoucherResponse"];
export type CreateCampaignVoucherRequest =
  components["schemas"]["CreateCampaignVoucherRequest"];
export type UpdateCampaignVoucherRequest =
  components["schemas"]["UpdateCampaignVoucherRequest"];

// Lookup types for public endpoints
export type CampaignLookupItem = {
  id: string;
  name: string;
};

type BaseResponseString = components["schemas"]["BaseResponseOfstring"];
type BaseResponseCampaign =
  components["schemas"]["BaseResponseOfCampaignResponse"];
type BaseResponseCampaignItems =
  components["schemas"]["BaseResponseOfListOfCampaignPromotionItemResponse"];
type BaseResponseVoucherList =
  components["schemas"]["BaseResponseOfListOfVoucherResponse"];
type BaseResponseVoucher =
  components["schemas"]["BaseResponseOfVoucherResponse"];

export type CampaignQuery = {
  SearchTerm?: string;
  Status?: CampaignStatus;
  Type?: CampaignType;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
};

class CampaignService {
  private formatApiErrorMessage(
    base:
      | {
          message?: string;
          errors?: string[] | null;
          errorType?: string | number | null;
        }
      | null
      | undefined,
    statusCode?: number,
    fallback = "Request failed",
  ) {
    const messageParts: string[] = [];

    if (base?.message) {
      messageParts.push(base.message);
    }



    if (base?.errors && base.errors.length > 0) {
      messageParts.push(base.errors.join(" | "));
    }

    if (messageParts.length === 0 && statusCode) {
      messageParts.push(`HTTP ${statusCode}`);
    }

    return messageParts.join(" - ") || fallback;
  }

  private extractErrorMessage(error: unknown, fallback: string) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: { data?: { message?: string } } }).response
        ?.data?.message === "string"
    ) {
      return (error as { response?: { data?: { message?: string } } }).response
        ?.data?.message as string;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  async getCampaigns(query?: CampaignQuery): Promise<PagedCampaignResponse> {
    try {
      const response = await apiInstance.GET("/api/campaigns", {
        params: { query },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to fetch campaigns");
      }

      return response.data.payload;
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch campaigns"),
      );
    }
  }

  async getCampaignById(campaignId: string): Promise<CampaignResponse | null> {
    try {
      const response = await apiInstance.GET("/api/campaigns/{campaignId}", {
        params: { path: { campaignId } },
      });

      if (response.error) {
        const statusCode = response.response?.status;
        const apiError = response.error as BaseResponseCampaign | undefined;
        const message = this.formatApiErrorMessage(
          {
            message: apiError?.message,
          },
          statusCode,
          "Failed to fetch campaign detail",
        );
        throw new Error(message);
      }

      if (!response.data?.success) {
        const message = this.formatApiErrorMessage(
          {
            message: response.data?.message,
          },
          response.response?.status,
          "Failed to fetch campaign detail",
        );
        throw new Error(message);
      }

      return response.data.payload || null;
    } catch (error) {
      console.error("Error fetching campaign detail:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch campaign detail"),
      );
    }
  }

  async getCampaignItems(
    campaignId: string,
  ): Promise<CampaignPromotionItemResponse[]> {
    try {
      const response = await apiInstance.GET(
        "/api/campaigns/{campaignId}/items",
        {
          params: { path: { campaignId } },
        },
      );

      if (response.error) {
        const statusCode = response.response?.status;
        const apiError = response.error as
          | BaseResponseCampaignItems
          | undefined;
        const message = this.formatApiErrorMessage(
          {
            message: apiError?.message,
          },
          statusCode,
          "Failed to fetch campaign items",
        );
        throw new Error(message);
      }

      if (!response.data?.success) {
        const message = this.formatApiErrorMessage(
          {
            message: response.data?.message,
          },
          response.response?.status,
          "Failed to fetch campaign items",
        );
        throw new Error(message);
      }

      return response.data.payload || [];
    } catch (error) {
      console.error("Error fetching campaign items:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch campaign items"),
      );
    }
  }

  async updateCampaign(
    campaignId: string,
    payload: UpdateCampaignRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.PUT("/api/campaigns/{campaignId}", {
        params: { path: { campaignId } },
        body: payload,
      });
      if (response.error) {
        const apiError = response.error as BaseResponseString | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
            },
            response.response?.status,
            "Failed to update campaign",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update campaign");
      }
      return response.data.message || "Cập nhật chiến lược thành công";
    } catch (error) {
      console.error("Error updating campaign:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to update campaign"),
      );
    }
  }

  async deleteCampaign(campaignId: string): Promise<string> {
    try {
      const response = await apiInstance.DELETE("/api/campaigns/{campaignId}", {
        params: { path: { campaignId } },
      });
      if (response.error) {
        const apiError = response.error as BaseResponseString | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
            },
            response.response?.status,
            "Failed to delete campaign",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to delete campaign");
      }
      return response.data.message || "Xóa chiến lược thành công";
    } catch (error) {
      console.error("Error deleting campaign:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to delete campaign"),
      );
    }
  }

  async updateCampaignStatus(
    campaignId: string,
    status: CampaignStatus,
  ): Promise<string> {
    try {
      const response = await apiInstance.PUT(
        "/api/campaigns/{campaignId}/status",
        {
          params: { path: { campaignId } },
          body: { status },
        },
      );
      if (response.error) {
        const apiError = response.error as BaseResponseString | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
            },
            response.response?.status,
            "Failed to update campaign status",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to update campaign status",
        );
      }
      return response.data.message || "Cập nhật trạng thái thành công";
    } catch (error) {
      console.error("Error updating campaign status:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to update campaign status"),
      );
    }
  }

  async createCampaign(payload: CreateCampaignRequest): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/campaigns", {
        body: payload,
      });

      if (response.error) {
        const statusCode = response.response?.status;
        const apiError = response.error as BaseResponseString | undefined;
        const message = this.formatApiErrorMessage(
          {
            message: apiError?.message,
          },
          statusCode,
          "Failed to create campaign",
        );

        console.error("Create campaign returned API error", {
          statusCode,
          apiError,
          payload,
        });

        throw new Error(message);
      }

      if (!response.data?.success) {
        const message = this.formatApiErrorMessage(
          {
            message: response.data?.message,
          },
          response.response?.status,
          "Failed to create campaign",
        );

        throw new Error(message);
      }

      return response.data.message || "Tạo chiến lược thành công";
    } catch (error) {
      console.error("Error creating campaign:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to create campaign"),
      );
    }
  }

  // ─── Campaign Items CRUD ────────────────────────────────────────

  async createCampaignItem(
    campaignId: string,
    payload: CreateCampaignPromotionItemRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/campaigns/{id}/items", {
        params: { path: { id: campaignId } },
        body: payload,
      });
      if (response.error) {
        const apiError = response.error as BaseResponseString | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
              errors: apiError?.errors,
              errorType: apiError?.errorType,
            },
            response.response?.status,
            "Failed to create campaign item",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to create campaign item",
        );
      }
      return response.data.message || "Thêm sản phẩm thành công";
    } catch (error) {
      console.error("Error creating campaign item:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to create campaign item"),
      );
    }
  }

  async updateCampaignItem(
    campaignId: string,
    itemId: string,
    payload: UpdateCampaignPromotionItemRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.PUT(
        "/api/campaigns/{id}/items/{itemId}",
        {
          params: { path: { id: campaignId, itemId } },
          body: payload,
        },
      );
      if (response.error) {
        const apiError = response.error as BaseResponseString | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
              errors: apiError?.errors,
              errorType: apiError?.errorType,
            },
            response.response?.status,
            "Failed to update campaign item",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to update campaign item",
        );
      }
      return response.data.message || "Cập nhật sản phẩm thành công";
    } catch (error) {
      console.error("Error updating campaign item:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to update campaign item"),
      );
    }
  }

  async deleteCampaignItem(
    campaignId: string,
    itemId: string,
  ): Promise<string> {
    try {
      const response = await apiInstance.DELETE(
        "/api/campaigns/{id}/items/{itemId}",
        {
          params: { path: { id: campaignId, itemId } },
        },
      );
      if (response.error) {
        const apiError = response.error as BaseResponseString | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
              errors: apiError?.errors,
              errorType: apiError?.errorType,
            },
            response.response?.status,
            "Failed to delete campaign item",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to delete campaign item",
        );
      }
      return response.data.message || "Xóa sản phẩm thành công";
    } catch (error) {
      console.error("Error deleting campaign item:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to delete campaign item"),
      );
    }
  }

  // ─── Campaign Vouchers CRUD ─────────────────────────────────────

  async getCampaignVouchers(campaignId: string): Promise<VoucherResponse[]> {
    try {
      const response = await apiInstance.GET("/api/campaigns/{id}/vouchers", {
        params: { path: { id: campaignId } },
      });
      if (response.error) {
        const apiError = response.error as BaseResponseVoucherList | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
              errors: apiError?.errors,
              errorType: apiError?.errorType,
            },
            response.response?.status,
            "Failed to fetch campaign vouchers",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch campaign vouchers",
        );
      }
      return response.data.payload || [];
    } catch (error) {
      console.error("Error fetching campaign vouchers:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch campaign vouchers"),
      );
    }
  }

  async createCampaignVoucher(
    campaignId: string,
    payload: CreateCampaignVoucherRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/campaigns/{id}/vouchers", {
        params: { path: { id: campaignId } },
        body: payload,
      });
      if (response.error) {
        const apiError = response.error as BaseResponseString | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
              errors: apiError?.errors,
              errorType: apiError?.errorType,
            },
            response.response?.status,
            "Failed to create campaign voucher",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to create campaign voucher",
        );
      }
      return response.data.message || "Thêm voucher thành công";
    } catch (error) {
      console.error("Error creating campaign voucher:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to create campaign voucher"),
      );
    }
  }

  async updateCampaignVoucher(
    campaignId: string,
    voucherId: string,
    payload: UpdateCampaignVoucherRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.PUT(
        "/api/campaigns/{id}/vouchers/{voucherId}",
        {
          params: { path: { id: campaignId, voucherId } },
          body: payload,
        },
      );
      if (response.error) {
        const apiError = response.error as BaseResponseString | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
            },
            response.response?.status,
            "Failed to update campaign voucher",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to update campaign voucher",
        );
      }
      return response.data.message || "Cập nhật voucher thành công";
    } catch (error) {
      console.error("Error updating campaign voucher:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to update campaign voucher"),
      );
    }
  }

  async deleteCampaignVoucher(
    campaignId: string,
    voucherId: string,
  ): Promise<string> {
    try {
      const response = await apiInstance.DELETE(
        "/api/campaigns/{id}/vouchers/{voucherId}",
        {
          params: { path: { id: campaignId, voucherId } },
        },
      );
      if (response.error) {
        const apiError = response.error as BaseResponseString | undefined;
        throw new Error(
          this.formatApiErrorMessage(
            {
              message: apiError?.message,
            },
            response.response?.status,
            "Failed to delete campaign voucher",
          ),
        );
      }
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to delete campaign voucher",
        );
      }
      return response.data.message || "Xóa voucher thành công";
    } catch (error) {
      console.error("Error deleting campaign voucher:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to delete campaign voucher"),
      );
    }
  }

  /**
   * Get products for a specific campaign
   */
  async getCampaignProducts(
    campaignId: string,
    query?: {
      Gender?: components["schemas"]["Gender"];
      CategoryId?: number | null;
      BrandId?: number | null;
      Volume?: number | null;
      FromPrice?: number | null;
      ToPrice?: number | null;
      IsAvailable?: boolean;
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      SortOrder?: string;
      IsDescending?: boolean;
    },
  ) {
    try {
      const response = await apiInstance.GET(
        "/api/products/campaigns/{campaignId}",
        {
          params: {
            path: { campaignId },
            query,
          },
        },
      );

      if (response.error) {
        const statusCode = response.response?.status;
        const message = this.formatApiErrorMessage(
          response.error as any,
          statusCode,
          "Failed to fetch campaign products",
        );
        throw new Error(message);
      }

      if (!response.data?.success) {
        const message = this.formatApiErrorMessage(
          response.data as any,
          response.response?.status,
          "Failed to fetch campaign products",
        );
        throw new Error(message);
      }

      return (
        response.data.payload || {
          items: [],
          totalCount: 0,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching campaign products:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch campaign products"),
      );
    }
  }

  async getActiveCampaigns(): Promise<CampaignLookupItem[]> {
    try {
      const response = await apiInstance.GET("/api/campaigns/lookup/active");

      if (response.error) {
        throw new Error("Failed to fetch active campaigns");
      }

      const data = response.data as any;

      if (data?.success !== undefined) {
        return (data.payload as CampaignLookupItem[]) || [];
      }
      if (Array.isArray(data)) {
        return data as CampaignLookupItem[];
      }
      return [];
    } catch (error: any) {
      console.error("Failed to fetch active campaigns:", error);
      throw new Error(error.message || "Failed to fetch active campaigns");
    }
  }
}

export const campaignService = new CampaignService();
