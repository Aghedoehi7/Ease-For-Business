import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import Chatbot from "@/components/chatbot/Chatbot";
import SettingsProvider from "@/components/settings/SettingsProvider";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ease for Business - Inventory & AI Chatbot for Nigerian SMEs",
  description: "Ease for Business delivers modern inventory management and AI-powered business solutions for Nigerian SMEs. Manage stock, track sales, and get intelligent business insights.",
  keywords: ["inventory", "SME", "Nigeria", "chatbot", "business management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <SettingsProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <Chatbot />
        </SettingsProvider>
      </body>
    </html>
  );
}
