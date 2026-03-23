import type { Metadata } from 'next'
import './globals.css'
import ThemeProvider from '@/app/workspace/theme-provider'

export const metadata: Metadata = {
  title: 'Week 8 Prompt Chain Tool',
  description: 'Admin workspace for humor flavors, prompt steps, and caption testing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
