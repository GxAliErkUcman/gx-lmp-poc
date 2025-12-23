import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [working, setWorking] = useState(true);

  const redirectTarget = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect") || "/client-dashboard";
  }, [location.search]);

  useEffect(() => {
    document.title = "Signing you in | Jasoner";

    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      const error_description = hashParams.get("error_description") || hashParams.get("error");

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

        // Clean URL (remove auth params) to avoid re-processing on refresh.
        url.searchParams.delete("code");
        url.searchParams.delete("type");
        url.searchParams.delete("token");
        url.searchParams.delete("redirect_to");
        window.history.replaceState({}, document.title, url.pathname + url.search);
        if (window.location.hash) window.history.replaceState({}, document.title, url.pathname + url.search);

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate(redirectTarget, { replace: true });
          return;
        }

        toast({
          title: "Login failed",
          description: "Could not complete magic link login.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
      } finally {
        setWorking(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="w-full max-w-md">
        <h1 className="sr-only">Magic link login</h1>
        <Card>
          <CardHeader>
            <CardTitle>Signing you in</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Please wait…</p>
          </CardContent>
        </Card>
        {!working ? (
          <p className="mt-4 text-xs text-muted-foreground">
            If you keep landing on the password screen, your Supabase redirect URLs likely don’t include this domain.
          </p>
        ) : null}
      </section>
    </main>
  );
}
