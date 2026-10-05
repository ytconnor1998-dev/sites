"use client";

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { ConsentProvider } from "@/lib/consent";
import { LanguageProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ConsentProvider>
        {/* reducedMotion="user" turns off transform animations when the OS asks for reduced motion. */}
        <MotionConfig reducedMotion="user">
          <LazyMotion features={domAnimation} strict>
            {children}
          </LazyMotion>
        </MotionConfig>
        <CookieBanner />
      </ConsentProvider>
    </LanguageProvider>
  );
}
