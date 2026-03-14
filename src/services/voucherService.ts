import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";
import type { ApplyVoucherRequest, ApplyVoucherResponse } from "@/types/cart";

export type VoucherResponse = components["schemas"]["VoucherResponse"];
type VoucherListResponse =
  components["schemas"]["PagedResultOfVoucherResponse"];

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
      const voucher = await this.findVoucherByCode(request.voucherCode);
      if (!voucher) {
        throw new Error("Voucher không tồn tại hoặc đã hết hiệu lực");
      }

      const minOrderValue = Number(voucher.minOrderValue ?? 0);
      if (request.orderAmount < minOrderValue) {
        throw new Error(
          "Đơn hàng chưa đạt giá trị tối thiểu để áp dụng voucher",
        );
      }

      const discountValue = Number(voucher.discountValue ?? 0);
      const discountType = voucher.discountType;
      const discountAmount =
        discountType === "Percentage"
          ? Math.floor((request.orderAmount * discountValue) / 100)
          : discountValue;

      const boundedDiscount = Math.max(
        0,
        Math.min(request.orderAmount, discountAmount),
      );
      const finalAmount = Math.max(0, request.orderAmount - boundedDiscount);

      if (boundedDiscount <= 0) {
        throw new Error("Voucher không hợp lệ cho đơn hàng hiện tại");
      }

      return {
        voucherCode: voucher.code || request.voucherCode,
        discountAmount: boundedDiscount,
        finalAmount,
        message: "Áp dụng voucher thành công",
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
