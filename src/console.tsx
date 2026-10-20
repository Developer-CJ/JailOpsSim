import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Page } from "./model";
import { Button } from "./components";
import { useSimulation } from "./store";

export const consolePages: Page[] = [
  "controls",
  "fire",
  "cameras",
  "communications",
  "environment",
  "facility-view",
];
export function openConsole(page: Page, recordId?: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("console", "1");
  url.hash = page + (recordId ? `/${encodeURIComponent(recordId)}` : "");
  const child = window.open(
    url.toString(),
    `jailops-${page}`,
    "popup=yes,width=1600,height=1000,resizable=yes,scrollbars=yes",
  );
  if (child) {
    child.focus();
    return true;
  }
  return false;
}
export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("jailops-theme") ?? "dark";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("jailops-theme", theme);
    } catch {
      /* Appearance remains available without browser storage. */
    }
  }, [theme]);
  useEffect(() => {
    const update = (e: StorageEvent) => {
      if (e.key === "jailops-theme" && e.newValue) setTheme(e.newValue);
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  return (
    <button
      className="icon-button theme-toggle"
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
export function ConsoleFrame({
  page,
  title,
  children,
}: {
  page: Page;
  title: string;
  children: ReactNode;
}) {
  const { connectionError, pending } = useSimulation();
  const [full, setFull] = useState(false);
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    const change = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  return (
    <div className="console-shell" data-focus={focus ? "1" : "0"}>
      <header className="console-bar">
        <a href={window.location.pathname + "#overview"}>
          <ArrowLeft size={17} />
          Main suite
        </a>
        <div>
          <Monitor size={20} />
          <strong>{title}</strong>
          <span className="console-training">TRAINING CONSOLE</span>
        </div>
        <div>
          <span
            className={`console-connection ${connectionError ? "offline" : ""}`}
          >
            <i />
            {pending
              ? "Saving…"
              : connectionError
                ? "Reconnecting"
                : "Connected"}
          </span>
          <ThemeToggle />
          {page === "fire" && (
            <Button onClick={() => setFocus(!focus)}>
              {focus ? "Show workspace" : "Focus panel"}
            </Button>
          )}
          <Button
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else
                void document.documentElement
                  .requestFullscreen()
                  .catch(() => undefined);
            }}
          >
            {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span>{full ? "Exit full screen" : "Full screen"}</span>
          </Button>
        </div>
      </header>
      <main className={`dedicated-console console-${page}`}>
        {connectionError && (
          <div className="info-strip">
            Server connection interrupted. Reconnecting automatically.
          </div>
        )}
        {children}
      </main>
      <footer className="console-footer">
        <span>JAILOPSSIM / {title.toUpperCase()}</span>
        <span>Fictional training systems · Shared server state</span>
      </footer>
    </div>
  );
}
export function ConsoleLauncher({
  page,
  title,
  description,
  children,
}: {
  page: Page;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [blocked, setBlocked] = useState(false);
  return (
    <div className="console-launcher">
      <div className="launcher-orbit">
        <Monitor size={52} />
        <i />
        <i />
      </div>
      <div className="eyebrow">DEDICATED CONTROL WORKSPACE</div>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="launcher-status">{children}</div>
      <Button variant="primary" onClick={() => setBlocked(!openConsole(page))}>
        <ExternalLink size={17} />
        Open {title} console
      </Button>
      <a className="inline-console-link" href={`?console=1#${page}`}>
        {blocked
          ? "Popup blocked. Open the console in this window"
          : "Use this window instead"}
      </a>
      <div className="launcher-specs">
        <span>Independent window</span>
        <span>Full-screen display</span>
        <span>Live shared state</span>
      </div>
    </div>
  );
}
