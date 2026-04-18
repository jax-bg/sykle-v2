import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { isAuthenticated, signInWithGoogle, checkUserAuth } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      if (window.location.search.includes("access_token") || window.location.search.includes("type=success")) {
        try {
          const { error: urlError } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (urlError) {
            setError(urlError.message);
            return;
          }

          await checkUserAuth();
          navigate("/secure");
        } catch (err) {
          setError(err?.message || "Unable to complete sign-in.");
        }
      } else if (isAuthenticated) {
        navigate("/secure");
      }
    };

    handleRedirect();
  }, [checkUserAuth, isAuthenticated, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err?.message || "Google sign in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-lg">
        <h1 className="text-3xl font-semibold mb-3">Sign in with Google</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You must sign in before accessing protected content.
        </p>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button onClick={handleGoogleLogin} className="w-full h-14 rounded-xl text-base font-semibold" disabled={loading}>
          {loading ? "Opening Google..." : "Continue with Google"}
        </Button>
      </div>
    </div>
  );
}
