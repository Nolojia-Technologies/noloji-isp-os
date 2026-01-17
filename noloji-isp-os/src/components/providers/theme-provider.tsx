"use client";

import * as React from "react";
import { themeUtils } from "@/lib/theme";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const cleanup = themeUtils.initialize();
    return cleanup;
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}