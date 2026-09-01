import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '寄りんさい | 寄り道ひとつ、思い出ひとつ。',
  description: '次の予定までに寄れる、あなた向けの広島観光スポットをAIが提案します。',
  keywords: ['広島観光', '寄り道', 'AI観光', '宮島', '広島駅', '原爆ドーム', '寄りんさい'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#38bdf8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=BIZ+UDPMincho:wght@400;700&family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Outfit:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gradient-to-b from-sky-100 via-blue-50 to-indigo-100/40 text-slate-800 antialiased flex justify-center selection:bg-blue-500 selection:text-white">
        <main className="w-full max-w-md min-h-screen relative shadow-2xl bg-white/30 backdrop-blur-[2px]">
          {children}
        </main>
      </body>
    </html>
  );
}
