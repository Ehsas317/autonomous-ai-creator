import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autonomous AI Creator",
  description: "An autonomous AI technology persona that discovers, evaluates, and publishes content without human intervention.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}