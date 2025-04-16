import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark"; // Only allow dark theme

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void; // Keep the interface but it will always set to dark
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark", // Always default to dark
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  // Always use dark theme, ignoring stored value
  const [theme] = useState<Theme>("dark");

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove light class if it exists
    root.classList.remove("light");
    
    // Always add dark class
    if (!root.classList.contains("dark")) {
      root.classList.add("dark");
    }
    
    // Always store dark theme
    localStorage.setItem(storageKey, "dark");
  }, []); // Only run once on mount

  const value = {
    theme,
    // This setTheme function is maintained for compatibility but does nothing
    setTheme: () => {
      // No-op - we always stay in dark mode
    },
  };

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
}