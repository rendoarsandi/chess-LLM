import { LayoutDashboard, Trophy, UserCircle, ChevronLeft, ChevronRight, Settings, LogOut, LogIn, BarChart3, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { NavLink, useNavigate } from "react-router"
import { authClient } from "@/lib/auth-client"
import { useEffect, useState } from "react"
import { getTournaments } from "@/api"

export type View = 'arena' | 'leaderboard' | 'profiles' | 'history' | 'settings';

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  path: string;
  indicator?: boolean;
}

interface NavContentProps {
  isCollapsed: boolean;
  navItems: NavItem[];
  session: { user: { id: string; name: string; email: string; image?: string | null }; session: { id: string; userId: string; expiresAt: Date; token: string; createdAt: Date; updatedAt: Date } } | null;
  handleLogout: () => Promise<void>;
  onItemClick?: () => void;
}

function NavContent({ isCollapsed, navItems, session, handleLogout, onItemClick }: NavContentProps) {
  return (
    <>
      <div className="flex flex-col w-full gap-2 px-3 flex-1">
        {navItems.map((item) => (
          <NavLink 
            key={item.id}
            to={item.path}
            onClick={onItemClick}
            className={({ isActive }) => cn(
              "flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative w-full",
              isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              isCollapsed ? "justify-center" : "justify-start"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span className="font-bold text-[10px] tracking-widest transition-opacity duration-300">
                  {item.label}
                </span>
                {item.indicator && (
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/50" />
                )}
              </div>
            )}
            {isCollapsed && (
              <>
                {item.indicator && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 animate-pulse border-2 border-background" />
                )}
                <span className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-bold rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="w-full px-3 mt-auto">
        {session ? (
          <Button
            variant="ghost"
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative w-full text-destructive hover:bg-destructive/10 hover:text-destructive",
              isCollapsed ? "justify-center" : "justify-start"
            )}
            onClick={() => {
              handleLogout();
              onItemClick?.();
            }}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isCollapsed && (
              <span className="font-bold text-[10px] tracking-widest transition-opacity duration-300 text-left flex-1">
                LOGOUT
              </span>
            )}
            {isCollapsed && (
              <span className="absolute left-full ml-4 px-2 py-1 bg-popover text-destructive text-[10px] font-bold rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                LOGOUT
              </span>
            )}
          </Button>
        ) : (
          <NavLink
            to="/login"
            onClick={onItemClick}
            className={({ isActive }) => cn(
              "flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative w-full",
              isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              isCollapsed ? "justify-center" : "justify-start"
            )}
          >
            <LogIn className="h-5 w-5 shrink-0" />
            {!isCollapsed && (
              <span className="font-bold text-[10px] tracking-widest transition-opacity duration-300 text-left flex-1">
                LOGIN
              </span>
            )}
            {isCollapsed && (
              <span className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-bold rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                LOGIN
              </span>
            )}
          </NavLink>
        )}
      </div>
    </>
  )
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  className?: string;
  onItemClick?: () => void;
  mobile?: boolean;
}

export function Sidebar({ isCollapsed, setIsCollapsed, className, onItemClick, mobile }: SidebarProps) {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()
  const [hasLiveTournament, setHasLiveTournament] = useState(false)

  useEffect(() => {
    const checkLive = async () => {
      try {
        const ts = await getTournaments()
        setHasLiveTournament(ts.some(t => t.status === 'active'))
      } catch (e) {
        console.error("Failed to fetch tournaments for sidebar", e)
      }
    }
    checkLive()
    const interval = setInterval(checkLive, 10000)
    return () => clearInterval(interval)
  }, [])

  const navItems: NavItem[] = [
    { id: 'arena', icon: LayoutDashboard, label: 'ARENA', path: '/' },
    { id: 'tournaments', icon: Trophy, label: 'TOURNAMENTS', path: '/tournaments', indicator: hasLiveTournament },
    { id: 'history', icon: History, label: 'HISTORY', path: '/history' },
    { id: 'leaderboard', icon: BarChart3, label: 'LEADERBOARD', path: '/leaderboard' },
    { id: 'profiles', icon: UserCircle, label: 'PROFILES', path: '/profiles' },
    ...(session ? [
      { id: 'settings', icon: Settings, label: 'SETTINGS', path: '/admin/settings' },
      { id: 'admin-tournaments', icon: Trophy, label: 'ADMIN TOURNEYS', path: '/admin/tournaments' }
    ] : []),
  ];

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate("/")
        }
      }
    })
  }

  return (
    <nav className={cn(
      "flex flex-col border-r border-border bg-card/50 backdrop-blur-sm items-center py-8 pb-4 gap-8 shrink-0 transition-all duration-300 relative",
      mobile ? "w-full border-none bg-transparent py-4" : (isCollapsed ? "w-16" : "w-64"),
      className
    )}>
      {/* Logo */}
      <div className={cn(
        "bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 transition-all duration-300",
        isCollapsed && !mobile ? "w-10 h-10" : "w-12 h-12"
      )}>
        <span className={cn("text-primary-foreground font-black italic", isCollapsed && !mobile ? "text-lg" : "text-xl")}>C</span>
      </div>

      {/* Toggle Button - Hidden on Mobile */}
      {!mobile && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm z-50 hover:bg-accent"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      )}
      
      <NavContent 
        isCollapsed={isCollapsed && !mobile} 
        navItems={navItems} 
        session={session} 
        handleLogout={handleLogout}
        onItemClick={onItemClick}
      />
    </nav>
  )
}
