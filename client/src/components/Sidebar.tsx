import {
  LayoutDashboard,
  Trophy,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
  BarChart3,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { NavLink, useLocation } from 'react-router'
import { useEffect, useState } from 'react'
import { getTournaments } from '@/api'

export type View = 'arena' | 'leaderboard' | 'profiles' | 'history' | 'settings'

interface NavItem {
  id: string
  icon: React.ElementType
  label: string
  path: string
  indicator?: boolean
}

interface NavContentProps {
  isCollapsed: boolean
  navItems: NavItem[]
  onItemClick?: () => void
}

function NavContent({ isCollapsed, navItems, onItemClick }: NavContentProps) {
  const location = useLocation()

  return (
    <>
      <div className="flex flex-col w-full gap-2 px-3 flex-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname + location.search === item.path ||
            (item.path === '/arena' && location.pathname === '/arena' && !location.search)

          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onItemClick}
              className={cn(
                'flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative w-full',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                isCollapsed ? 'justify-center' : 'justify-start',
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
          )
        })}
      </div>

      <div className="w-full px-3 mt-auto mb-2">
        <div
          className={cn(
            'flex items-center gap-4 p-3 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20',
            isCollapsed ? 'justify-center' : 'justify-start',
          )}
        >
          <Settings className="h-5 w-5 shrink-0 animate-spin-slow" />
          {!isCollapsed && (
            <span className="font-bold text-[10px] tracking-widest uppercase">DEV MODE</span>
          )}
        </div>
      </div>
    </>
  )
}

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  className?: string
  onItemClick?: () => void
  mobile?: boolean
}

export function Sidebar({
  isCollapsed,
  setIsCollapsed,
  className,
  onItemClick,
  mobile,
}: SidebarProps) {
  const [hasLiveTournament, setHasLiveTournament] = useState(false)

  useEffect(() => {
    const checkLive = async () => {
      try {
        const ts = await getTournaments()
        setHasLiveTournament(ts.some((t) => t.status === 'active'))
      } catch (e) {
        console.error('Failed to fetch tournaments for sidebar', e)
      }
    }
    checkLive()
    const interval = setInterval(checkLive, 10000)
    return () => clearInterval(interval)
  }, [])

  const navItems: NavItem[] = [
    { id: 'arena', icon: LayoutDashboard, label: 'ARENA', path: '/arena' },
    {
      id: 'tournaments',
      icon: Trophy,
      label: 'TOURNAMENTS',
      path: '/tournaments',
      indicator: hasLiveTournament,
    },
    { id: 'history', icon: History, label: 'HISTORY', path: '/history' },
    { id: 'leaderboard', icon: BarChart3, label: 'LEADERBOARD', path: '/leaderboard' },
    { id: 'profiles', icon: UserCircle, label: 'PROFILES', path: '/profiles' },
    { id: 'settings', icon: Settings, label: 'SETTINGS', path: '/admin/settings' },
    { id: 'admin-tournaments', icon: Trophy, label: 'ADMIN TOURNEYS', path: '/admin/tournaments' },
  ]

  return (
    <nav
      className={cn(
        'flex flex-col border-r border-border bg-card/50 backdrop-blur-sm items-center py-8 pb-4 gap-8 shrink-0 transition-all duration-300 relative',
        mobile ? 'w-full border-none bg-transparent py-4' : isCollapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 transition-all duration-300',
          isCollapsed && !mobile ? 'w-10 h-10' : 'w-12 h-12',
        )}
      >
        <span
          className={cn(
            'text-primary-foreground font-black italic',
            isCollapsed && !mobile ? 'text-lg' : 'text-xl',
          )}
        >
          C
        </span>
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
        onItemClick={onItemClick}
      />
    </nav>
  )
}
