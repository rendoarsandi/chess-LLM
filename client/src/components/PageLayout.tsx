import React, { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  customHeader?: (props: {
    isMobileMenuOpen: boolean
    setIsMobileMenuOpen: (open: boolean) => void
    isSidebarCollapsed: boolean
    setIsSidebarCollapsed: (collapsed: boolean) => void
  }) => React.ReactNode
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: (collapsed: boolean) => void
}

export function PageLayout({
  children,
  title,
  customHeader,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
}: PageLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <div className="hidden lg:block">
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
        {customHeader ? (
          customHeader({
            isMobileMenuOpen: isMobileNavOpen,
            setIsMobileMenuOpen: setIsMobileNavOpen,
            isSidebarCollapsed,
            setIsSidebarCollapsed,
          })
        ) : (
          <header className="h-16 border-b border-border px-4 md:px-8 flex items-center gap-4 bg-background/50 backdrop-blur-md shrink-0">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SheetHeader className="p-6 pb-0 sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>Main navigation menu for mobile devices.</SheetDescription>
                </SheetHeader>
                <Sidebar
                  isCollapsed={false}
                  setIsCollapsed={() => {}}
                  mobile
                  onItemClick={() => setIsMobileNavOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <h2 className="text-xl font-black tracking-tighter uppercase italic">{title}</h2>
          </header>
        )}
        {children}
      </div>
    </div>
  )
}
