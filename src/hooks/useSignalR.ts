import { useCallback, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { getStoredAccessToken } from "@/utils/authStorage";

type UseSignalROptions = {
  hubUrl: string;
  sessionId: string;
};

const resolvePosHubUrl = () => {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)
    ?.trim()
    .replace(/\/+$/, "");

  if (baseUrl) {
    try {
      return new URL("/posHub", `${baseUrl}/`).toString();
    } catch {
      return `${baseUrl}/posHub`;
    }
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/posHub`;
  }

  return "/posHub";
};

export const POS_HUB_URL = resolvePosHubUrl();

const normalizeToken = (rawToken: string | null | undefined): string => {
  if (!rawToken) return "";

  const trimmed = rawToken.trim();
  const withoutBearer = trimmed.replace(/^Bearer\s+/i, "");
  const withoutQuotes = withoutBearer.replace(/^"|"$/g, "");

  return withoutQuotes;
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

  useEffect(() => {
    let isMounted = true;

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
        const accessToken = normalizeToken(getStoredAccessToken());

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

        const connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, {
            accessTokenFactory: () => accessToken,
            transport: signalR.HttpTransportType.LongPolling,
          })
          .withAutomaticReconnect()
          .build();

        connection.on("UpdateCustomerDisplay", (data: T) => {
          if (!isMounted) return;
          setCustomerDisplayData(data);
          setLastEvent("received-update-customer-display");
        });

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

        connectionRef.current = connection;

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
      } catch (setupError) {
        if (isMounted) {
          const message =
            setupError instanceof Error
              ? setupError.message
              : "Không thể kết nối SignalR";

          setError(
            message.includes("401")
              ? "POS Hub trả về 401 (Unauthorized). Frontend đã fallback sang LongPolling nhưng vẫn bị từ chối. Hãy kiểm tra JWT auth cho endpoint /posHub ở backend."
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
    isConnected,
    connectionState,
    lastEvent,
    error,
    syncCartToCustomer,
  };
};
