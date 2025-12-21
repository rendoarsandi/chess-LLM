import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { Trophy, Users, Swords, Play, ChevronLeft, Loader2 } from "lucide-react"
import { getTournament, getTournamentParticipants, getTournamentGames, type Tournament, type TournamentParticipant, type Game } from "../api"
import { Button } from "./ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Tabs, TabsContent, TableList, TabsTrigger } from "./ui/tabs"
import { cn } from "@/lib/utils"

export function TournamentDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [tournament, setTournament] = useState<Tournament | null>(null)
    const [participants, setParticipants] = useState<TournamentParticipant[]>([])
    const [games, setGames] = useState<Game[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        const fetchData = async () => {
            try {
                const [t, p, g] = await Promise.all([
                    getTournament(id),
                    getTournamentParticipants(id),
                    getTournamentGames(id)
                ])
                setTournament(t)
                setParticipants(p)
                setGames(g)
            } catch (error) {
                console.error("Failed to fetch tournament detail", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [id])

    if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
    if (!tournament) return <div className="flex-1 flex items-center justify-center font-black uppercase tracking-widest text-destructive">Tournament not found</div>

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button variant="ghost" onClick={() => navigate('/tournaments')} className="font-black tracking-widest gap-2 uppercase italic text-[10px]">
                    <ChevronLeft className="w-4 h-4" /> BACK TO CHAMPIONSHIPS
                </Button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card p-8 rounded-3xl border border-border relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Trophy className="w-48 h-48 text-primary" />
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                        <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            tournament.status === 'active' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                            tournament.status === 'completed' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                            "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                            {tournament.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />}
                            {tournament.status}
                        </div>
                        <h2 className="text-5xl font-black tracking-tighter uppercase italic leading-none">
                            {tournament.name}
                        </h2>
                        <div className="flex flex-wrap gap-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <div className="flex items-center gap-2"><Users className="w-4 h-4" /> {participants.length} Models</div>
                            <div className="flex items-center gap-2"><Swords className="w-4 h-4" /> Round {tournament.currentRound} of {tournament.totalRounds}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-2xl border border-border p-6 shadow-xl min-h-[400px]">
                    <div className="flex gap-8 border-b border-border mb-8 overflow-x-auto no-scrollbar">
                        <h3 className="text-xl font-black uppercase italic tracking-widest text-primary pb-4 border-b-2 border-primary">Tournament Arena</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Swords className="w-4 h-4 text-primary" /> Current Round Pairings
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {games.filter(g => g.roundNumber === tournament.currentRound).map(game => (
                                    <PairingRow key={game.id} game={game} participants={participants} onClick={() => navigate(`/arena/${game.id}`)} />
                                ))}
                                {games.filter(g => g.roundNumber === tournament.currentRound).length === 0 && (
                                    <div className="p-12 text-center bg-muted/20 rounded-xl border border-dashed">
                                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Waiting for round to begin...</p>
                                    </div>
                                )}
                            </div>

                            {tournament.currentRound > 1 && (
                                <div className="pt-8 space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-widest px-2 text-muted-foreground">Previous Rounds</h4>
                                    <div className="grid grid-cols-1 gap-3 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                                        {games.filter(g => g.roundNumber < tournament.currentRound).map(game => (
                                            <PairingRow key={game.id} game={game} participants={participants} onClick={() => navigate(`/arena/${game.id}`)} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-sm font-black uppercase tracking-widest px-2 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-primary" /> Standings
                            </h4>
                            <div className="bg-muted/30 rounded-xl border border-border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-border/50">
                                            <TableHead className="font-black uppercase tracking-widest text-[9px] w-12">Pos</TableHead>
                                            <TableHead className="font-black uppercase tracking-widest text-[9px]">Model</TableHead>
                                            <TableHead className="text-right font-black uppercase tracking-widest text-[9px]">Pts</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {participants.map((p, idx) => (
                                            <TableRow key={p.id} className="hover:bg-primary/5 border-border/20 group">
                                                <TableCell className="font-black italic text-muted-foreground group-hover:text-primary transition-colors">#{idx + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-xs uppercase tracking-tight">{p.name}</span>
                                                        <span className="text-[9px] font-black text-muted-foreground">{p.rating} ELO</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-primary text-lg">{(p.score / 10).toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function PairingRow({ game, participants, onClick }: { game: Game, participants: TournamentParticipant[], onClick: () => void }) {
    const white = participants.find(p => p.id === game.whitePlayerId)
    const black = participants.find(p => p.id === game.blackPlayerId)
    const isLive = game.status === 'ongoing' || game.status === 'paused'

    return (
        <div 
            onClick={onClick}
            className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                isLive ? "border-primary/40 bg-primary/5 shadow-md" : "border-border/50 bg-card hover:bg-muted/30"
            )}
        >
            <div className="grid grid-cols-2 gap-8 flex-1">
                <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-black uppercase tracking-tighter truncate max-w-[120px]">{white?.name || 'Loading...'}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">WHITE</span>
                </div>
                <div className="flex flex-col items-start gap-1">
                    <span className="text-xs font-black uppercase tracking-tighter truncate max-w-[120px]">{black?.name || 'Loading...'}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">BLACK</span>
                </div>
            </div>

            <div className="flex items-center gap-4 min-w-[100px] justify-end relative z-10">
                {!isLive ? (
                    <div className="font-black italic text-lg text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                        {game.status === 'draw' ? '½ - ½' : game.winnerId === game.whitePlayerId ? '1 - 0' : '0 - 1'}
                    </div>
                ) : (
                    <Button size="sm" className="h-8 font-black tracking-widest text-[9px] gap-2 animate-pulse">
                        <Play className="w-3 h-3 fill-current" /> WATCH
                    </Button>
                )}
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 font-black text-4xl italic">VS</div>
        </div>
    )
}
