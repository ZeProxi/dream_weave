import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "./components/Toast";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DreamWalk - AI Voice Experience Platform",
  description: "Real-time AI character interactions powered by OpenAI and ElevenLabs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-primary_dark text-text_primary`}
      >
        <AuthProvider>
          <ToastProvider>
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
