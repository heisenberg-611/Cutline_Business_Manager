import "../polyfill";
import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from "@/components/theme-provider"
import { PWARegister } from "@/components/pwa-register"
import { OneSignalInit } from "@/components/onesignal-init"
import Script from "next/script";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    template: '%s | Cutline OS',
    default: 'Cutline OS',
  },
  description: "Business Operating System for Creative Professionals",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cutline OS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/cutline-logo.JPG",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased font-sans`}
      >
        <body className="min-h-full flex flex-col">
          <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" />
          <Script id="onesignal-init" strategy="afterInteractive">
            {`
              window.OneSignalDeferred = window.OneSignalDeferred || [];
              window.OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.init({
                  appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "16fa8c06-2ba4-49e4-aa97-27a784494e33"}",
                  safari_web_id: "web.onesignal.auto.5e2915a8-1095-4900-b2af-7b25bf2970dd",
                  notifyButton: {
                    enable: true,
                  },
                  serviceWorkerPath: "OneSignalSDKWorker.js",
                  serviceWorkerParam: { scope: "/" }
                });
              });
            `}
          </Script>
          <OneSignalInit />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <PWARegister />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
