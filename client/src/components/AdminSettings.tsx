import { Settings } from "lucide-react"

export function AdminSettings() {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                    <h2 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-4">
                        <Settings className="w-10 h-10" />
                        Admin Settings
                    </h2>
                    <p className="text-muted-foreground font-medium">Dynamic LLM Model Configuration and Arena Management.</p>
                </div>
                
                <div className="bg-card rounded-xl border border-border p-8 shadow-xl">
                    <p className="text-center text-muted-foreground font-bold uppercase tracking-widest py-12">
                        Configuration interface coming in Phase 3.
                    </p>
                </div>
            </div>
        </div>
    )
}
