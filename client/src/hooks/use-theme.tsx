import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

type Theme = "light" | "dark" | "system";

interface ThemeColors {
  lightModeColor: string;
  darkModeColor: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: ThemeColors;
  currentAccentColor: string;  // The current accent color based on theme
}

const DEFAULT_COLORS: ThemeColors = {
  lightModeColor: "#1E40AF", // Default blue for light mode
  darkModeColor: "#F9B200"   // Default yellow for dark mode
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [currentAccentColor, setCurrentAccentColor] = useState<string>(DEFAULT_COLORS.darkModeColor);

  // Fetch brand colors from the API
  const { data: settingsData } = useQuery({
    queryKey: ["/api/system-settings"],
    async queryFn() {
      try {
        const res = await fetch("/api/system-settings");
        if (!res.ok) return DEFAULT_COLORS;
        const data = await res.json();
        return {
          lightModeColor: data.lightModeColor || DEFAULT_COLORS.lightModeColor,
          darkModeColor: data.darkModeColor || DEFAULT_COLORS.darkModeColor
        };
      } catch (error) {
        console.error("Error fetching theme colors:", error);
        return DEFAULT_COLORS;
      }
    }
  });
  
  // Update colors when settings data changes
  useEffect(() => {
    if (settingsData) {
      setColors(settingsData);
    }
  }, [settingsData]);

  // Update CSS variables for theme colors
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-light-accent', colors.lightModeColor);
    root.style.setProperty('--theme-dark-accent', colors.darkModeColor);
  }, [colors]);

  // Function to determine current theme (considering system preference)
  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme as 'light' | 'dark';
  };

  // Update theme classes and current accent color
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all previous theme classes
    root.classList.remove("light", "dark");

    // Determine effective theme (actual theme after resolving 'system')
    const effectiveTheme = getEffectiveTheme();
    root.classList.add(effectiveTheme);
    
    // Set current accent color based on effective theme
    setCurrentAccentColor(
      effectiveTheme === 'dark' ? colors.darkModeColor : colors.lightModeColor
    );
  }, [theme, colors]);

  // Update theme in local storage when it changes
  useEffect(() => {
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  // Watch for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      if (theme === "system") {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        const newTheme = mediaQuery.matches ? "dark" : "light";
        root.classList.add(newTheme);
        
        // Update current accent color
        setCurrentAccentColor(
          newTheme === 'dark' ? colors.darkModeColor : colors.lightModeColor
        );
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, colors]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
    },
    colors,
    currentAccentColor
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