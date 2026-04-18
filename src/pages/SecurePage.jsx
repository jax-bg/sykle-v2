import { useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function SecurePage() {
  const { user, logout } = useAuth();
  const userLabel = useMemo(() => {
    if (!user) return "Unknown user";
    return user.email || user.id || "Signed-in user";
  }, [user]);

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-3xl mx-auto px-6">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-3xl font-semibold mb-3">Secure page</h1>
          <p className="text-muted-foreground mb-6">
            This page is only visible to a signed-in user.
          </p>

          <div className="space-y-4">
            <div className="rounded-2xl bg-muted p-4">
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="font-medium break-all">{userLabel}</p>
            </div>

            <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-700">
                You can use this page to access private content, save user-specific data, or show special features.
              </p>
            </div>

            <Button variant="outline" onClick={() => logout(false)}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
