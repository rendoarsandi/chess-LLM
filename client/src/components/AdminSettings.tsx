import { useState, useEffect } from 'react'
import {
  Settings,
  Plus,
  Trash2,
  Power,
  PowerOff,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import {
  getAdminModels,
  createAdminModel,
  updateAdminModel,
  deleteAdminModel,
  type LLMConfig,
} from '../api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from './ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function AdminSettings() {
  const [configs, setConfigs] = useState<LLMConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [newModel, setNewModel] = useState<Partial<LLMConfig>>({
    provider: 'gemini',
    modelId: '',
    apiKey: '',
    isActive: true,
  })

  const fetchConfigs = async () => {
    setIsLoading(true)
    try {
      const data = await getAdminModels()
      setConfigs(data)
    } catch (error) {
      console.error('Failed to fetch configs', error)
      toast.error('Failed to load configurations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const handleToggleActive = async (config: LLMConfig) => {
    try {
      await updateAdminModel(config.id, { isActive: !config.isActive })
      toast.success(`${config.modelId} ${!config.isActive ? 'activated' : 'deactivated'}`)
      fetchConfigs()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async (config: LLMConfig) => {
    if (config.isHardcoded) {
      toast.error('Cannot delete hardcoded configurations')
      return
    }

    if (!confirm(`Are you sure you want to delete ${config.modelId}?`)) return

    try {
      await deleteAdminModel(config.id)
      toast.success('Model deleted successfully')
      fetchConfigs()
    } catch {
      toast.error('Failed to delete model')
    }
  }

  const handleSave = async () => {
    if (!newModel.modelId) {
      toast.error('Model ID is required')
      return
    }

    setIsSaving(true)
    try {
      await createAdminModel(newModel)
      toast.success('New model added successfully')
      setIsDialogOpen(false)
      setNewModel({ provider: 'gemini', modelId: '', apiKey: '', isActive: true })
      fetchConfigs()
    } catch {
      toast.error('Failed to save model')
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
              <Settings className="w-10 h-10" />
              Admin Settings
            </h2>
            <p className="text-muted-foreground font-medium">
              Dynamic LLM Model Configuration and Arena Management.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-black tracking-widest gap-2">
                <Plus className="w-4 h-4" />
                ADD NEW MODEL
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">
                  Add New LLM Model
                </DialogTitle>
                <DialogDescription>
                  Configure a new LLM provider and model ID to add it to the arena.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={newModel.provider}
                    onValueChange={(v) => setNewModel((prev) => ({ ...prev, provider: v }))}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Gemini (Google)</SelectItem>
                      <SelectItem value="groq">Groq</SelectItem>
                      <SelectItem value="openai">OpenAI (Future)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="modelId">Model ID</Label>
                  <Input
                    id="modelId"
                    placeholder="e.g. gemini-1.5-pro"
                    value={newModel.modelId}
                    onChange={(e) => setNewModel((prev) => ({ ...prev, modelId: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apiKey">API Key (Optional if in .env)</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter API key"
                    value={newModel.apiKey || ''}
                    onChange={(e) => setNewModel((prev) => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="font-bold uppercase tracking-widest"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Model
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xl">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-black uppercase tracking-widest text-[10px]">
                  Provider
                </TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px]">
                  Model ID
                </TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px]">
                  Type
                </TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px]">
                  Status
                </TableHead>
                <TableHead className="text-right font-black uppercase tracking-widest text-[10px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : configs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground font-bold uppercase tracking-widest"
                  >
                    No models configured.
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config) => (
                  <TableRow key={config.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold uppercase tracking-tighter text-primary">
                      {config.provider}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{config.modelId}</TableCell>
                    <TableCell>
                      {config.isHardcoded ? (
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-500 bg-amber-500/10 w-fit px-2 py-0.5 rounded border border-amber-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Hardcoded
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-blue-500 bg-blue-500/10 w-fit px-2 py-0.5 rounded border border-blue-500/20">
                          <ShieldAlert className="w-3 h-3" />
                          Dynamic
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          'flex items-center gap-1.5 text-[10px] font-black uppercase w-fit px-2 py-0.5 rounded border',
                          config.isActive
                            ? 'text-green-500 bg-green-500/10 border-green-500/20'
                            : 'text-muted-foreground bg-muted border-border',
                        )}
                      >
                        {config.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'h-8 px-2 font-black text-[10px] uppercase gap-1.5',
                            config.isActive
                              ? 'text-muted-foreground'
                              : 'text-green-500 border-green-500/20 hover:bg-green-500/10',
                          )}
                          onClick={() => handleToggleActive(config)}
                        >
                          {config.isActive ? (
                            <>
                              <PowerOff className="w-3.5 h-3.5" /> Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="w-3.5 h-3.5" /> Activate
                            </>
                          )}
                        </Button>
                        {!config.isHardcoded && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(config)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
