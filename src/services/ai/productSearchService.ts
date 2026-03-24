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
    private readonly SEARCH_V2_ENDPOINT = "/products/search/v2";
    private readonly SEARCH_V3_ENDPOINT = "/products/search/v3";

    private getEndpoint(version: "v2" | "v3" = "v2") {
        return version === "v3" ? this.SEARCH_V3_ENDPOINT : this.SEARCH_V2_ENDPOINT;
    }

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
        version: "v2" | "v3" = "v2"
    ): Promise<PagedProductListWithVariants> {
        try {
            const response = await aiApiInstance.GET(this.getEndpoint(version), {
                params: {
                    query,
                },
            });

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || `Failed to search products via AI ${version}`,
                );
            }

            return (
                response.data.data ||
                this.createEmptyPagedResult<ProductListItemWithVariants>(query)
            );
        } catch (error: any) {
            console.error(`Error searching products via AI ${version}:`, error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                `Failed to search products via AI ${version}`,
            );
        }
    }

    async getSearchSuggestions(
        searchText: string,
        version: "v2" | "v3" = "v2"
    ): Promise<PagedProductListWithVariants> {
        try {
            const response = await aiApiInstance.GET(this.getEndpoint(version), {
                params: {
                    query: { searchText, PageNumber: 1, PageSize: 5 },
                },
            });

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || `Failed to fetch search suggestions ${version}`,
                );
            }

            return (
                response.data.data || {
                    items: [],
                    pageNumber: 1,
                    pageSize: 5,
                    totalCount: 0,
                    totalPages: 0,
                }
            );
        } catch (error: any) {
            console.error(`Error fetching search suggestions ${version}:`, error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                `Failed to fetch search suggestions ${version}`,
            );
        }
    }
}

export const aiProductSearchService = new AiProductSearchService();
