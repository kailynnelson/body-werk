import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./providers/AuthProvider";
import { metadata } from "./metadata";
import CreditsButton from "@/components/CreditsButton";
import LogoButton from "@/components/LogoButton";

const inter = Inter({ subsets: ["latin"] });

export { metadata };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen text-white overflow-x-hidden`}>
        <div className="fixed inset-0">
          <div className="animated-gradient" />
          <div className="noise" />
        </div>
        <AuthProvider>
          <main className="relative container mx-auto px-4 py-8">
            {children}
          </main>
          <LogoButton />
          <CreditsButton />
        </AuthProvider>
      </body>
    </html>
  );
}
