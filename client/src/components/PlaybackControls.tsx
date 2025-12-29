import { Button } from '@/components/ui/button'
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'

interface PlaybackControlsProps {
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
  onLast: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
}

export function PlaybackControls({
  onFirst,
  onPrev,
  onNext,
  onLast,
  prevDisabled,
  nextDisabled,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-2 bg-muted/30 rounded-lg border border-border">
      <Button
        variant="ghost"
        size="icon"
        onClick={onFirst}
        disabled={prevDisabled}
        aria-label="First"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        disabled={prevDisabled}
        aria-label="Previous"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={nextDisabled}
        aria-label="Next"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onLast}
        disabled={nextDisabled}
        aria-label="Last"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
