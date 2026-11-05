import "../frontend/src/components/GlobalStyles.css";

export const metadata = {
  title: "TripNest | Find your next journey",
  description: "Compare and book demo bus, train, and flight journeys with TripNest.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
