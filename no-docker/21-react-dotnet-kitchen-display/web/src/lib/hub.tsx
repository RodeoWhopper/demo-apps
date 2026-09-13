import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from "@microsoft/signalr";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type HubStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

interface HubContextValue {
  status: HubStatus;
  connectionId: string | null;
  /** Subscribe to a server-sent event; returns the unsubscribe function. */
  on<T>(event: string, handler: (payload: T) => void): () => void;
}

const HubContext = createContext<HubContextValue | null>(null);

function buildConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl("/hubs/orders") // same origin in production; Vite proxies it (with ws) in development
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(LogLevel.Warning)
    .build();
}

/** One anonymous SignalR connection shared by the whole app (board, tracking, kitchen, admin). */
export function HubProvider({ children }: { children: ReactNode }) {
  const [connection] = useState(buildConnection);
  const [status, setStatus] = useState<HubStatus>("connecting");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const retryRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let disposed = false;

    async function start() {
      if (disposed || connection.state !== HubConnectionState.Disconnected) return;
      setStatus("connecting");
      try {
        await connection.start();
        if (!disposed) {
          setStatus("connected");
          setConnectionId(connection.connectionId);
        }
      } catch {
        if (!disposed) {
          setStatus("disconnected");
          retryRef.current = window.setTimeout(() => void start(), 5_000);
        }
      }
    }

    connection.onreconnecting(() => setStatus("reconnecting"));
    connection.onreconnected((id) => {
      setStatus("connected");
      setConnectionId(id ?? null);
    });
    connection.onclose(() => {
      setStatus("disconnected");
      setConnectionId(null);
      // automatic reconnect gave up (or the server went away for long): keep trying slowly
      if (!disposed) retryRef.current = window.setTimeout(() => void start(), 5_000);
    });
    void start();

    return () => {
      disposed = true;
      window.clearTimeout(retryRef.current);
      void connection.stop();
    };
  }, [connection]);

  const on = useCallback(
    <T,>(event: string, handler: (payload: T) => void) => {
      connection.on(event, handler);
      return () => connection.off(event, handler);
    },
    [connection],
  );

  const value = useMemo<HubContextValue>(() => ({ status, connectionId, on }), [status, connectionId, on]);
  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub(): HubContextValue {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used inside <HubProvider>");
  return ctx;
}

/** Subscribe to a hub event for the lifetime of the component; the latest handler is always used. */
export function useHubEvent<T>(event: string, handler: (payload: T) => void): void {
  const { on } = useHub();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => on<T>(event, (payload) => handlerRef.current(payload)), [event, on]);
}
