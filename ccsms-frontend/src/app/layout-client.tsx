'use client';

import { Providers } from "./providers";
import { ThemeProvider } from "./theme-provider";
import { ReactNode } from "react";

export function LayoutClient({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Providers>{children}</Providers>
    </ThemeProvider>
  );
}
