import "./globals.css";

export const metadata = {
  title: {
    default: "FootballBank",
    template: "%s | FootballBank",
  },
  icons: {
    icon: [{ url: "/logo/logo3.png", type: "image/png" }],
    shortcut: ["/logo/logo3.png"],
    apple: [{ url: "/logo/logo3.png", type: "image/png" }],
  },
};

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
