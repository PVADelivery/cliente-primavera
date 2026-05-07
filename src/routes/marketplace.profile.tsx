import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/marketplace/RequireAuth";
import { LogOut, MapPin, Tag, FileText, Shield } from "lucide-react";

export const Route = createFileRoute("/marketplace/profile")({
  head: () => ({ meta: [{ title: "Perfil — Primavera Delivery" }] }),
  component: () => (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  ),
});

function Profile() {
  const { user, signOut } = useAuth();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </header>
      <ul className="space-y-2">
        <ProfileItem icon={<MapPin className="w-4 h-4" />} label="Endereços" />
        <ProfileItem icon={<Tag className="w-4 h-4" />} label="Cupons" />
        <ProfileItem icon={<FileText className="w-4 h-4" />} label="Termos de uso" to="/marketplace/terms" />
        <ProfileItem icon={<Shield className="w-4 h-4" />} label="Política de privacidade" to="/marketplace/privacy" />
      </ul>
      <button onClick={signOut} className="w-full py-3 rounded-2xl bg-destructive/10 text-destructive font-medium flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" /> Sair
      </button>
    </div>
  );
}

function ProfileItem({ icon, label, to }: { icon: React.ReactNode; label: string; to?: string }) {
  const content = (
    <div className="flex items-center gap-3 p-3.5 bg-card rounded-2xl border border-border">
      <span className="w-8 h-8 grid place-items-center rounded-lg bg-secondary text-foreground">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
  if (to) return <li><Link to={to as "/marketplace/terms"}>{content}</Link></li>;
  return <li>{content}</li>;
}
