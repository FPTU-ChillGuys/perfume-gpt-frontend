import type { paths } from "../types/api/v1";
import createFetchClient, { type Middleware } from "openapi-fetch";

const middleware: Middleware = {
  async onRequest({ request }) {
    const accessToken = localStorage.getItem("accessToken");
    // (optional) add logic here to refresh token when it expires

    // add Authorization header to every request
    request.headers.set("Authorization", `Bearer ${accessToken}`);
    return request;
  },
  onResponse({ response }) {
    if (response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
  },
  onError({ error }) {
    return Promise.reject(error);
  },
};

export const apiInstance = createFetchClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
});
apiInstance.use(middleware);

// AI backend (separate server — paths not in the main OpenAPI schema)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const aiApiInstance = createFetchClient<Record<string, any>>({
  baseUrl: import.meta.env.VITE_CHATBOT_BASE_URL,
});
aiApiInstance.use(middleware);
