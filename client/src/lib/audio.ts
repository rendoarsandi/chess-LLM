class SoundManager {
  private mute: boolean = false
  private sounds: Record<string, HTMLAudioElement> = {}

  constructor() {
    if (typeof window !== 'undefined') {
      this.mute = localStorage.getItem('chess_llm_mute') === 'true'
    }
  }

  setMute(mute: boolean) {
    this.mute = mute
    if (typeof window !== 'undefined') {
      localStorage.setItem('chess_llm_mute', String(mute))
    }
  }

  isMuted() {
    return this.mute
  }

  play(soundName: 'move' | 'capture' | 'check' | 'castle' | 'notify') {
    if (this.mute) return

    const urls = {
      move: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Move.mp3',
      capture: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Capture.mp3',
      check: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Check.mp3',
      castle: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Castle.mp3',
      notify: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/GenericNotify.mp3',
    }

    try {
      if (!this.sounds[soundName]) {
        this.sounds[soundName] = new Audio(urls[soundName])
      }
      const audio = this.sounds[soundName]
      audio.currentTime = 0
      audio.play().catch((err) => console.debug('Audio play failed:', err))
    } catch (err) {
      console.warn('Audio initialization failed:', err)
    }
  }
}

export const soundManager = new SoundManager()

export function playMoveSound(san: string) {
  if (!san) return
  if (san.includes('+') || san.includes('#')) {
    soundManager.play('check')
  } else if (san.includes('O-O')) {
    soundManager.play('castle')
  } else if (san.includes('x')) {
    soundManager.play('capture')
  } else {
    soundManager.play('move')
  }
}
