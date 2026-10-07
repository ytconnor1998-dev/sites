import { useCallback, useEffect, useState } from "react";
import { api, type State } from "./api.ts";
import { Login } from "./views/Login.tsx";
import { Library } from "./views/Library.tsx";
import { CalendarView } from "./views/Calendar.tsx";
import { Accounts } from "./views/Accounts.tsx";
import { SettingsView } from "./views/Settings.tsx";

type Route = "library" | "calendar" | "accounts" | "settings";
const ROUTES: { id: Route; label: string }[] = [
  { id: "library", label: "Videos" },
  { id: "calendar", label: "Schedule" },
  { id: "accounts", label: "Accounts" },
  { id: "settings", label: "Settings" },
];

function readRoute(): { route: Route; query: URLSearchParams } {
  const [p, q] = location.hash.replace(/^#\/?/, "").split("?");
  const route = (ROUTES.find((r) => r.id === p)?.id ?? "library") as Route;
  return { route, query: new URLSearchParams(q ?? "") };
}

export function App() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [{ route, query }, setRoute] = useState(readRoute);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    const on = () => setRoute(readRoute());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    api<{ loggedIn: boolean }>("/api/me").then((r) => setLoggedIn(r.loggedIn));
  }, []);

  const refresh = useCallback(async () => {
    try {
      setState(await api<State>("/api/state"));
    } catch (e) {
      if ((e as { status?: number }).status === 401) setLoggedIn(false);
    }
  }, []);

  // Poll faster while the AI or an upload is busy.
  const busy =
    state?.videos.some((v) => v.status === "uploaded" || v.status === "analyzing" || v.posts.some((p) => p.status === "uploading" || p.status === "processing")) ??
    false;
  useEffect(() => {
    if (!loggedIn) return;
    refresh();
    const t = setInterval(refresh, busy ? 3000 : 15000);
    return () => clearInterval(t);
  }, [loggedIn, busy, refresh]);

  const notify = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), bad ? 7000 : 4000);
  }, []);

  if (loggedIn === null) return null;
  if (!loggedIn) return <Login onDone={() => setLoggedIn(true)} />;

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#/library">
          <span className="brand-mark" aria-hidden>
            ▶
          </span>
          Shorts Autopilot
        </a>
        <nav>
          {ROUTES.map((r) => (
            <a key={r.id} href={`#/${r.id}`} aria-current={route === r.id ? "page" : undefined}>
              {r.label}
            </a>
          ))}
        </nav>
        <button
          className="ghost small"
          onClick={async () => {
            await api("/api/logout", "POST");
            setLoggedIn(false);
          }}
        >
          Log out
        </button>
      </header>

      <main>
        {!state ? (
          <p className="muted">Loading…</p>
        ) : route === "library" ? (
          <Library state={state} refresh={refresh} notify={notify} />
        ) : route === "calendar" ? (
          <CalendarView state={state} refresh={refresh} notify={notify} />
        ) : route === "accounts" ? (
          <Accounts state={state} refresh={refresh} notify={notify} query={query} />
        ) : (
          <SettingsView state={state} refresh={refresh} notify={notify} />
        )}
      </main>

      {toast && (
        <div className={`toast ${toast.bad ? "bad" : ""}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}

export interface ViewProps {
  state: State;
  refresh: () => Promise<void>;
  notify: (text: string, bad?: boolean) => void;
}
