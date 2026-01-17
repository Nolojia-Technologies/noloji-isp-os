import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  updateResolvedTheme: () => void;
}

// Get system theme preference
function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

// Apply theme to document
function applyTheme(theme: "light" | "dark") {
  if (typeof window !== "undefined") {
    const root = window.document.documentElement;

    // Remove existing theme classes/attributes
    root.classList.remove("light", "dark");
    root.removeAttribute("data-theme");

    // Apply new theme
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = theme === "dark" ? "#0a0a0a" : "#ffffff";
      metaThemeColor.setAttribute("content", color);
    }
  }
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      resolvedTheme: getSystemTheme(),

      setTheme: (theme: Theme) => {
        set({ theme });

        let resolvedTheme: "light" | "dark";
        if (theme === "system") {
          resolvedTheme = getSystemTheme();
        } else {
          resolvedTheme = theme;
        }

        set({ resolvedTheme });
        applyTheme(resolvedTheme);
      },

      updateResolvedTheme: () => {
        const { theme } = get();
        let resolvedTheme: "light" | "dark";

        if (theme === "system") {
          resolvedTheme = getSystemTheme();
        } else {
          resolvedTheme = theme;
        }

        set({ resolvedTheme });
        applyTheme(resolvedTheme);
      },
    }),
    {
      name: "noloji-theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on rehydration
          state.updateResolvedTheme();

          // Listen for system theme changes
          if (typeof window !== "undefined") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handleChange = () => {
              if (state.theme === "system") {
                state.updateResolvedTheme();
              }
            };

            // Modern browsers
            if (mediaQuery.addEventListener) {
              mediaQuery.addEventListener("change", handleChange);
            } else {
              // Fallback for older browsers
              mediaQuery.addListener(handleChange);
            }
          }
        }
      },
    }
  )
);

// Theme utilities
export const themeUtils = {
  /**
   * Get the current resolved theme
   */
  getCurrentTheme(): "light" | "dark" {
    return useTheme.getState().resolvedTheme;
  },

  /**
   * Toggle between light and dark theme
   */
  toggle() {
    const current = useTheme.getState().resolvedTheme;
    useTheme.getState().setTheme(current === "dark" ? "light" : "dark");
  },

  /**
   * Check if current theme is dark
   */
  isDark(): boolean {
    return useTheme.getState().resolvedTheme === "dark";
  },

  /**
   * Check if current theme is light
   */
  isLight(): boolean {
    return useTheme.getState().resolvedTheme === "light";
  },

  /**
   * Get theme-appropriate color value
   */
  getColorValue(lightValue: string, darkValue: string): string {
    return this.isDark() ? darkValue : lightValue;
  },

  /**
   * Initialize theme on app start
   */
  initialize() {
    if (typeof window !== "undefined") {
      const state = useTheme.getState();
      state.updateResolvedTheme();

      // Add system theme change listener
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        if (state.theme === "system") {
          state.updateResolvedTheme();
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleChange);
      } else {
        mediaQuery.addListener(handleChange);
      }

      // Clean up function
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", handleChange);
        } else {
          mediaQuery.removeListener(handleChange);
        }
      };
    }
  }
};

// Brand color configurations
export const brandColors = {
  light: {
    primary: "210 82% 60%",
    accent: "142 76% 36%",
    secondary: "47 96% 53%",
    success: "142 76% 36%",
    warning: "47 96% 53%",
    danger: "0 84% 60%",
    info: "210 82% 60%",
  },
  dark: {
    primary: "210 82% 60%",
    accent: "142 76% 36%",
    secondary: "47 96% 53%",
    success: "142 76% 36%",
    warning: "47 96% 53%",
    danger: "0 84% 60%",
    info: "210 82% 60%",
  }
};

// CSS custom properties updater
export function updateCSSVariables(customColors?: Partial<typeof brandColors.light>) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const theme = useTheme.getState().resolvedTheme;
  const colors = { ...brandColors[theme], ...customColors };

  // Update CSS custom properties
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--brand-${key}`, value);
  });
}

// Theme configuration for components
export const themeConfig = {
  animation: {
    duration: {
      fast: "150ms",
      normal: "250ms",
      slow: "350ms",
    },
    easing: {
      easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
  borderRadius: {
    small: "0.25rem",
    medium: "0.5rem",
    large: "0.75rem",
    full: "9999px",
  },
  shadows: {
    small: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    medium: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    large: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
};