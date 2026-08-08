import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

import Sidebar from "./components/Sidebar";
import { useLocation, useNavigate } from "react-router";
import { useEffect } from "react";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAppRoute =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/feed") ||
    location.pathname.startsWith("/chat") ||
    location.pathname.startsWith("/opportunities") ||
    location.pathname.startsWith("/events") ||
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/people") ||
    location.pathname.startsWith("/connections") ||
    location.pathname.startsWith("/network") ||
    location.pathname.startsWith("/wallet") ||
    location.pathname.startsWith("/leaderboard") ||
    location.pathname.startsWith("/admin-rewards");

  useEffect(() => {
    // 1. Monkey patch fetch to securely include cookies for backend API calls
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      let [resource, config] = args;
      if (typeof resource === "string" && resource.startsWith("http://localhost:5000")) {
        config = config || {};
        config.credentials = "include";
      }
      return originalFetch(resource, config);
    };

    // 2. Auto-login using the HTTPOnly cookie
    const API = "http://localhost:5000";
    originalFetch(`${API}/api/auth/me`, { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Unauthorized");
      })
      .then((data) => {
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          if (
            location.pathname === "/" ||
            location.pathname === "/login" ||
            location.pathname === "/signup"
          ) {
            navigate("/feed");
          }
        }
      })
      .catch(() => {
        if (isAppRoute) {
          localStorage.removeItem("user");
          navigate("/login");
        }
      });
  }, []);

  // ── Landing / Auth routes: render without sidebar or app-shell ──
  if (!isAppRoute) {
    return <Outlet />;
  }

  // ── App routes: wrap in app-shell so scoped CSS applies ──
  return (
    <div className="app-shell" style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      <Sidebar />
      <main
        style={{ marginLeft: 280, padding: 0, minHeight: "100vh" }}
        className="app-main"
      >
        <Outlet />
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
