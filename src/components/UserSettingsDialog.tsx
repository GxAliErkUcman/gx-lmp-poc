import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Settings, Sun, Moon, Monitor, Key, Mail, Shield } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllLanguages } from "@/lib/i18n";

interface UserSettingsDialogProps {
  triggerClassName?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default" | "icon";
  showLabel?: boolean;
}

export const UserSettingsDialog = ({
  triggerClassName = "",
  variant = "ghost",
  size = "sm",
  showLabel = true,
}: UserSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [availableLanguages, setAvailableLanguages] = useState(getAllLanguages());

  const currentLanguage = i18n.language?.split('-')[0] || 'en';

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setUserRole(data.role);
      }
    };

    if (open) {
      fetchUserRole();
      // Refresh available languages when dialog opens
      setAvailableLanguages(getAllLanguages());
    }
  }, [user, open]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast({
        title: t('validation.passwordTooShort'),
        description: t('validation.passwordTooShort'),
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t('validation.passwordsMustMatch'),
        description: t('validation.passwordsMustMatch'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        if (
          error.message?.includes(
            "New password should be different from the old password"
          ) ||
          error.message?.includes("same as the old password")
        ) {
          toast({
            title: "Password unchanged",
            description:
              "Your new password must be different from your current password.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: t('messages.success'),
        description: "Your password has been changed successfully.",
      });
      setPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: t('messages.error'),
        description: err.message || "Could not update password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordDialogOpen(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    if (value) {
      i18n.changeLanguage(value);
    }
  };

  const formatRole = (role: string | null) => {
    if (!role) return t('status.loading');
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={triggerClassName}>
          <Settings className="w-4 h-4" />
          {showLabel && <span className="hidden sm:inline ml-2">{t('settings.title')}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>
            Manage your account preferences and security settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Account Information Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t('settings.account')}
            </h4>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('settings.email')}</p>
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('settings.role')}</p>
                  <p className="text-sm font-medium">{formatRole(userRole)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t('settings.appearance')}
            </h4>
            <div className="rounded-lg border p-4">
              <ToggleGroup
                type="single"
                value={theme}
                onValueChange={(value) => value && setTheme(value)}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="light"
                  aria-label="Light theme"
                  className="gap-2"
                >
                  <Sun className="h-4 w-4" />
                  {t('theme.light')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="dark"
                  aria-label="Dark theme"
                  className="gap-2"
                >
                  <Moon className="h-4 w-4" />
                  {t('theme.dark')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="system"
                  aria-label="System theme"
                  className="gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  {t('theme.system')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Language Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t('settings.language')}
            </h4>
            <div className="rounded-lg border p-4">
              <Select value={currentLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(() => {
                      const lang = availableLanguages.find(l => l.code === currentLanguage);
                      return lang ? (
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      ) : 'Select language';
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t('settings.security')}
            </h4>
            <div className="rounded-lg border p-4">
              <Dialog
                open={passwordDialogOpen}
                onOpenChange={setPasswordDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <Key className="h-4 w-4" />
                    {t('settings.changePassword')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>{t('settings.changePassword')}</DialogTitle>
                    <DialogDescription>
                      Enter your new password below.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordReset} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 8 characters)"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t('status.loading') : t('actions.update')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
