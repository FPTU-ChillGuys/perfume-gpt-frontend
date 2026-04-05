import type { paths } from "../types/api/v1";
import createFetchClient, { type Middleware } from "openapi-fetch";
import { markApiRequestEnd, markApiRequestStart } from "@/utils/perfMetrics";
import { clearStoredAuth, getStoredAccessToken } from "@/utils/authStorage";

const middleware: Middleware = {
  async onRequest({ request }) {
    markApiRequestStart(request);

    const accessToken = getStoredAccessToken();
    // (optional) add logic here to refresh token when it expires

    if (accessToken) {
      request.headers.set("Authorization", `Bearer ${accessToken}`);
    } else {
      request.headers.delete("Authorization");
    }
    return request;
  },
  onResponse({ request, response }) {
    markApiRequestEnd(request, response?.status);

    if (response?.status === 401) {
      // Handle unauthorized - but skip redirect if already on login page
      clearStoredAuth();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
  },
  onError({ error, request }) {
    if (request) {
      markApiRequestEnd(request);
    }

    return Promise.reject(error);
  },
};

export const apiInstance = createFetchClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
});
apiInstance.use(middleware);

// AI backend (separate server — paths not in the main OpenAPI schema)
export const aiApiInstance = createFetchClient<Record<string, any>>({
  baseUrl: import.meta.env.VITE_CHATBOT_BASE_URL,
});
aiApiInstance.use(middleware);
