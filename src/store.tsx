import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { createInitialState } from "./model";
import type { Simulation } from "./model";
import type { Action } from "../shared/simulation.ts";
import { SignIn } from "./auth";

type User = { id: string; username: string; role: "admin" | "operator" };
type Snapshot = { state: Simulation; revision: number };
type Session = {
  user: User | null;
  csrfToken: string | null;
  configured: boolean;
};
const Context = createContext<{
  state: Simulation;
  dispatch: (action: Action) => Promise<boolean>;
  notify: (message: string, error?: boolean) => void;
  connectionError: boolean;
  pending: boolean;
  user: User;
  logout: () => Promise<void>;
} | null>(null);

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    signal: AbortSignal.timeout(15000),
    ...init,
  });
  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ error: "The server returned an unexpected response." }));
    throw Object.assign(new Error(payload.error || "The request failed."), {
      status: response.status,
    });
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export function SimulationProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    state: createInitialState(),
    revision: 0,
  });
  const current = useRef(snapshot);
  const csrf = useRef<string | null>(null);
  const writing = useRef(false);
  const [pending, setPending] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [configured, setConfigured] = useState(true);
  const [phase, setPhase] = useState<
    "loading" | "ready" | "signedout" | "error"
  >("loading");
  const [connectionError, setConnectionError] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
    id: number;
  } | null>(null);
  const notify = useCallback(
    (message: string, error = false) =>
      setToast({ message, error, id: Date.now() }),
    [],
  );
  const apply = useCallback((incoming: Snapshot) => {
    if (incoming.revision >= current.current.revision) {
      current.current = incoming;
      setSnapshot(incoming);
    }
    setConnectionError(false);
  }, []);
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const session = await request<Session>("/api/session");
        if (disposed) return;
        setConfigured(session.configured);
        csrf.current = session.csrfToken;
        if (!session.user) {
          setPhase("signedout");
          return;
        }
        const data = await request<Snapshot>("/api/state");
        if (disposed) return;
        apply(data);
        setUser(session.user);
        setPhase("ready");
      } catch {
        if (!disposed) setPhase("error");
      }
    })();
    return () => {
      disposed = true;
    };
  }, [apply]);
  const refresh = useCallback(async () => {
    const data = await request<Snapshot>("/api/state");
    apply(data);
  }, [apply]);
  useEffect(() => {
    if (!user) return;
    let disposed = false;
    const poll = async () => {
      if (writing.current) return;
      try {
        const response = await fetch("/api/state", {
          credentials: "same-origin",
          headers: { "If-None-Match": `"${current.current.revision}"` },
          signal: AbortSignal.timeout(5000),
        });
        if (disposed) return;
        if (response.status === 401) {
          setUser(null);
          csrf.current = null;
          setPhase("signedout");
          return;
        }
        if (response.status === 304) {
          setConnectionError(false);
          return;
        }
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!disposed) apply(data);
      } catch {
        if (!disposed) setConnectionError(true);
      }
    };
    const timer = setInterval(() => {
      void poll();
    }, 1500);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [user, apply]);
  const dispatch = useCallback(
    async (action: Action) => {
      if (writing.current) {
        notify("Wait for the current command to finish.", true);
        return false;
      }
      writing.current = true;
      setPending(true);
      try {
        const data = await request<Snapshot>("/api/actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf.current || "",
            "If-Match": `"${current.current.revision}"`,
          },
          body: JSON.stringify(action),
        });
        apply(data);
        return true;
      } catch (err) {
        const error = err as Error & { status?: number };
        if (error.status === 401) {
          setUser(null);
          csrf.current = null;
          setPhase("signedout");
        } else if (error.status === 409)
          await refresh().catch(() => setConnectionError(true));
        else if (!error.status) setConnectionError(true);
        notify(
          error.status
            ? error.message
            : "Server connection lost. The command was not confirmed; review the latest state before retrying.",
          true,
        );
        return false;
      } finally {
        writing.current = false;
        setPending(false);
      }
    },
    [apply, notify, refresh],
  );
  const login = async (username: string, password: string) => {
    const session = await request<Session>("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    csrf.current = session.csrfToken;
    current.current = { ...current.current, revision: 0 };
    const data = await request<Snapshot>("/api/state");
    apply(data);
    setUser(session.user);
    setPhase("ready");
  };
  const logout = async () => {
    try {
      await request("/api/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf.current || "" },
      });
      setUser(null);
      csrf.current = null;
      setToast(null);
      setPhase("signedout");
    } catch {
      notify(
        "Sign-out could not be confirmed. Check your connection and try again.",
        true,
      );
    }
  };
  useEffect(() => {
    document.documentElement.dataset.syncPending = pending ? "1" : "0";
  }, [pending]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const audible =
    !!user &&
    snapshot.state.settings.sounds &&
    !snapshot.state.silenced &&
    snapshot.state.alarms.some((a) => !a.acknowledged);
  useEffect(() => {
    if (!audible) return;
    let context: AudioContext;
    try {
      context = new AudioContext();
    } catch {
      return;
    }
    const beep = () => {
      if (context.state !== "running")
        void context.resume().catch(() => undefined);
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.frequency.value = 840;
      gain.gain.value = 0.025;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.18);
    };
    beep();
    const timer = setInterval(beep, 1800);
    return () => {
      clearInterval(timer);
      void context.close().catch(() => undefined);
    };
  }, [audible]);
  if (phase === "loading")
    return (
      <div className="connection-screen">
        <span className="auth-lock">J</span>
        <h1>Connecting to JailOpsSim…</h1>
        <p>Loading your shared operations workspace.</p>
      </div>
    );
  if (phase === "error")
    return (
      <div className="connection-screen">
        <h1>Server connection unavailable</h1>
        <p>Start the Node.js server, then reconnect.</p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Reconnect
        </button>
      </div>
    );
  if (phase === "signedout" || !user)
    return <SignIn onLogin={login} configured={configured} />;
  return (
    <Context.Provider
      value={{
        state: snapshot.state,
        dispatch,
        notify,
        connectionError,
        pending,
        user,
        logout,
      }}
    >
      {children}
      {toast && (
        <div className={`toast ${toast.error ? "error" : ""}`} role="status">
          <span>{toast.error ? "!" : "✓"}</span>
          {toast.message}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useSimulation() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("SimulationProvider missing");
  return ctx;
}
