import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";
import type { ApplyVoucherRequest, ApplyVoucherResponse } from "@/types/cart";

export type VoucherResponse = components["schemas"]["VoucherResponse"];
export type VoucherListResponse =
  components["schemas"]["PagedResultOfVoucherResponse"];

export type UserVoucherResponse = components["schemas"]["UserVoucherResponse"];
export type RedeemableVoucherResponse =
  components["schemas"]["RedeemableVoucherResponse"];
export type ApplicableVoucherResponse =
  components["schemas"]["ApplicableVoucherResponse"];
export type ApplicableVoucherCartItemRequest =
  components["schemas"]["ApplicableVoucherCartItemRequest"];

export interface CreateVoucherRequest {
  code: string;
  discountType: "Percentage" | "FixedAmount";
  discountValue: number;
  applyType: "Order" | "Product";
  requiredPoints: number;
  maxDiscountAmount: number | null;
  minOrderValue: number;
  expiryDate: string;
  totalQuantity: number;
  maxUsagePerUser: number | null;
  isPublic: boolean;
  isMemberOnly: boolean;
}

export interface UpdateVoucherRequest extends CreateVoucherRequest {
  remainingQuantity: number;
}

export interface PagedVouchers {
  items: VoucherResponse[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

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

  async getAll(params?: {
    PageNumber?: number;
    PageSize?: number;
    Code?: string;
    IsExpired?: boolean;
  }): Promise<PagedVouchers> {
    const response = await apiInstance.GET(this.BASE_ENDPOINT, {
      params: { query: params },
    });
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load vouchers");
    }
    const payload = response.data.payload as
      | VoucherListResponse
      | null
      | undefined;
    return {
      items: payload?.items ?? [],
      totalCount: payload?.totalCount ?? 0,
      pageNumber: payload?.pageNumber ?? 1,
      pageSize: payload?.pageSize ?? 10,
      totalPages: payload?.totalPages ?? 1,
    };
  }

  async getById(voucherId: string): Promise<VoucherResponse> {
    const response = await apiInstance.GET(
      `${this.BASE_ENDPOINT}/{voucherId}` as any,
      { params: { path: { voucherId } } } as any,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load voucher");
    }
    return response.data.payload as VoucherResponse;
  }

  async create(body: CreateVoucherRequest): Promise<VoucherResponse> {
    const response = await apiInstance.POST(
      this.BASE_ENDPOINT as any,
      {
        body,
      } as any,
    );
    if (!response.data?.success) {
      const msg = (response.error as any)?.message || response.data?.message || "Tạo voucher thất bại";
      throw new Error(msg);
    }
    return response.data.payload as VoucherResponse;
  }

  async update(
    voucherId: string,
    body: UpdateVoucherRequest,
  ): Promise<VoucherResponse> {
    const response = await apiInstance.PUT(
      `${this.BASE_ENDPOINT}/{voucherId}` as any,
      { params: { path: { voucherId } }, body } as any,
    );
    if (!response.data?.success) {
      const msg = (response.error as any)?.message || response.data?.message || "Cập nhật voucher thất bại";
      throw new Error(msg);
    }
    return response.data.payload as VoucherResponse;
  }

  async deleteVoucher(voucherId: string): Promise<void> {
    const response = await apiInstance.DELETE(
      `${this.BASE_ENDPOINT}/{voucherId}` as any,
      { params: { path: { voucherId } } } as any,
    );
    if (!response.data?.success) {
      const msg = (response.error as any)?.message || response.data?.message || "Xóa voucher thất bại";
      throw new Error(msg);
    }
  }

  async getMyVouchers(params?: {
    Status?: string;
    IsUsed?: boolean;
    IsExpired?: boolean;
    Code?: string;
    PageNumber?: number;
    PageSize?: number;
  }): Promise<UserVoucherResponse[]> {
    const response = await apiInstance.GET("/api/user-vouchers/me", {
      params: { query: params },
    } as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load my vouchers");
    }
    const payload = response.data.payload as any;
    return (payload?.items ?? payload ?? []) as UserVoucherResponse[];
  }

  async getRedeemableList(): Promise<RedeemableVoucherResponse[]> {
    const response = await apiInstance.GET("/api/vouchers/redeemable");
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to load redeemable vouchers",
      );
    }
    const payload = response.data.payload as any;
    if (Array.isArray(payload)) return payload;
    if (payload?.items && Array.isArray(payload.items)) return payload.items;
    return [];
  }

  async getApplicableVouchers(
    cartItems: ApplicableVoucherCartItemRequest[],
  ): Promise<ApplicableVoucherResponse[]> {
    try {
      const response = await apiInstance.POST("/api/vouchers/applicable", {
        body: {
          cartItems,
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch applicable vouchers",
        );
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching applicable vouchers:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch applicable vouchers",
      );
    }
  }

  async redeemVoucher(
    voucherId: string,
    options: { receiverEmailOrPhone?: string | null } = {},
  ): Promise<string> {
    const response = await apiInstance.POST(
      `${this.BASE_ENDPOINT}/redeem` as any,
      {
        body: {
          voucherId,
          receiverEmailOrPhone: options.receiverEmailOrPhone,
        },
      } as any,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to redeem voucher");
    }
    return response.data.message || "Đổi voucher thành công!";
  }
}

export const voucherService = new VoucherService();
