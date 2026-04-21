import { Button } from '@/components/ui/button'
import { Play, Loader2 } from 'lucide-react'
import type { Player } from '@/types'

interface ArenaControlsProps {
  whitePlayerId: string
  setWhitePlayerId: (id: string) => void
  blackPlayerId: string
  setBlackPlayerId: (id: string) => void
  players: Player[]
  handleCreateGame: (whiteId: string, blackId: string, variant?: string) => Promise<void>
  isCreatingGame: boolean
  className?: string
  title?: string
}

export function ArenaControls({
  whitePlayerId,
  setWhitePlayerId,
  blackPlayerId,
  setBlackPlayerId,
  players,
  handleCreateGame,
  isCreatingGame,
  className,
  title = 'Arena Controls',
}: ArenaControlsProps) {
  const renderOptions = () => (
    <>
      <optgroup
        label="Google Gemini"
        className="text-primary font-bold uppercase text-[10px] tracking-widest bg-background"
      >
        {players
          .filter((p) => p.provider === 'gemini')
          .map((p) => (
            <option
              key={p.id}
              value={p.id}
              className="text-sm font-medium normal-case bg-background"
            >
              {p.name}
            </option>
          ))}
      </optgroup>
      <optgroup
        label="Groq Arena"
        className="text-orange-500 font-bold uppercase text-[10px] tracking-widest bg-background"
      >
        {players
          .filter((p) => p.provider === 'groq')
          .map((p) => (
            <option
              key={p.id}
              value={p.id}
              className="text-sm font-medium normal-case bg-background"
            >
              {p.name}
            </option>
          ))}
      </optgroup>
      <optgroup
        label="OpenRouter"
        className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest bg-background"
      >
        {players
          .filter((p) => p.provider === 'openrouter')
          .map((p) => (
            <option
              key={p.id}
              value={p.id}
              className="text-sm font-medium normal-case bg-background"
            >
              {p.name}
            </option>
          ))}
      </optgroup>
      <optgroup
        label="System Engines"
        className="text-blue-500 font-bold uppercase text-[10px] tracking-widest bg-background"
      >
        {players
          .filter((p) => p.provider === 'system')
          .map((p) => (
            <option
              key={p.id}
              value={p.id}
              className="text-sm font-medium normal-case bg-background"
            >
              {p.name}
            </option>
          ))}
      </optgroup>
      {players.filter((p) => !['gemini', 'groq', 'openrouter', 'system'].includes(p.provider || ''))
        .length > 0 && (
        <optgroup
          label="Other"
          className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest bg-background"
        >
          {players
            .filter((p) => !['gemini', 'groq', 'openrouter', 'system'].includes(p.provider || ''))
            .map((p) => (
              <option
                key={p.id}
                value={p.id}
                className="text-sm font-medium normal-case bg-background"
              >
                {p.name}
              </option>
            ))}
        </optgroup>
      )}
    </>
  )

  return (
    <div className={className}>
      <h2 className="text-xl font-bold uppercase tracking-tighter mb-4">{title}</h2>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
            White Engine
          </label>
          <select
            value={whitePlayerId}
            onChange={(e) => setWhitePlayerId(e.target.value)}
            className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
          >
            {renderOptions()}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
            Black Engine
          </label>
          <select
            value={blackPlayerId}
            onChange={(e) => setBlackPlayerId(e.target.value)}
            className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
          >
            {renderOptions()}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            className="font-black tracking-widest h-10"
            onClick={() => handleCreateGame(whitePlayerId, blackPlayerId, 'standard')}
            disabled={isCreatingGame}
          >
            {isCreatingGame ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4 fill-current" />
            )}
            PLAY STANDARD
          </Button>
          <Button
            variant="outline"
            className="font-black tracking-widest h-10 border-2"
            onClick={() => handleCreateGame(whitePlayerId, blackPlayerId, 'chess960')}
            disabled={isCreatingGame}
          >
            {isCreatingGame ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <div className="relative mr-2">
                <Play className="h-4 w-4 fill-current" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-primary text-[4px] font-black text-white">
                  960
                </span>
              </div>
            )}
            PLAY CHESS 960
          </Button>
        </div>
      </div>
    </div>
  )
}
