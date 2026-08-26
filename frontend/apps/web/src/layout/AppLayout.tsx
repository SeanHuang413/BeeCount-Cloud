import type { ReactNode } from 'react'

type AppLayoutProps = {
  header: ReactNode
  children: ReactNode
}

export function AppLayout({ header, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {header}
      <main className="w-full px-4 pb-6 md:px-6">
        <div className="mx-auto w-full max-w-[1440px]">
          {children}
        </div>
      </main>
    </div>
  )
}
