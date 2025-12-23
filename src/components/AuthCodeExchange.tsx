import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Handles Supabase email-link auth flows that return a `?code=` (PKCE) parameter.
 * Without this, users can be redirected to /auth and appear to "need a password".
 */
export function AuthCodeExchange() {
  const location = useLocation();
  const navigate = useNavigate();
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      const error_description = hashParams.get("error_description") || hashParams.get("error");

      const shouldHandle = Boolean(code || (access_token && refresh_token) || error_description);
      if (!shouldHandle) return;
      if (exchanging) return;

      setExchanging(true);
      try {
        if (error_description) {
          toast({
            title: "Login failed",
            description: decodeURIComponent(error_description),
            variant: "destructive",
          });
          navigate("/auth", { replace: true });
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            toast({
              title: "Login failed",
              description: error.message,
              variant: "destructive",
            });
            navigate("/auth", { replace: true });
            return;
          }
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            toast({
              title: "Login failed",
              description: error.message,
              variant: "destructive",
            });
            navigate("/auth", { replace: true });
            return;
          }
        }

        // Remove auth params from URL to prevent re-processing on refresh
        url.searchParams.delete("code");
        url.searchParams.delete("type");
        url.searchParams.delete("token");
        url.searchParams.delete("redirect_to");
        window.history.replaceState({}, document.title, url.pathname + url.search);
        if (window.location.hash) window.history.replaceState({}, document.title, url.pathname + url.search);
      } catch (e: any) {
        toast({
          title: "Login failed",
          description: e?.message || "Could not complete magic link login.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
      } finally {
        setExchanging(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  if (!exchanging) return null;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
