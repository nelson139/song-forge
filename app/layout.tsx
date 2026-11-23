import type { Metadata } from "next";
import { Cinzel_Decorative } from "next/font/google";
import "./globals.css";

const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Song Forge",
  description: "An app that finds similar songs based on a given track",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
    >
      <body className={`${cinzelDecorative.className} bg-linear-to-b from-[#685848] to-[#372F27] bg-no-repeat bg-cover bg-center min-h-screen`}>{children}</body>
    </html>
  );
}
