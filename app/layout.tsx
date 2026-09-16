import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { FirebaseProvider } from '@/components/FirebaseProvider';

export const metadata: Metadata = {
  title: 'Jojo - AI Companion',
  description: 'A warm, charming, emotionally expressive AI companion and study partner with Firebase persistence.',
  openGraph: {
    title: 'Jojo - AI Companion',
    description: 'A warm, charming, emotionally expressive AI companion and study partner with Firebase persistence.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jojo - AI Companion',
    description: 'A warm, charming, emotionally expressive AI companion and study partner with Firebase persistence.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <FirebaseProvider>{children}</FirebaseProvider>
      </body>
    </html>
  );
}

