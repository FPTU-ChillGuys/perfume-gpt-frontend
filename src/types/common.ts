/**
 * Base entity – mirrors the backend CommonResponse base class.
 * All domain entities that come from the AI service share these fields.
 */
export interface BaseEntity {
    id: string;
    createdAt: string;
    updatedAt: string;
    /** Soft-delete flag: true = chưa xóa, false = đã bị xóa mềm */
    isActive: boolean;
}

/**
 * Generic wrapper for all AI service API responses.
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    payload?: T;
    __httpStatusCode?: number;
}

/**
 * Generic paged result – matches the PagedResult schema returned by the API.
 */
export interface PagedData<T> {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}
