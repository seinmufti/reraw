import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n/en";
import {
  clearAdminPassword,
  getAdminPassword,
  setAdminPassword,
} from "@/lib/adminAuth";

export function AdminPasswordGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "open">(
    "checking",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = getAdminPassword();
    if (!stored) {
      setStatus("locked");
      return;
    }
    void api
      .unlockAdmin(stored)
      .then(() => setStatus("open"))
      .catch(() => {
        clearAdminPassword();
        setStatus("locked");
      });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.unlockAdmin(password);
      setAdminPassword(password);
      setStatus("open");
    } catch {
      setError(t("adminPasswordWrong"));
    } finally {
      setBusy(false);
    }
  }

  if (status === "open") return <>{children}</>;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("adminTitle")}</h1>
      <p className="max-w-sm text-muted-foreground">{t("adminPasswordHint")}</p>
      {status === "locked" && (
        <form
          onSubmit={(event) => void onSubmit(event)}
          className="flex w-full max-w-xs flex-col gap-3 text-left"
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">{t("adminPassword")}</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy || password.length === 0}>
            {busy ? t("loading") : t("adminUnlock")}
          </Button>
        </form>
      )}
      <Button variant="outline" asChild>
        <Link to="/">{t("backToMap")}</Link>
      </Button>
    </div>
  );
}
