import { LayoutDashboard, Trophy, UserCircle, History, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { NavLink } from "react-router"

export type View = 'arena' | 'leaderboard' | 'profiles' | 'history';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const navItems = [
    { id: 'arena', icon: LayoutDashboard, label: 'ARENA', path: '/' },
    { id: 'leaderboard', icon: Trophy, label: 'LEADERBOARD', path: '/leaderboard' },
    { id: 'profiles', icon: UserCircle, label: 'PROFILES', path: '/profiles' },
    { id: 'history', icon: History, label: 'HISTORY', path: '/history' },
  ] as const;

  return (
    <nav className={cn(
      "flex flex-col border-r border-border bg-muted/20 items-center py-8 gap-8 shrink-0 transition-all duration-300 relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn(
        "bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 transition-all duration-300",
        isCollapsed ? "w-10 h-10" : "w-12 h-12"
      )}>
        <span className={cn("text-primary-foreground font-black italic", isCollapsed ? "text-lg" : "text-xl")}>C</span>
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm z-50 hover:bg-accent"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label="Toggle Sidebar"
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
      
      <div className="flex flex-col w-full gap-4 px-3">
        {navItems.map((item) => (
          <NavLink 
            key={item.id}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative w-full",
              isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              isCollapsed ? "justify-center" : "justify-start"
            )}
          >
            <item.icon className="h-6 w-6 shrink-0" />
            {!isCollapsed && (
              <span className="font-bold text-xs tracking-widest transition-opacity duration-300">
                {item.label}
              </span>
            )}
            {isCollapsed && (
              <span className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-bold rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
