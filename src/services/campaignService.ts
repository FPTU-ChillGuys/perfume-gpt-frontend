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
type BaseResponseString = components["schemas"]["BaseResponseOfstring"];
type BaseResponseCampaign =
  components["schemas"]["BaseResponseOfCampaignResponse"];
type BaseResponseCampaignItems =
  components["schemas"]["BaseResponseOfListOfCampaignPromotionItemResponse"];

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

    if (base?.errorType !== undefined && base?.errorType !== null) {
      messageParts.push(`Type: ${String(base.errorType)}`);
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
            errors: apiError?.errors,
            errorType: apiError?.errorType,
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
            errors: response.data?.errors,
            errorType: response.data?.errorType,
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
            errors: apiError?.errors,
            errorType: apiError?.errorType,
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
            errors: response.data?.errors,
            errorType: response.data?.errorType,
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
            errors: apiError?.errors,
            errorType: apiError?.errorType,
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
            errors: response.data?.errors,
            errorType: response.data?.errorType,
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
}

export const campaignService = new CampaignService();
