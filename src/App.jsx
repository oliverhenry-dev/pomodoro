import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const FOCUS_MINUTES = 20
const BREAK_MINUTES = 5
const MAX_FOCUS_SESSIONS = 4

const phases = {
  focus: {
    label: 'Focus time',
    minutes: FOCUS_MINUTES,
    cue: 'Deep work block',
    status: 'Keep one clear task in front of you and let the clock hold the boundary.',
  },
  break: {
    label: 'Break time',
    minutes: BREAK_MINUTES,
    cue: 'Reset and breathe',
    status: 'Step away for five minutes, loosen your shoulders, and come back with fresh energy.',
  },
  complete: {
    label: 'Cycle complete',
    minutes: 0,
    cue: 'Four focus sessions finished',
    status: 'You finished four focus rounds. Take a longer rest before starting another cycle.',
  },
}

function getPhaseDuration(phase) {
  return phases[phase].minutes * 60
}

function createInitialState() {
  return {
    phase: 'focus',
    secondsLeft: getPhaseDuration('focus'),
    isRunning: false,
    completedFocusSessions: 0,
  }
}

function getNextState(currentState) {
  if (currentState.phase === 'focus') {
    const nextCompletedFocusSessions = currentState.completedFocusSessions + 1

    if (nextCompletedFocusSessions >= MAX_FOCUS_SESSIONS) {
      return {
        phase: 'complete',
        secondsLeft: 0,
        isRunning: false,
        completedFocusSessions: nextCompletedFocusSessions,
      }
    }

    return {
      phase: 'break',
      secondsLeft: getPhaseDuration('break'),
      isRunning: currentState.isRunning,
      completedFocusSessions: nextCompletedFocusSessions,
    }
  }

  if (currentState.phase === 'break') {
    return {
      phase: 'focus',
      secondsLeft: getPhaseDuration('focus'),
      isRunning: currentState.isRunning,
      completedFocusSessions: currentState.completedFocusSessions,
    }
  }

  return {
    ...createInitialState(),
    isRunning: true,
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function createAudioContext() {
  if (typeof window === 'undefined' || !window.AudioContext) {
    return null
  }

  try {
    return new window.AudioContext()
  } catch {
    return null
  }
}

function playNotificationSound(audioCtx) {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }

  if (audioCtx) {
    try {
      const oscillator = audioCtx.createOscillator()
      const gain = audioCtx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.value = 0.2

      oscillator.connect(gain)
      gain.connect(audioCtx.destination)

      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
      }, 5000) // play 5-second notification tone
      return
    } catch {
      // continue to fallback option
    }
  }

  // fallback to HTMLAudioElement (works on most browsers)
  const fallbackAudio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg')
  fallbackAudio.volume = 0.2
  fallbackAudio.play().catch(() => {})
}

function App() {
  const [timerState, setTimerState] = useState(createInitialState)
  const { phase, secondsLeft, isRunning, completedFocusSessions } = timerState
  const isInitialPhase = useRef(true)
  const audioContextRef = useRef(null)

  useEffect(() => {
    if (isInitialPhase.current) {
      isInitialPhase.current = false
      return
    }

    playNotificationSound(audioContextRef.current)
  }, [phase])

  useEffect(() => {
    if (!isRunning || phase === 'complete') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setTimerState((currentState) => {
        if (currentState.secondsLeft > 1) {
          return {
            ...currentState,
            secondsLeft: currentState.secondsLeft - 1,
          }
        }

        return getNextState(currentState)
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isRunning, phase])

  const progressPercent = useMemo(() => {
    if (phase === 'complete') {
      return 100
    }

    const totalSeconds = getPhaseDuration(phase)
    return ((totalSeconds - secondsLeft) / totalSeconds) * 100
  }, [phase, secondsLeft])

  const nextStageLabel = useMemo(() => {
    if (phase === 'focus') {
      return completedFocusSessions + 1 >= MAX_FOCUS_SESSIONS ? 'Long rest' : '5-minute break'
    }
    if (phase === 'break') {
      return `Focus ${completedFocusSessions + 1}`
    }

    return 'New cycle'
  }, [completedFocusSessions, phase])

  const toggleTimer = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext()
      playNotificationSound(audioContextRef.current)
    }

    if (phase === 'complete') {
      setTimerState({
        ...createInitialState(),
        isRunning: true,
      })
      return
    }

    setTimerState((currentState) => ({
      ...currentState,
      isRunning: !currentState.isRunning,
    }))
  }

  const resetTimer = () => {
    setTimerState(createInitialState())
  }

  const skipPhase = () => {
    setTimerState((currentState) => getNextState({ ...currentState, isRunning: false }))
  }

  return (
    <main className="app-shell">
      <section className="timer-card">
        <div className="hero-copy">
          <p className="eyebrow">Minimal Pomodoro</p>
          <h1>Calm focus, short breaks, four steady rounds.</h1>
          <p className="lead">{phases[phase].status}</p>
        </div>

        <div className={`timer-face phase-${phase}`}>
          <div className="progress-ring" style={{ '--progress': `${progressPercent}%` }} aria-hidden="true" />
          <p className="phase-label">{phases[phase].label}</p>
          <p className="time-left" aria-live="polite">
            {formatTime(secondsLeft)}
          </p>
          <p className="phase-cue">{phases[phase].cue}</p>
        </div>

        <div className="controls">
          <button className="primary-button" onClick={toggleTimer}>
            {phase === 'complete' ? 'Start again' : isRunning ? 'Pause' : 'Start'}
          </button>
          <button className="secondary-button" onClick={resetTimer}>
            Reset
          </button>
          <button className="ghost-button" onClick={skipPhase}>
            {phase === 'complete' ? 'Restart cycle' : 'Skip'}
          </button>
        </div>

        <section className="summary-strip" aria-label="Pomodoro session overview">
          <div className="summary-item">
            <span className="stat-label">Mode</span>
            <strong>{phases[phase].label}</strong>
          </div>
          <div className="summary-item">
            <span className="stat-label">Progress</span>
            <strong>
              {completedFocusSessions} / {MAX_FOCUS_SESSIONS}
            </strong>
          </div>
          <div className="summary-item">
            <span className="stat-label">Next</span>
            <strong>{nextStageLabel}</strong>
          </div>
        </section>

        <section className="session-track" aria-label="Focus session progress">
          {Array.from({ length: MAX_FOCUS_SESSIONS }, (_, index) => {
            const sessionNumber = index + 1
            const isComplete = sessionNumber <= completedFocusSessions
            const isCurrent =
              !isComplete && phase !== 'complete' && sessionNumber === completedFocusSessions + 1

            return (
              <div
                key={sessionNumber}
                className={`session-pill ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <span>{sessionNumber}</span>
              </div>
            )
          })}
        </section>
      </section>
    </main>
  )
}

export default App
