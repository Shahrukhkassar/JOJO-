import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Jojo - AI Companion',
  description: 'A warm, charming, emotionally expressive AI companion and study partner.',
  openGraph: {
    title: 'Jojo - AI Companion',
    description: 'A warm, charming, emotionally expressive AI companion and study partner.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jojo - AI Companion',
    description: 'A warm, charming, emotionally expressive AI companion and study partner.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
