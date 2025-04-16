import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentTheme: "light" | "dark"; // Actual applied theme
  brandColors: {
    lightModeColor: string;
    darkModeColor: string;
  };
}

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
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");
  const [brandColors, setBrandColors] = useState({
    lightModeColor: "#1E40AF", // Default blue
    darkModeColor: "#F9B200"   // Default yellow
  });

  // Fetch system settings for brand colors
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/system-settings"],
    async queryFn() {
      try {
        const res = await fetch("/api/system-settings");
        if (!res.ok) return null;
        return await res.json();
      } catch (error) {
        console.error("Error fetching system settings:", error);
        return null;
      }
    }
  });

  // Update brand colors when settings are loaded
  useEffect(() => {
    if (systemSettings) {
      const newColors = {
        lightModeColor: systemSettings.lightModeColor || brandColors.lightModeColor,
        darkModeColor: systemSettings.darkModeColor || brandColors.darkModeColor
      };
      setBrandColors(newColors);
      
      // Apply the brand colors immediately through CSS variables
      applyBrandColors(newColors, currentTheme);
    }
  }, [systemSettings, currentTheme]);
  
  // Function to apply brand colors as CSS variables
  const applyBrandColors = (colors: { lightModeColor: string, darkModeColor: string }, mode: "light" | "dark") => {
    const root = window.document.documentElement;
    const accentColor = mode === "light" ? colors.lightModeColor : colors.darkModeColor;
    
    // Set the accent color as a CSS variable
    root.style.setProperty('--accent-color', accentColor);
    root.style.setProperty('--brand-color', accentColor);
    
    // Additional variables for specific color variants
    root.style.setProperty('--accent-foreground', '#ffffff');
    
    if (mode === "dark") {
      // Dark mode specific variables
      root.style.setProperty('--background', '#1F1F1F');
      root.style.setProperty('--foreground', '#ffffff');
      root.style.setProperty('--card', '#282828');
      root.style.setProperty('--card-foreground', '#ffffff');
      root.style.setProperty('--border', '#333333');
    } else {
      // Light mode specific variables
      root.style.setProperty('--background', '#ffffff');
      root.style.setProperty('--foreground', '#0F172A');
      root.style.setProperty('--card', '#ffffff');
      root.style.setProperty('--card-foreground', '#0F172A');
      root.style.setProperty('--border', '#e2e8f0');
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all previous theme classes
    root.classList.remove("light", "dark");

    let actualTheme: "light" | "dark";
    
    if (theme === "system") {
      actualTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
    } else {
      actualTheme = theme as "light" | "dark";
    }
    
    // Set the current theme for other components to reference
    setCurrentTheme(actualTheme);
    
    // Add the theme class to the root element
    root.classList.add(actualTheme);
    
    // Apply brand colors
    applyBrandColors(brandColors, actualTheme);
    
  }, [theme, brandColors]);

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
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        
        root.classList.remove("light", "dark");
        root.classList.add(systemTheme);
        
        // Update current theme
        setCurrentTheme(systemTheme);
        
        // Apply brand colors for the new theme
        applyBrandColors(brandColors, systemTheme);
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, brandColors]);

  const value = {
    theme,
    currentTheme,
    brandColors,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
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