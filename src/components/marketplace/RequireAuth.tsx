import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !user) navigate({ to: "/login" });
  }, [mounted, user, loading, navigate]);

  if (!mounted || loading) return <div className="p-8 text-center text-muted-foreground" suppressHydrationWarning>Carregando…</div>;
  if (!user) return null;
  return <>{children}</>;
}
