import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Lock } from "lucide-react"

export function AdminLogin() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()
    const { data: session } = authClient.useSession()

    useEffect(() => {
        if (session) {
            navigate("/admin/settings", { replace: true })
        }
    }, [session, navigate])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { data, error } = await authClient.signIn.email({
                email,
                password,
            })

            if (error) {
                toast.error(error.message || "Failed to login")
            } else if (data) {
                toast.success("Welcome, Admin")
                navigate("/admin/settings")
            }
        } catch (err) {
            toast.error("An unexpected error occurred")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    if (session) return null;

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter uppercase italic">Admin Access</h2>
                    <p className="text-muted-foreground font-medium">Please authenticate to manage arena configurations.</p>
                </div>

                <div className="bg-card p-8 rounded-xl border border-border shadow-xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest">Email Address</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="admin@chessllm.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-muted/50 border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest">Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-muted/50 border-border"
                            />
                        </div>
                        <Button 
                            type="submit" 
                            className="w-full font-black tracking-widest h-12" 
                            disabled={isLoading}
                        >
                            {isLoading ? "AUTHENTICATING..." : "LOGIN TO DASHBOARD"}
                        </Button>
                    </form>
                </div>

                <Button 
                    variant="link" 
                    className="w-full text-muted-foreground font-bold uppercase text-[10px] tracking-widest"
                    onClick={() => navigate("/arena")}
                >
                    Return to Arena
                </Button>
            </div>
        </div>
    )
}
