interface ProtectedRouteProps {
    children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    // Development Bypass: Always render children
    return <>{children}</>;
}