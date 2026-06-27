import "./globals.css";

export const metadata = {
  title: "Vellari | Al Karama's Kerala Street Eats",
  description: "Authentic, high-energy Kerala street eats in Al Karama, Dubai. Sizzling beef fry, flaky parotta, meter chai, and more.",
  openGraph: {
    title: "Vellari | Al Karama's Kerala Street Eats",
    description: "Authentic, high-energy Kerala street eats in Al Karama, Dubai. Sizzling beef fry, flaky parotta, meter chai, and more.",
    images: [{ url: "/street_food_hero.png" }],
    type: "website",
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <link href="https://fonts.cdnfonts.com/css/gotham" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
