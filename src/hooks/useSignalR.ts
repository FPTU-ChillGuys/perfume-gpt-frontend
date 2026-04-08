import { useCallback, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { getStoredAccessToken } from "@/utils/authStorage";
import { isTokenExpired } from "@/utils/jwt";

type UseSignalROptions = {
  hubUrl: string;
  sessionId: string;
};

export type PosPaymentCompletedPayload = {
  orderId: string;
  paymentId?: string;
  status: string;
  message: string;
};

const resolvePosHubUrl = () => {
  const explicitHubUrl = (
    (import.meta.env.VITE_POS_HUB_URL as string | undefined) ||
    (import.meta.env.VITE_SIGNALR_POS_HUB_URL as string | undefined)
  )
    ?.trim()
    .replace(/\/+$/, "");

  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)
    ?.trim()
    .replace(/\/+$/, "");

  const resolveFromBase = (path: string, base?: string) => {
    if (!base) return undefined;

    try {
      const baseAsUrl = new URL(base);
      return new URL(path, `${baseAsUrl.origin}/`).toString();
    } catch {
      return undefined;
    }
  };

  if (explicitHubUrl) {
    if (/^https?:\/\//i.test(explicitHubUrl)) {
      return explicitHubUrl;
    }

    const fromApiBase = resolveFromBase(explicitHubUrl, baseUrl);
    if (fromApiBase) return fromApiBase;

    if (typeof window !== "undefined") {
      try {
        return new URL(explicitHubUrl, `${window.location.origin}/`).toString();
      } catch {
        return `${window.location.origin}${
          explicitHubUrl.startsWith("/") ? "" : "/"
        }${explicitHubUrl}`;
      }
    }

    return explicitHubUrl;
  }

  if (baseUrl) {
    const fromBase = resolveFromBase("/posHub", baseUrl);
    if (fromBase) return fromBase;

    return `${baseUrl}/posHub`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/posHub`;
  }

  return "/posHub";
};

export const POS_HUB_URL = resolvePosHubUrl();

const normalizeHubCandidate = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return "";

  try {
    return new URL(raw).toString().replace(/\/+$/, "");
  } catch {
    return raw.replace(/\/+$/, "");
  }
};

const addCandidate = (set: Set<string>, value?: string | null) => {
  const normalized = normalizeHubCandidate(value);
  if (!normalized) return;
  set.add(normalized);
};

const buildHubUrlCandidates = (primaryHubUrl: string) => {
  const candidates = new Set<string>();

  const expand = (candidate: string) => {
    addCandidate(candidates, candidate);

    try {
      const parsed = new URL(candidate);
      const normalizedPath = parsed.pathname.replace(/\/+$/, "").toLowerCase();

      if (!normalizedPath.endsWith("/poshub")) {
        addCandidate(
          candidates,
          new URL("/posHub", `${parsed.origin}/`).toString(),
        );
      }
    } catch {
      // Ignore non-URL candidate expansions.
    }
  };

  expand(primaryHubUrl);

  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)
    ?.trim()
    .replace(/\/+$/, "");

  if (baseUrl) {
    try {
      const parsedBase = new URL(baseUrl);
      expand(new URL("/posHub", `${parsedBase.origin}/`).toString());
    } catch {
      // ignore malformed base URL
    }
  }

  return Array.from(candidates);
};

const normalizeToken = (rawToken: string | null | undefined): string => {
  if (!rawToken) return "";

  const trimmed = rawToken.trim();
  const withoutBearer = trimmed.replace(/^Bearer\s+/i, "");
  const withoutQuotes = withoutBearer.replace(/^"|"$/g, "");

  return withoutQuotes;
};

const getValidSignalRToken = (): string => {
  const token = normalizeToken(getStoredAccessToken());
  if (!token) return "";
  if (isTokenExpired(token)) return "";
  return token;
};

export const useSignalR = <T = unknown>({
  hubUrl,
  sessionId,
}: UseSignalROptions) => {
  const [customerDisplayData, setCustomerDisplayData] = useState<T | null>(
    null,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState(
    signalR.HubConnectionState.Disconnected,
  );
  const [lastEvent, setLastEvent] = useState("idle");
  const [paymentCompletedData, setPaymentCompletedData] =
    useState<PosPaymentCompletedPayload | null>(null);
  const [paymentFailedData, setPaymentFailedData] =
    useState<PosPaymentCompletedPayload | null>(null);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const pendingSyncPayloadRef = useRef<unknown | null>(null);

  const invokeSyncToCustomer = useCallback(
    async (payload: unknown) => {
      const connection = connectionRef.current;
      if (
        !connection ||
        connection.state !== signalR.HubConnectionState.Connected
      ) {
        pendingSyncPayloadRef.current = payload;
        return;
      }

      try {
        await connection.invoke(
          "SyncCartToCustomerDisplay",
          sessionId,
          payload,
        );
        pendingSyncPayloadRef.current = null;
      } catch (invokeError) {
        pendingSyncPayloadRef.current = payload;
        setError(
          invokeError instanceof Error
            ? invokeError.message
            : "Không thể đồng bộ dữ liệu sang màn hình khách",
        );
      }
    },
    [sessionId],
  );

  const syncCartToCustomer = useCallback(
    async (cartData: unknown) => {
      pendingSyncPayloadRef.current = cartData;
      await invokeSyncToCustomer(cartData);
    },
    [invokeSyncToCustomer],
  );

  const notifyPaymentSuccess = useCallback(
    async (payload: PosPaymentCompletedPayload) => {
      if (!sessionId.trim()) {
        throw new Error("Thiếu sessionId để gửi thông báo thanh toán");
      }

      const connection = connectionRef.current;

      if (
        !connection ||
        connection.state !== signalR.HubConnectionState.Connected
      ) {
        throw new Error("SignalR chưa kết nối để gửi trạng thái thanh toán");
      }

      await connection.invoke("NotifyPaymentSuccess", sessionId, payload);
    },
    [sessionId],
  );

  useEffect(() => {
    let isMounted = true;

    if (!sessionId.trim()) {
      setIsConnected(false);
      setConnectionState(signalR.HubConnectionState.Disconnected);
      setLastEvent("missing-session-id");
      setError(null);
      return;
    }

    const setSafeConnectionState = (
      state: signalR.HubConnectionState,
      eventLabel: string,
    ) => {
      if (!isMounted) return;
      setConnectionState(state);
      setLastEvent(eventLabel);
    };

    const setupConnection = async () => {
      try {
        setSafeConnectionState(
          signalR.HubConnectionState.Connecting,
          "starting",
        );
        const accessToken = getValidSignalRToken();

        if (!accessToken) {
          if (isMounted) {
            setError(
              "Thiếu access token để kết nối POS Hub. Vui lòng đăng nhập lại.",
            );
            setIsConnected(false);
          }
          setSafeConnectionState(
            signalR.HubConnectionState.Disconnected,
            "missing-token",
          );
          return;
        }

        // StrictMode runs effects twice in dev; ensure old connection is closed first.
        const previousConnection = connectionRef.current;
        if (previousConnection) {
          const previousStart = startPromiseRef.current;
          if (previousStart) {
            try {
              await previousStart;
            } catch {
              // ignore start failures from previous mount
            }
          }

          try {
            await previousConnection.stop();
          } catch {
            // ignore cleanup stop errors
          }
          connectionRef.current = null;
          startPromiseRef.current = null;
        }

        const hubUrlCandidates = buildHubUrlCandidates(hubUrl);
        let connected = false;
        let lastSetupError: unknown = null;

        for (const candidateUrl of hubUrlCandidates) {
          if (!isMounted) return;

          let shouldBypassNgrokWarning = false;
          try {
            const parsedCandidate = new URL(candidateUrl);
            shouldBypassNgrokWarning =
              parsedCandidate.hostname.includes("ngrok.io") ||
              parsedCandidate.hostname.includes("ngrok-free.app") ||
              parsedCandidate.hostname.includes("ngrok-free.dev");
          } catch {
            shouldBypassNgrokWarning = false;
          }

          const connection = new signalR.HubConnectionBuilder()
            .withUrl(candidateUrl, {
              accessTokenFactory: () => getValidSignalRToken(),
              headers: shouldBypassNgrokWarning
                ? { "ngrok-skip-browser-warning": "true" }
                : undefined,
              transport: signalR.HttpTransportType.LongPolling,
            })
            .configureLogging(signalR.LogLevel.None)
            .withAutomaticReconnect()
            .build();

          connection.on("UpdateCustomerDisplay", (data: T) => {
            if (!isMounted) return;
            setCustomerDisplayData(data);
            setLastEvent("received-update-customer-display");
          });

          connection.on(
            "PaymentCompleted",
            (payload: PosPaymentCompletedPayload) => {
              if (!isMounted) return;
              setPaymentCompletedData(payload);
              setLastEvent("received-payment-completed");
            },
          );

          connection.on(
            "PaymentFailed",
            (payload: PosPaymentCompletedPayload) => {
              if (!isMounted) return;
              setPaymentFailedData(payload);
              setLastEvent("received-payment-failed");
            },
          );

          connection.onclose((closeError) => {
            if (isMounted) {
              setIsConnected(false);
              setSafeConnectionState(
                signalR.HubConnectionState.Disconnected,
                closeError ? "closed-with-error" : "closed",
              );

              if (closeError) {
                setError(closeError.message || "SignalR connection closed.");
              }
            }
          });

          connection.onreconnecting(() => {
            if (isMounted) {
              setIsConnected(false);
              setSafeConnectionState(
                signalR.HubConnectionState.Reconnecting,
                "reconnecting",
              );
            }
          });

          connection.onreconnected(async () => {
            if (!isMounted) return;

            try {
              await connection.invoke("JoinPosSession", sessionId);
              setIsConnected(true);
              setSafeConnectionState(
                signalR.HubConnectionState.Connected,
                "reconnected-and-joined",
              );

              const pendingPayload = pendingSyncPayloadRef.current;
              if (pendingPayload !== null) {
                await invokeSyncToCustomer(pendingPayload);
              }
            } catch (rejoinError) {
              if (isMounted) {
                setError(
                  rejoinError instanceof Error
                    ? rejoinError.message
                    : "Không thể khôi phục kết nối SignalR",
                );
                setIsConnected(false);
              }
              setSafeConnectionState(
                signalR.HubConnectionState.Disconnected,
                "reconnect-failed",
              );
            }
          });

          try {
            setLastEvent(`trying:${candidateUrl}`);

            const startPromise = connection.start();
            startPromiseRef.current = startPromise;
            await startPromise;
            if (startPromiseRef.current === startPromise) {
              startPromiseRef.current = null;
            }

            if (!isMounted) {
              try {
                await connection.stop();
              } catch {
                // ignore stop for stale strict-mode effect
              }
              return;
            }

            await connection.invoke("JoinPosSession", sessionId);
            if (!isMounted) {
              try {
                await connection.stop();
              } catch {
                // ignore stop for stale strict-mode effect
              }
              return;
            }

            connectionRef.current = connection;
            connected = true;
            setIsConnected(true);
            setError(null);
            setSafeConnectionState(
              signalR.HubConnectionState.Connected,
              "connected-and-joined",
            );

            const pendingPayload = pendingSyncPayloadRef.current;
            if (pendingPayload !== null) {
              await invokeSyncToCustomer(pendingPayload);
            }

            break;
          } catch (attemptError) {
            lastSetupError = attemptError;
            if (startPromiseRef.current) {
              startPromiseRef.current = null;
            }

            try {
              await connection.stop();
            } catch {
              // ignore per-candidate stop errors
            }
          }
        }

        if (!connected) {
          throw (
            lastSetupError ||
            new Error(
              `Không thể kết nối POS Hub. Đã thử: ${hubUrlCandidates.join(", ")}`,
            )
          );
        }
      } catch (setupError) {
        if (isMounted) {
          const message =
            setupError instanceof Error
              ? setupError.message
              : "Không thể kết nối SignalR";

          setError(
            message.includes("401")
              ? "POS Hub trả về 401 (Unauthorized). Token có thể đã hết hạn hoặc backend chưa đọc access_token cho endpoint /posHub."
              : message,
          );
          setIsConnected(false);
          setSafeConnectionState(
            signalR.HubConnectionState.Disconnected,
            "start-failed",
          );
        }
      }
    };

    void setupConnection();

    return () => {
      isMounted = false;

      const cleanup = async () => {
        const connection = connectionRef.current;
        connectionRef.current = null;

        if (!connection) return;

        const currentStart = startPromiseRef.current;
        if (currentStart) {
          try {
            await currentStart;
          } catch {
            // ignore start failures during cleanup
          } finally {
            if (startPromiseRef.current === currentStart) {
              startPromiseRef.current = null;
            }
          }
        }

        try {
          if (connection.state === signalR.HubConnectionState.Connected) {
            await connection.invoke("LeavePosSession", sessionId);
          }
        } catch {
          // ignore leave errors during unmount
        }

        try {
          await connection.stop();
        } catch {
          // ignore stop errors during unmount
        }
      };

      void cleanup();
    };
  }, [hubUrl, invokeSyncToCustomer, sessionId]);

  return {
    customerDisplayData,
    paymentCompletedData,
    paymentFailedData,
    isConnected,
    connectionState,
    lastEvent,
    error,
    syncCartToCustomer,
    notifyPaymentSuccess,
  };
};
