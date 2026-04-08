import type { paths } from "../types/api/v1";
import createFetchClient, { type Middleware } from "openapi-fetch";
import { markApiRequestEnd, markApiRequestStart } from "@/utils/perfMetrics";
import { clearStoredAuth, getStoredAccessToken } from "@/utils/authStorage";

const normalizeBaseUrl = (value?: string) =>
  (value || "").trim().replace(/\/+$/, "");

const isLocalhostUrl = (value?: string) => {
  const raw = normalizeBaseUrl(value);
  if (!raw) return false;

  try {
    const parsed = new URL(raw);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const resolveApiBaseUrl = () => {
  const configured = normalizeBaseUrl(
    import.meta.env.VITE_API_BASE_URL as string | undefined,
  );

  if (typeof window !== "undefined") {
    const isProductionHost =
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";

    // On deployed frontend, always use same-origin so rewrite/proxy rules handle routing.
    if (isProductionHost) {
      return "";
    }
  }

  return configured || "";
};

const resolveAiBaseUrl = () => {
  const chatbotConfigured = normalizeBaseUrl(
    import.meta.env.VITE_CHATBOT_BASE_URL as string | undefined,
  );
  const apiConfigured = resolveApiBaseUrl();

  // On production hosts, ignore accidental localhost chatbot base URL.
  if (typeof window !== "undefined") {
    const isProductionHost =
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";

    if (isProductionHost && isLocalhostUrl(chatbotConfigured)) {
      return apiConfigured;
    }
  }

  return chatbotConfigured || apiConfigured;
};

const middleware: Middleware = {
  async onRequest({ request }) {
    markApiRequestStart(request);

    try {
      const url = new URL(request.url);
      const isNgrokHost =
        url.hostname.includes("ngrok.io") ||
        url.hostname.includes("ngrok-free.app") ||
        url.hostname.includes("ngrok-free.dev");

      if (isNgrokHost) {
        request.headers.set("ngrok-skip-browser-warning", "true");
      }
    } catch {
      // Ignore URL parsing errors and continue request flow.
    }

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
  baseUrl: resolveApiBaseUrl(),
});
apiInstance.use(middleware);

// AI backend (separate server — paths not in the main OpenAPI schema)
export const aiApiInstance = createFetchClient<Record<string, any>>({
  baseUrl: resolveAiBaseUrl(),
});
aiApiInstance.use(middleware);
