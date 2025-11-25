import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import { ThemeProvider } from "@/lib/theme-provider";
import { IntlProvider } from "@/lib/intl-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OneNinety - Marketing Site",
  description: "OneNinety marketing and documentation site",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider
            appearance={{
              theme: shadcn,
            }}
            afterSignInUrl={
              process.env.NODE_ENV === "production"
                ? "https://app.oneninety.com"
                : "http://localhost:3001"
            }
            afterSignUpUrl={
              process.env.NODE_ENV === "production"
                ? "https://app.oneninety.com"
                : "http://localhost:3001"
            }
          >
            <IntlProvider>{children}</IntlProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
