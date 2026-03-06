import type { paths } from "../types/api/v1";
import createFetchClient, { type Middleware } from "openapi-fetch";

const middleware: Middleware = {
  async onRequest({ request }) {
    const accessToken = localStorage.getItem("accessToken");
    // (optional) add logic here to refresh token when it expires

    if (accessToken) {
      request.headers.set("Authorization", `Bearer ${accessToken}`);
    } else {
      request.headers.delete("Authorization");
    }
    return request;
  },
  onResponse({ response }) {
    if (response?.status === 401) {
      // Handle unauthorized - but skip redirect if already on login page
      localStorage.removeItem("accessToken");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
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
