import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type VoucherResponse = components["schemas"]["VoucherResponse"];
type VoucherListResponse = components["schemas"]["PagedResultOfVoucherResponse"];

class VoucherService {
  private readonly BASE_ENDPOINT = "/api/vouchers";

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

      const payload: VoucherListResponse | null | undefined = response.data.payload;
      const [voucher] = payload?.items ?? [];
      return voucher ?? null;
    } catch (error: any) {
      console.error("Error fetching voucher by code:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Failed to fetch voucher",
      );
    }
  }
}

export const voucherService = new VoucherService();
