type ApiRequestMeta = {
  startedAt: number;
  pagePath: string;
  method: string;
  endpoint: string;
};

type ApiRequestMetric = {
  durationMs: number;
  pagePath: string;
  method: string;
  endpoint: string;
  status?: number;
};

type RenderMetric = {
  pageKey: string;
  label: string;
  durationMs: number;
  at: number;
};

declare global {
  interface Window {
    __perfMetrics?: {
      printSummary: (pageKey: string) => void;
      clear: () => void;
    };
  }
}

const isPerfEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_PERF_METRICS === "true";

const requestMetaMap = new WeakMap<Request, ApiRequestMeta>();
const requestMetrics: ApiRequestMetric[] = [];
const renderMetrics: RenderMetric[] = [];

const normalizeEndpoint = (url: string) => {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
        ":id",
      )
      .replace(/\/\d+(?=\/|$)/g, "/:num");
  } catch {
    return url;
  }
};

const normalizePagePath = (path: string) =>
  path
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
      ":id",
    )
    .replace(/\/\d+(?=\/|$)/g, "/:num")
    .replace(/\/products\/:id/gi, "/products/:productId");

export const markApiRequestStart = (request: Request) => {
  if (!isPerfEnabled) {
    return;
  }

  requestMetaMap.set(request, {
    startedAt: performance.now(),
    pagePath: normalizePagePath(window.location.pathname),
    method: request.method,
    endpoint: normalizeEndpoint(request.url),
  });
};

export const markApiRequestEnd = (request: Request, status?: number) => {
  if (!isPerfEnabled) {
    return;
  }

  const meta = requestMetaMap.get(request);
  if (!meta) {
    return;
  }

  requestMetrics.push({
    durationMs: performance.now() - meta.startedAt,
    pagePath: meta.pagePath,
    method: meta.method,
    endpoint: meta.endpoint,
    status,
  });

  requestMetaMap.delete(request);
};

export const markRenderMetric = (
  pageKey: string,
  label: string,
  durationMs: number,
) => {
  if (!isPerfEnabled) {
    return;
  }

  renderMetrics.push({
    pageKey,
    label,
    durationMs,
    at: Date.now(),
  });
};

const summarizeDurations = (values: number[]) => {
  if (!values.length) {
    return {
      count: 0,
      avg: 0,
      min: 0,
      max: 0,
      p95: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, value) => acc + value, 0);
  const p95Index = Math.min(
    sorted.length - 1,
    Math.floor(sorted.length * 0.95),
  );

  return {
    count: values.length,
    avg: sum / values.length,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    p95: sorted[p95Index] ?? 0,
  };
};

export const printPagePerfSummary = (pageKey: string) => {
  if (!isPerfEnabled) {
    return;
  }

  const pageRequests = requestMetrics.filter(
    (metric) => metric.pagePath === pageKey,
  );
  const pageRenders = renderMetrics.filter(
    (metric) => metric.pageKey === pageKey,
  );

  const requestSummary = summarizeDurations(
    pageRequests.map((metric) => metric.durationMs),
  );

  const grouped = new Map<string, number[]>();
  pageRequests.forEach((metric) => {
    const key = `${metric.method} ${metric.endpoint}`;
    const existing = grouped.get(key) || [];
    existing.push(metric.durationMs);
    grouped.set(key, existing);
  });

  const endpointRows = Array.from(grouped.entries()).map(([key, durations]) => {
    const summary = summarizeDurations(durations);
    return {
      endpoint: key,
      requests: summary.count,
      avgMs: Number(summary.avg.toFixed(1)),
      p95Ms: Number(summary.p95.toFixed(1)),
      maxMs: Number(summary.max.toFixed(1)),
    };
  });

  const renderRows = pageRenders.map((metric) => ({
    metric: metric.label,
    durationMs: Number(metric.durationMs.toFixed(1)),
  }));

  if (endpointRows.length) {
    console.table(endpointRows);
  }

  if (renderRows.length) {
    console.table(renderRows);
  }
};

if (isPerfEnabled && typeof window !== "undefined") {
  window.__perfMetrics = {
    printSummary: printPagePerfSummary,
    clear: () => {
      requestMetrics.length = 0;
      renderMetrics.length = 0;
    },
  };
}
