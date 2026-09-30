import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { UserProvider } from '@/context/UserContext';
import { ToastProvider } from '@/context/ToastContext';
import { Shell } from '@/components/layout/Shell';

export const metadata: Metadata = {
  title: 'TrendPost — AI Viral Content Engine',
  description: 'Production full-stack SaaS platform automating multi-source trend normalization, virality scoring, OpenRouter AI generation, and Telegram delivery.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <UserProvider>
            <ToastProvider>
              <Shell>{children}</Shell>
            </ToastProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
