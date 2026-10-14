import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

/** Shows the page only to signed-in users. Everyone else goes to the login page. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <FullPageMessage text="Loading your session..." />;
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Login and sign-up pages: signed-in users are sent to the dashboard instead. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return <FullPageMessage text="Loading..." />;
  }
  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export function FullPageMessage({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="text-sm opacity-70">{text}</p>
    </main>
  );
}
