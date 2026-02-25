import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";
import type { ApplyVoucherRequest, ApplyVoucherResponse } from "@/types/cart";

export type VoucherResponse = components["schemas"]["VoucherResponse"];
type VoucherListResponse =
  components["schemas"]["PagedResultOfVoucherResponse"];

class VoucherService {
  private readonly BASE_ENDPOINT = "/api/vouchers";
  private readonly APPLY_ENDPOINT = "/api/vouchers/apply";

  async findVoucherByCode(code: string): Promise<VoucherResponse | null> {
    try {
      const response = await apiInstance.GET(this.BASE_ENDPOINT, {
        params: {
          query: {
            Code: code,
            PageNumber: 1,
            PageSize: 1,
            IsExpired: false,
          },
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch voucher");
      }

      const payload: VoucherListResponse | null | undefined =
        response.data.payload;
      const [voucher] = payload?.items ?? [];
      return voucher ?? null;
    } catch (error: any) {
      console.error("Error fetching voucher by code:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch voucher",
      );
    }
  }

  async applyVoucher(
    request: ApplyVoucherRequest,
  ): Promise<ApplyVoucherResponse> {
    try {
      const response = await apiInstance.POST(this.APPLY_ENDPOINT, {
        body: request,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to apply voucher");
      }

      const payload = response.data.payload;
      if (!payload) {
        throw new Error("Invalid response from apply voucher API");
      }

      return {
        voucherCode: payload.voucherCode || request.voucherCode,
        discountAmount: Number(payload.discountAmount ?? 0),
        finalAmount: Number(payload.finalAmount ?? request.orderAmount),
        message: payload.message,
      };
    } catch (error: any) {
      console.error("Error applying voucher:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to apply voucher",
      );
    }
  }
}

export const voucherService = new VoucherService();
