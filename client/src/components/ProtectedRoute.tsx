import { authClient } from "@/lib/auth-client"
import { Navigate, useLocation } from "react-router"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
    children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { data: session, isPending } = authClient.useSession()
    const location = useLocation()

    if (isPending) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verifying Session...</p>
                </div>
            </div>
        )
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // BetterAuth admin plugin adds role to user, but for now we trust session presence
    // as only admin email is allowed to sign in on server (middleware check)
    return <>{children}</>
}
