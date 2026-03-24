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

export type ProductSearchSuggestion = {
    id: string;
    name: string;
    brandName: string;
    gender: string;
    price: number;
    variantCount: number;
    imageUrl: string | null;
};

export type PagedSearchSuggestions = {
    items: ProductSearchSuggestion[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
};

class AiProductSearchService {
    private readonly SEARCH_ENDPOINT = "/products/search";
    private readonly SUGGESTIONS_ENDPOINT = "/products/search/suggestions";

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
            const response = await aiApiInstance.GET(this.SEARCH_ENDPOINT, {
                params: {
                    query,
                },
            });

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || "Failed to search products via AI",
                );
            }

            // The AI service returns payload or data? 
            // Checking other AI services: aiAcceptanceService uses response.data.data
            // trendService uses response.data.data.jobId
            // chatbotService uses response.data.data

            return (
                response.data.payload ||
                this.createEmptyPagedResult<ProductListItemWithVariants>(query)
            );
        } catch (error: any) {
            console.error("Error searching products via AI:", error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Failed to search products via AI",
            );
        }
    }

    async getSearchSuggestions(
        searchText: string,
    ): Promise<PagedSearchSuggestions> {
        try {
            const response = await aiApiInstance.GET(this.SUGGESTIONS_ENDPOINT, {
                params: {
                    query: { searchText, PageNumber: 1, PageSize: 5 },
                },
            });

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || "Failed to fetch search suggestions",
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
