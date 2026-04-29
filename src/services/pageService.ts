import { getApiBaseUrl } from "@/lib/api";
import { getStoredAccessToken } from "@/utils/authStorage";

export interface TemporaryPageImage {
  id: string;
  url: string;
}

export interface CreatePagePayload {
  title: string;
  slug: string;
  htmlContent: string;
  isPublished: boolean;
  metaDescription: string | null;
  temporaryMediaIds: string[];
}

export type UpdatePagePayload = CreatePagePayload;

export interface StaticPage {
  id: string;
  title: string;
  slug: string;
  htmlContent: string;
  isPublished: boolean;
  metaDescription?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PagedStaticPages {
  items: StaticPage[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

const getAuthHeaders = (): Record<string, string> => {
  const token = getStoredAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Extract first item from the API's envelope shape:
 *  { payload: { data: [...] } }  OR  { payload: [...] }  OR  { payload: item }  OR  item
 */
const extractFirst = <T>(json: unknown): T => {
  if (json && typeof json === "object") {
    const root = json as Record<string, unknown>;

    // { payload: { data: [...] } }
    if (
      root.payload &&
      typeof root.payload === "object" &&
      "data" in (root.payload as object)
    ) {
      const data = (root.payload as Record<string, unknown>).data;
      if (Array.isArray(data) && data.length > 0) return data[0] as T;
    }

    // { payload: [...] }
    if (Array.isArray(root.payload) && root.payload.length > 0) {
      return root.payload[0] as T;
    }

    // { payload: item }
    if (root.payload && typeof root.payload === "object") {
      return root.payload as T;
    }
  }

  // Direct item or array
  if (Array.isArray(json) && json.length > 0) return json[0] as T;

  return json as T;
};

/** Extract paged list — handles the actual API shape:
 *  { payload: { items: [...], totalCount: N } }
 *  { payload: { data: [...] } }
 *  { items: [...] }
 */
const extractList = (json: unknown): { items: StaticPage[]; totalCount: number } => {
  if (json && typeof json === "object") {
    const root = json as Record<string, unknown>;

    if (root.payload && typeof root.payload === "object") {
      const p = root.payload as Record<string, unknown>;

      // { payload: { items: [...], totalCount: N } }  ← actual API shape
      if (Array.isArray(p.items)) {
        return {
          items: p.items as StaticPage[],
          totalCount: typeof p.totalCount === "number" ? p.totalCount : p.items.length,
        };
      }

      // { payload: { data: [...] } }
      if (Array.isArray(p.data)) {
        return {
          items: p.data as StaticPage[],
          totalCount: typeof p.totalCount === "number" ? p.totalCount : p.data.length,
        };
      }

      if (Array.isArray(root.payload)) {
        return { items: root.payload as StaticPage[], totalCount: root.payload.length };
      }
    }

    if (Array.isArray(root.items)) {
      return {
        items: root.items as StaticPage[],
        totalCount: typeof root.totalCount === "number" ? root.totalCount : root.items.length,
      };
    }
  }

  if (Array.isArray(json)) return { items: json as StaticPage[], totalCount: json.length };

  return { items: [], totalCount: 0 };
};

export const pageService = {
  // ── Upload temp image ──────────────────────────────────────────────────────
  async uploadTemporaryImage(file: File): Promise<TemporaryPageImage> {
    const baseUrl = getApiBaseUrl();
    const endpoint = `${baseUrl}/api/pages/images/temporary`;

    const formData = new FormData();
    formData.append("Images", file);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Upload thất bại (${response.status})`);
    }

    const json = await response.json();
    const result = extractFirst<TemporaryPageImage>(json);

    if (!result?.id || !result?.url) {
      throw new Error("Phản hồi API upload ảnh không hợp lệ");
    }

    return result;
  },

  // ── Create page ────────────────────────────────────────────────────────────
  async createPage(payload: CreatePagePayload): Promise<StaticPage> {
    const baseUrl = getApiBaseUrl();

    const response = await fetch(`${baseUrl}/api/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Tạo trang thất bại (${response.status})`);
    }

    const json = await response.json();
    return extractFirst<StaticPage>(json);
  },

  // ── Get all pages ──────────────────────────────────────────────────────────
  async getPages(params?: {
    PageNumber?: number;
    PageSize?: number;
    IsPublished?: boolean;
  }): Promise<{ items: StaticPage[]; totalCount: number }> {
    const baseUrl = getApiBaseUrl();
    const query = new URLSearchParams();
    if (params?.PageNumber) query.set("PageNumber", String(params.PageNumber));
    if (params?.PageSize) query.set("PageSize", String(params.PageSize));
    if (params?.IsPublished !== undefined)
      query.set("IsPublished", String(params.IsPublished));

    const response = await fetch(`${baseUrl}/api/pages?${query.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Tải danh sách trang thất bại (${response.status})`);
    }

    const json = await response.json();
    return extractList(json);
  },

  // ── Get single page ────────────────────────────────────────────────────────
  async getPageById(id: string): Promise<StaticPage> {
    const baseUrl = getApiBaseUrl();

    const response = await fetch(`${baseUrl}/api/pages/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Tải trang thất bại (${response.status})`);
    }

    const json = await response.json();
    return extractFirst<StaticPage>(json);
  },

  // ── Get page by slug (public) ──────────────────────────────────────────────
  async getPageBySlug(slug: string): Promise<StaticPage> {
    const baseUrl = getApiBaseUrl();

    const response = await fetch(
      `${baseUrl}/api/pages/${encodeURIComponent(slug)}`,
      { headers: getAuthHeaders() },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Tải trang thất bại (${response.status})`);
    }

    const json = await response.json();
    return extractFirst<StaticPage>(json);
  },

  // ── Update page ────────────────────────────────────────────────────────────
  async updatePage(slug: string, payload: UpdatePagePayload): Promise<StaticPage> {
    const baseUrl = getApiBaseUrl();

    const response = await fetch(`${baseUrl}/api/pages/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Cập nhật trang thất bại (${response.status})`);
    }

    const json = await response.json();
    return extractFirst<StaticPage>(json);
  },

  // ── Delete page ────────────────────────────────────────────────────────────
  async deletePage(id: string): Promise<void> {
    const baseUrl = getApiBaseUrl();

    const response = await fetch(`${baseUrl}/api/pages/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Xóa trang thất bại (${response.status})`);
    }
  },

  // ── Publish / Unpublish page ───────────────────────────────────────────────
  async publishPage(slug: string): Promise<void> {
    const baseUrl = getApiBaseUrl();

    const response = await fetch(`${baseUrl}/api/pages/${encodeURIComponent(slug)}/publish`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Thao tác thất bại (${response.status})`);
    }
  },
};
