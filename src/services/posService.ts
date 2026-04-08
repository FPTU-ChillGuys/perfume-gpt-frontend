import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type PosProductVariant =
  components["schemas"]["ProductVariantForPosResponse"];
export type PosBatchDetail = components["schemas"]["BatchDetailResponse"];
export type PosPreviewRequest = components["schemas"]["PreviewPosOrderRequest"];
export type PosPreviewResponse =
  components["schemas"]["PreviewPosOrderResponse"];
export type PosCustomerForLookup =
  components["schemas"]["CustomerForPosResponse"];

type BatchesQuery = {
  VariantId: string;
  PageNumber?: number;
  PageSize?: number;
};

class PosService {
  private extractApiErrorMessage(error: unknown, fallback: string): string {
    const payload = error as { message?: string };
    return payload?.message || fallback;
  }

  private extractResultErrorMessage(
    result: { data?: { message?: string }; error?: unknown },
    fallback: string,
  ): string {
    const responseError = result.error as
      | { message?: string; errors?: string[] }
      | undefined;

    return (
      result.data?.message ||
      responseError?.message ||
      responseError?.errors?.join(", ") ||
      fallback
    );
  }

  private async fetchSingleVariantForPos(query: {
    Barcode?: string;
    Sku?: string;
    Name?: string;
  }): Promise<PosProductVariant | null> {
    const response = await apiInstance.GET("/api/productvariants/for-pos", {
      params: { query },
    });

    if (!response.data?.success) {
      return null;
    }

    return response.data.payload || null;
  }

  async searchVariantsForPos(keyword: string): Promise<PosProductVariant[]> {
    const term = keyword.trim();
    if (!term) return [];

    try {
      const candidates = await Promise.all([
        this.fetchSingleVariantForPos({ Sku: term }),
        this.fetchSingleVariantForPos({ Name: term }),
      ]);

      const seen = new Set<string>();
      const deduped = candidates.filter((item): item is PosProductVariant => {
        const id = item?.id;
        if (!item || !id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      return deduped;
    } catch (error) {
      throw new Error(
        this.extractApiErrorMessage(error, "Không thể tìm sản phẩm tại quầy"),
      );
    }
  }

  async getVariantByBarcode(
    barcode: string,
  ): Promise<PosProductVariant | null> {
    const value = barcode.trim();
    if (!value) return null;

    try {
      return await this.fetchSingleVariantForPos({ Barcode: value });
    } catch (error) {
      throw new Error(
        this.extractApiErrorMessage(error, "Không thể quét mã sản phẩm"),
      );
    }
  }

  async getBatchesByVariant(variantId: string): Promise<PosBatchDetail[]> {
    const id = variantId.trim();
    if (!id) return [];

    try {
      const query: BatchesQuery = {
        VariantId: id,
        PageNumber: 1,
        PageSize: 100,
      };

      const response = await apiInstance.GET("/api/batches", {
        params: { query },
      });

      if (!response.data?.success) {
        throw new Error(
          this.extractResultErrorMessage(
            response,
            "Không thể lấy danh sách batch",
          ),
        );
      }

      return response.data.payload?.items || [];
    } catch (error) {
      throw new Error(
        this.extractApiErrorMessage(error, "Không thể lấy danh sách batch"),
      );
    }
  }

  async previewOrder(payload: PosPreviewRequest): Promise<PosPreviewResponse> {
    try {
      const response = await apiInstance.POST("/api/cart/pos-preview", {
        body: payload,
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          this.extractResultErrorMessage(
            response,
            "Không thể tính tiền tại quầy",
          ),
        );
      }

      return response.data.payload;
    } catch (error) {
      throw new Error(
        this.extractApiErrorMessage(error, "Không thể tính tiền tại quầy"),
      );
    }
  }

  async lookupCustomerByPhoneOrEmail(
    phoneOrEmail: string,
  ): Promise<PosCustomerForLookup[]> {
    const keyword = phoneOrEmail.trim();
    if (!keyword) return [];

    try {
      const response = await apiInstance.GET("/api/users/for-pos", {
        params: {
          query: {
            phoneOrEmail: keyword,
          },
        },
      });

      if (!response.data?.success || !response.data.payload) {
        return [];
      }

      const payload = response.data.payload as unknown;

      if (Array.isArray(payload)) {
        return payload.filter((item): item is PosCustomerForLookup => !!item);
      }

      return [payload as PosCustomerForLookup];
    } catch {
      return [];
    }
  }
}

export const posService = new PosService();
