import "../frontend/src/components/GlobalStyles.css";

export const metadata = {
  title: "TripNest — India's Premier Online Bus Ticket Booking Platform",
  description: "Book online bus tickets with TripNest. Compare prices from 3000+ top operators, enjoy live bus tracking, Primo certified rides, instant seat holds, and 24/7 support.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
