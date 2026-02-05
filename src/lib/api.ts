import type { paths } from "../types/api/v1";
import createFetchClient, { type Middleware } from "openapi-fetch";
import createClient from "openapi-react-query";

const middleware: Middleware = {
  async onRequest({ request }) {
    const accessToken = localStorage.getItem("token");
    // (optional) add logic here to refresh token when it expires

    // add Authorization header to every request
    request.headers.set("Authorization", `Bearer ${accessToken}`);
    return request;
  },
  onResponse({ response }) {
    if (response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  },
  onError({ error }) {
    return Promise.reject(error);
  },
};

const fetchClient = createFetchClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
});
fetchClient.use(middleware);

export const api = createClient(fetchClient);
