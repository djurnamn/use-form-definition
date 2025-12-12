import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "use-form-definition - Next.js i18n Example",
  description: "Demonstrating server-side validation and internationalization with use-form-definition",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
