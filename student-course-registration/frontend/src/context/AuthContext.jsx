import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { api } from "../api/paths.js";

const STORAGE_SESSION = "scr_session";

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SESSION) || "null");
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) {
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_SESSION);
  }
}

/** @typedef {{ email: string; role: 'student' | 'instructor' | 'admin'; studentId?: string; instructorId?: string }} SessionUser */

/** Parse response body once; prefer JSON `message` / `error` / `details`, else short text or status hint. */
async function parseAuthResponse(res) {
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  let fromJson = null;
  if (data && typeof data === "object") {
    const errKey = String(data.error ?? "").toLowerCase();
    if (errKey === "proxy_error") {
      const head = data.message ? String(data.message).trim() : "";
      const parts = [];
      if (data.hint) parts.push(String(data.hint).trim());
      if (data.details) parts.push(`(${String(data.details).trim()})`);
      const tail = parts.filter(Boolean).join(" ");
      fromJson =
        [head, tail].filter(Boolean).join(" ").trim() ||
        "Cannot reach the registration server. Start Express from student-course-registration/backend (npm run dev or npm start), wait for \"Server running\", then try again.";
    } else {
      fromJson = [data.message, data.details, data.error].find(
        (x) => x != null && String(x).trim() !== ""
      );
    }
  }
  const trimmed = text.trim();
  const nonHtmlSnippet =
    trimmed &&
    !trimmed.startsWith("<") &&
    trimmed.length < 400
      ? trimmed.slice(0, 300)
      : "";
  const staleBackend =
    /Cannot POST\s+\/api\/auth/i.test(text) ||
    /Cannot GET\s+\/api\/auth\/ping/i.test(text);
  const fallback404 = staleBackend
    ? "The backend on this port is an old process without sign-up routes. Stop it (Ctrl+C in the backend terminal), then run `npm run dev` or `npm start` again from student-course-registration/backend. Open GET /api/auth/ping — you should see JSON with \"routes\", not a 404 HTML page."
    : "Request failed (404). Run `npm run dev` from the frontend folder (not Live Server), leave VITE_API_BASE unset in dev, and start the backend on port 5000 (or set VITE_PROXY_API to match backend/.env PORT).";
  const fallbackOther = `Request failed (${res.status}). Start the backend and use Vite dev so /api is proxied to Express.`;
  const fallback502 =
    res.status === 502
      ? "The dev server could not reach the API (connection refused or wrong port). From student-course-registration/backend run npm run dev or npm start. If Express uses a different port, set the same value in backend/.env PORT and frontend/.env as VITE_PROXY_API (e.g. http://127.0.0.1:5000), then restart npm run dev in frontend."
      : null;
  const fallback = fallback502 || (res.status === 404 ? fallback404 : fallbackOther);
  const errorMessage = fromJson || nonHtmlSnippet || fallback;
  return { ok: res.ok, data, errorMessage };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUser(loadSession());
    setIsReady(true);
  }, []);

  const register = useCallback(
    async ({ email, password, role, studentId, instructorId }) => {
      try {
        const res = await fetch(api.authRegister(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            role,
            studentId,
            instructorId
          })
        });
        const { ok: resOk, data, errorMessage } = await parseAuthResponse(res);
        if (!resOk) {
          return { ok: false, error: errorMessage };
        }

        /** @type {SessionUser} */
        const session = data.user;
        if (!session || !session.email) {
          return {
            ok: false,
            error: "Invalid response from server (missing user). Check backend logs."
          };
        }
        saveSession(session);
        setUser(session);
        return { ok: true, user: session };
      } catch {
        return {
          ok: false,
          error:
            "Could not reach the server. Start the backend and use the Vite dev server so /api is proxied."
        };
      }
    },
    []
  );

  const login = useCallback(async ({ email, password }) => {
    try {
      const res = await fetch(api.authLogin(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const { ok: resOk, data, errorMessage } = await parseAuthResponse(res);
      if (!resOk) {
        return { ok: false, error: errorMessage };
      }

      /** @type {SessionUser} */
      const session = data.user;
      if (!session || !session.email) {
        return {
          ok: false,
          error: "Invalid response from server (missing user). Check backend logs."
        };
      }
      saveSession(session);
      setUser(session);
      return { ok: true, user: session };
    } catch {
      return {
        ok: false,
        error:
          "Could not reach the server. Start the backend and use the Vite dev server so /api is proxied."
      };
    }
  }, []);

  const logout = useCallback(() => {
    saveSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isReady,
      register,
      login,
      logout
    }),
    [user, isReady, register, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
