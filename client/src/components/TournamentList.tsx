import { useState, useEffect } from "react"
import { Trophy, Calendar, Clock, ChevronRight, Play } from "lucide-react"
import { getTournaments, type Tournament } from "../api"
import { Button } from "./ui/button"
import { useNavigate } from "react-router"
import { cn } from "@/lib/utils"

export function TournamentList() {
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchTournaments = async () => {
            try {
                const data = await getTournaments()
                setTournaments(data)
            } catch (error) {
                console.error("Failed to fetch tournaments", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchTournaments()
        const interval = setInterval(fetchTournaments, 5000)
        return () => clearInterval(interval)
    }, [])

    const live = tournaments.filter(t => t.status === 'active')
    const scheduled = tournaments.filter(t => t.status === 'scheduled')
    const past = tournaments.filter(t => t.status === 'completed')

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                    <h2 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-4">
                        <Trophy className="w-10 h-10 text-primary" />
                        Championships
                    </h2>
                    <p className="text-muted-foreground font-medium">Live and historical Swiss system tournaments.</p>
                </div>

                {live.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                            <h3 className="text-xl font-black uppercase tracking-widest italic">Live Now</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {live.map(t => (
                                <TournamentCard key={t.id} tournament={t} onClick={() => navigate(`/tournaments/${t.id}`)} isLive />
                            ))}
                        </div>
                    </section>
                )}

                {scheduled.length > 0 && (
                    <section className="space-y-6">
                        <h3 className="text-xl font-black uppercase tracking-widest italic text-muted-foreground">Upcoming</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {scheduled.map(t => (
                                <TournamentCard key={t.id} tournament={t} onClick={() => navigate(`/tournaments/${t.id}`)} />
                            ))}
                        </div>
                    </section>
                )}

                {past.length > 0 && (
                    <section className="space-y-6">
                        <h3 className="text-xl font-black uppercase tracking-widest italic text-muted-foreground">Hall of Fame</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {past.map(t => (
                                <TournamentCard key={t.id} tournament={t} onClick={() => navigate(`/tournaments/${t.id}`)} />
                            ))}
                        </div>
                    </section>
                )}

                {!isLoading && tournaments.length === 0 && (
                    <div className="bg-card rounded-xl border border-border p-12 text-center space-y-4">
                        <Trophy className="w-16 h-16 text-muted-foreground/20 mx-auto" />
                        <p className="text-muted-foreground font-bold uppercase tracking-widest">No tournaments scheduled at this time.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function TournamentCard({ tournament, onClick, isLive }: { tournament: Tournament, onClick: () => void, isLive?: boolean }) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "group bg-card p-6 rounded-2xl border transition-all cursor-pointer hover:shadow-2xl relative overflow-hidden",
                isLive ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
            )}
        >
            {isLive && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg">
                    ACTIVE
                </div>
            )}
            
            <div className="space-y-4">
                <div className="space-y-1">
                    <h4 className="text-2xl font-black uppercase italic tracking-tighter leading-none group-hover:text-primary transition-colors">
                        {tournament.name}
                    </h4>
                    <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(tournament.startTime).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(tournament.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Progress</span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-black italic">{tournament.currentRound} / {tournament.totalRounds}</span>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Rounds</span>
                        </div>
                    </div>
                    <Button variant={isLive ? "default" : "outline"} size="sm" className="font-black tracking-widest gap-2 uppercase italic text-[10px]">
                        {isLive ? <><Play className="w-3 h-3 fill-current" /> WATCH LIVE</> : <>VIEW DETAILS <ChevronRight className="w-3 h-3" /></>}
                    </Button>
                </div>
            </div>
        </div>
    )
}
