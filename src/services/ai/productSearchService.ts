import { aiApiInstance } from "@/lib/api";
import type {
    ProductListItemWithVariants,
    PagedProductListWithVariants,
} from "@/types/product";

export type AiProductSearchQuery = {
    searchText?: string;
    GenderValueId?: number | null;
    PageNumber?: number;
    PageSize?: number;
    SortBy?: string;
    SortOrder?: string;
    IsDescending?: boolean;
};

class AiProductSearchService {
    private readonly SEMANTIC_SEARCH_ENDPOINT = "/products/search/";

    private createEmptyPagedResult<T>(query?: AiProductSearchQuery) {
        return {
            items: [] as T[],
            pageNumber: query?.PageNumber ?? 1,
            pageSize: query?.PageSize ?? 0,
            totalCount: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
        };
    }

    async searchProducts(
        query: AiProductSearchQuery,
    ): Promise<PagedProductListWithVariants> {
        try {
            const response = await aiApiInstance.GET(this.SEMANTIC_SEARCH_ENDPOINT as any, {
                params: {
                    query,
                },
            });

            if (!response.data || !("payload" in response.data)) {
                throw new Error(
                    (response.data as any)?.message || "Failed to search products via semantic search",
                );
            }

            const payload = (response.data as any).payload as PagedProductListWithVariants;

            return (
                payload ||
                this.createEmptyPagedResult<ProductListItemWithVariants>(query)
            );
        } catch (error: any) {
            console.error("Error searching products via semantic search:", error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Failed to search products via semantic search",
            );
        }
    }

    async getSearchSuggestions(
        searchText: string,
    ): Promise<PagedProductListWithVariants> {
        try {
            const response = await aiApiInstance.GET(`${this.SEMANTIC_SEARCH_ENDPOINT}v3` as any, {
                params: {
                    query: { searchText, PageNumber: 1, PageSize: 5 },
                },
            });

            if (!response.data || !("payload" in response.data)) {
                throw new Error(
                    (response.data as any)?.message || "Failed to fetch search suggestions",
                );
            }

            const payload = (response.data as any).payload as PagedProductListWithVariants;

            return (
                payload || {
                    items: [],
                    pageNumber: 1,
                    pageSize: 5,
                    totalCount: 0,
                    totalPages: 0,
                }
            );
        } catch (error: any) {
            console.error("Error fetching search suggestions:", error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Failed to fetch search suggestions",
            );
        }
    }
}

export const aiProductSearchService = new AiProductSearchService();
