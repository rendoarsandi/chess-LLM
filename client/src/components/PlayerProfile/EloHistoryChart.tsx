import { useState, useEffect, useCallback } from "react"
import { getEloHistory, type EloSnapshot } from "@/api"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface EloHistoryChartProps {
  playerId: string
}

type Period = '7' | '30' | '90' | 'all'

export function EloHistoryChart({ playerId }: EloHistoryChartProps) {
  const [data, setData] = useState<EloSnapshot[]>([])
  const [period, setPeriod] = useState<Period>('all')
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const history = await getEloHistory(playerId, period)
      setData(history)
    } catch (err) {
      console.error("Failed to fetch ELO history", err)
    } finally {
      setLoading(false)
    }
  }, [playerId, period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const chartData = data.map(snapshot => ({
    rating: snapshot.rating,
    date: new Date(snapshot.createdAt).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    rawDate: snapshot.createdAt
  }))

  return (
    <div className="bg-card border border-border p-4 md:p-6 rounded-xl shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic">Rating Progression</h3>
        <div className="flex gap-1 bg-muted p-1 rounded-lg self-end sm:self-auto">
          {[
            { label: '7D', value: '7' },
            { label: '30D', value: '30' },
            { label: '90D', value: '90' },
            { label: 'ALL', value: 'all' },
          ].map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p.value as Period)}
              className="h-7 text-[9px] md:text-[10px] font-black px-2 md:px-3"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-[300px] w-full relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/50 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                hide 
              />
              <YAxis 
                domain={['dataMin - 50', 'dataMax + 50']}
                fontSize={10}
                fontWeight="black"
                tickFormatter={(val) => `${val}`}
                stroke="var(--muted-foreground)"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  borderColor: 'var(--border)',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: 'var(--primary)' }}
              />
              <Line 
                type="monotone" 
                dataKey="rating" 
                stroke="var(--primary)" 
                strokeWidth={4}
                dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: 'var(--primary)', strokeWidth: 2, stroke: 'var(--background)' }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : !loading && (
          <div className="h-full flex items-center justify-center border border-dashed border-border rounded-lg italic text-muted-foreground text-sm">
            Insufficient data for this period.
          </div>
        )}
      </div>
    </div>
  )
}
