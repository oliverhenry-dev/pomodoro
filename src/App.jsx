import { useEffect, useMemo, useState } from 'react'
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

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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

function App() {
  const [timerState, setTimerState] = useState(createInitialState)
  const { phase, secondsLeft, isRunning, completedFocusSessions } = timerState

  useEffect(() => {
    if (!isRunning || phase === 'complete') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
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

    return () => window.clearTimeout(timeoutId)
  }, [isRunning, phase, secondsLeft])

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
          <p className="eyebrow">Pomodoro rhythm</p>
          <h1>20 minutes of focus, 5 minutes of break, repeated for 4 rounds.</h1>
          <p className="lead">{phases[phase].status}</p>
        </div>

        <div className={`timer-face phase-${phase}`}>
          <div
            className="progress-ring"
            style={{ '--progress': `${progressPercent}%` }}
            aria-hidden="true"
          />
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
      </section>

      <section className="stats-grid" aria-label="Pomodoro session overview">
        <article className="stat-card accent">
          <p className="stat-label">Current mode</p>
          <h2>{phases[phase].label}</h2>
          <p>{isRunning ? 'Timer is running' : 'Timer is paused'}</p>
        </article>

        <article className="stat-card">
          <p className="stat-label">Focus sessions done</p>
          <h2>
            {completedFocusSessions} / {MAX_FOCUS_SESSIONS}
          </h2>
          <p>Each finished focus block moves you one step closer to a full cycle.</p>
        </article>

        <article className="stat-card">
          <p className="stat-label">Next up</p>
          <h2>{nextStageLabel}</h2>
          <p>The app automatically alternates focus and break blocks until the fourth focus round ends.</p>
        </article>
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
              <span>Focus {sessionNumber}</span>
              <strong>{isComplete ? 'Done' : isCurrent ? 'Now' : 'Waiting'}</strong>
            </div>
          )
        })}
      </section>
    </main>
  )
}

export default App
