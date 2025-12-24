import { useState, useEffect } from "react"
import { Trophy, Plus, Loader2, Calendar, Clock, Users } from "lucide-react"
import { getTournaments, createTournament, getPlayers, type Tournament, type Player } from "../api"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "./ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function TournamentManagement() {
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [players, setPlayers] = useState<Player[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    
    const [newTournament, setNewTournament] = useState({
        name: "",
        startTime: "",
        totalRounds: 5,
        timeControlSettings: "No Time Control",
        participantIds: [] as string[]
    })

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [tData, pData] = await Promise.all([
                getTournaments(),
                getPlayers()
            ])
            setTournaments(tData)
            setPlayers(pData.filter(p => p.type === 'llm'))
        } catch (error) {
            console.error("Failed to fetch tournament data", error)
            toast.error("Failed to load tournaments")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleToggleParticipant = (playerId: string) => {
        setNewTournament(prev => ({
            ...prev,
            participantIds: prev.participantIds.includes(playerId)
                ? prev.participantIds.filter(id => id !== playerId)
                : [...prev.participantIds, playerId]
        }))
    }

    const handleSave = async () => {
        if (!newTournament.name || !newTournament.startTime || newTournament.participantIds.length < 2) {
            toast.error("Please fill all required fields and select at least 2 participants")
            return
        }

        setIsSaving(true)
        try {
            await createTournament(newTournament)
            toast.success("Tournament created successfully")
            setIsDialogOpen(false)
            setNewTournament({
                name: "",
                startTime: "",
                totalRounds: 5,
                timeControlSettings: "No Time Control",
                participantIds: []
            })
            fetchData()
        } catch {
            toast.error("Failed to create tournament")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-4">
                            <Trophy className="w-10 h-10 text-primary" />
                            Tournament Management
                        </h2>
                        <p className="text-muted-foreground font-medium">Schedule and manage Swiss System tournaments.</p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black tracking-widest gap-2">
                                <Plus className="w-4 h-4" />
                                NEW TOURNAMENT
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Create Swiss Tournament</DialogTitle>
                                <DialogDescription>Setup a new tournament by selecting models and defining the number of rounds.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Tournament Name</Label>
                                    <Input 
                                        id="name" 
                                        placeholder="e.g. Winter LLM Championship" 
                                        value={newTournament.name}
                                        onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="startTime">Start Time</Label>
                                        <Input 
                                            id="startTime" 
                                            type="datetime-local" 
                                            value={newTournament.startTime}
                                            onChange={(e) => setNewTournament(prev => ({ ...prev, startTime: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="rounds">Rounds</Label>
                                        <Input 
                                            id="rounds" 
                                            type="number" 
                                            min={1}
                                            value={newTournament.totalRounds}
                                            onChange={(e) => setNewTournament(prev => ({ ...prev, totalRounds: parseInt(e.target.value) }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="timeControl">Time Control</Label>
                                    <Input 
                                        id="timeControl" 
                                        placeholder="e.g. No Time Control or 3+2" 
                                        value={newTournament.timeControlSettings}
                                        onChange={(e) => setNewTournament(prev => ({ ...prev, timeControlSettings: e.target.value }))}
                                    />
                                </div>
                                
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Select Participants ({newTournament.participantIds.length} selected)
                                    </Label>
                                    <div className="border rounded-lg p-4 bg-muted/30 max-h-72 overflow-y-auto custom-scrollbar space-y-4">
                                        {[
                                            { label: "Google Gemini", color: "text-primary", provider: "gemini" },
                                            { label: "Groq Arena", color: "text-orange-500", provider: "groq" },
                                            { label: "System Engines", color: "text-blue-500", provider: "system" },
                                            { label: "Other", color: "text-muted-foreground", provider: "other" }
                                        ].map(group => {
                                            const groupPlayers = players.filter(p => 
                                                group.provider === "other" 
                                                ? !["gemini", "groq", "system"].includes(p.provider || "")
                                                : p.provider === group.provider
                                            );
                                            
                                            if (groupPlayers.length === 0) return null;

                                            return (
                                                <div key={group.label} className="space-y-2">
                                                    <h3 className={cn("text-[10px] font-black uppercase tracking-widest px-2 border-l-2 border-current", group.color)}>
                                                        {group.label}
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {groupPlayers.map(player => (
                                                            <label key={player.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer transition-colors border border-transparent hover:border-border bg-background/50">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                                                                    checked={newTournament.participantIds.includes(player.id)}
                                                                    onChange={() => handleToggleParticipant(player.id)}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold uppercase tracking-tight leading-tight">{player.name}</span>
                                                                    <span className="text-[9px] text-muted-foreground font-black tracking-widest">{player.rating} ELO</span>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                                <Button onClick={handleSave} disabled={isSaving} className="font-bold uppercase tracking-widest">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    CREATE TOURNAMENT
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xl">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-black uppercase tracking-widest text-[10px]">Name</TableHead>
                                <TableHead className="font-black uppercase tracking-widest text-[10px]">Status</TableHead>
                                <TableHead className="font-black uppercase tracking-widest text-[10px]">Start Time</TableHead>
                                <TableHead className="font-black uppercase tracking-widest text-[10px]">Rounds</TableHead>
                                <TableHead className="text-right font-black uppercase tracking-widest text-[10px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : tournaments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-bold uppercase tracking-widest">
                                        No tournaments found.
                                    </TableCell>
                                </TableRow>
                            ) : tournaments.map((t) => (
                                <TableRow key={t.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-black uppercase italic tracking-tight text-primary text-lg">{t.name}</TableCell>
                                    <TableCell>
                                        <div className={cn(
                                            "flex items-center gap-1.5 text-[10px] font-black uppercase w-fit px-2 py-0.5 rounded border",
                                            t.status === 'active' 
                                                ? "text-green-500 bg-green-500/10 border-green-500/20 animate-pulse" 
                                                : t.status === 'completed'
                                                ? "text-blue-500 bg-blue-500/10 border-blue-500/20"
                                                : "text-amber-500 bg-amber-500/10 border-amber-500/20"
                                        )}>
                                            {t.status}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        <div className="flex flex-col">
                                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(t.startTime).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="w-3 h-3" /> {new Date(t.startTime).toLocaleTimeString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-bold">
                                        {t.currentRound} / {t.totalRounds}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" className="font-black text-[10px] uppercase tracking-widest">
                                            VIEW DETAILS
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
