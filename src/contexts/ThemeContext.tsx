import React, { createContext, useContext, useEffect, useState } from "react";

export type AppTheme = "gx" | "legacy" | "dark" | "gx-dark" | "gx-new";

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "gx",
  setTheme: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

// Compatibility hook for components using next-themes API (e.g. Sonner)
export const useTheme = () => {
  const { theme } = useAppTheme();
  return { theme: (theme === "dark" || theme === "gx-dark" || theme === "gx-new") ? "dark" : "light" };
};

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const stored = localStorage.getItem("app-theme");
    if (stored === "gx" || stored === "legacy" || stored === "dark" || stored === "gx-dark" || stored === "gx-new") return stored;
    return "gx";
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Clear all theme classes
    root.classList.remove("dark", "theme-gx", "theme-legacy", "theme-gx-dark", "theme-gx-new");

    switch (theme) {
      case "dark":
        root.classList.add("dark");
        break;
      case "gx-dark":
        root.classList.add("theme-gx-dark");
        break;
      case "gx-new":
        root.classList.add("theme-gx-new");
        break;
      case "legacy":
        root.classList.add("theme-legacy");
        break;
      case "gx":
      default:
        root.classList.add("theme-gx");
        break;
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
