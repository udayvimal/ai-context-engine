import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReSync AI",
  description: "Resume any AI session instantly",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, background: "#09090b", color: "#d0d0dc" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
