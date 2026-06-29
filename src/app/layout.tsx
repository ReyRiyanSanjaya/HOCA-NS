import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeProvider }    from "@/providers/theme-provider";
import { QueryProvider }    from "@/providers/query-provider";
import { SettingsProvider } from "@/providers/settings-provider";
import { FilterProvider }   from "@/stores/filter-store";
import { AuthProvider }     from "@/providers/auth-provider";
import { Navbar }           from "@/components/layout/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "HCA NS Seeding Dashboard",
  description: "XL AXIS SmartFren New Site Seeding Operation Dashboard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HCA NS Seeding",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "HCA NS Seeding Dashboard",
    title: "HCA NS Seeding Dashboard",
    description: "XL AXIS SmartFren New Site Seeding Operation Dashboard",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <SettingsProvider>
              <FilterProvider>
                <AuthProvider>
                  <Navbar />
                  {children}
                  <Toaster
                    position="top-center"
                    richColors
                    closeButton
                    toastOptions={{ duration: 4000 }}
                  />
                </AuthProvider>
              </FilterProvider>
            </SettingsProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
