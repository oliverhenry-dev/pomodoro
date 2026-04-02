import { useEffect, useRef, useState } from 'react'
import { Coffee, Pause, Play, RotateCcw, SkipForward, Sparkles, Target } from 'lucide-react'
import './App.css'

const SESSION_BLUEPRINT = [
  { type: 'Focus', label: 'Focus 1', minutes: 20 },
  { type: 'Break', label: 'Break 1', minutes: 5 },
  { type: 'Focus', label: 'Focus 2', minutes: 20 },
  { type: 'Break', label: 'Break 2', minutes: 5 },
  { type: 'Focus', label: 'Focus 3', minutes: 20 },
  { type: 'Break', label: 'Break 3', minutes: 5 },
  { type: 'Focus', label: 'Focus 4', minutes: 20 },
]

const totalSessions = SESSION_BLUEPRINT.length

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function getSessionSeconds(index) {
  return SESSION_BLUEPRINT[index].minutes * 60
}

function advanceSession(currentIndex, overtimeMs) {
  const nextIndex = currentIndex + 1

  if (nextIndex >= totalSessions) {
    return {
      sessionIndex: totalSessions - 1,
      secondsLeft: 0,
      cycleComplete: true,
      remainingMs: 0,
    }
  }

  let targetIndex = nextIndex
  let extraMs = overtimeMs

  while (targetIndex < totalSessions) {
    const targetDurationMs = getSessionSeconds(targetIndex) * 1000

    if (extraMs < targetDurationMs) {
      const remainingMs = targetDurationMs - extraMs

      return {
        sessionIndex: targetIndex,
        secondsLeft: Math.ceil(remainingMs / 1000),
        cycleComplete: false,
        remainingMs,
      }
    }

    extraMs -= targetDurationMs
    targetIndex += 1
  }

  return {
    sessionIndex: totalSessions - 1,
    secondsLeft: 0,
    cycleComplete: true,
    remainingMs: 0,
  }
}

export default function App() {
  const [sessionIndex, setSessionIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(getSessionSeconds(0))
  const [isRunning, setIsRunning] = useState(false)
  const [cycleComplete, setCycleComplete] = useState(false)
  const notificationAudioRef = useRef(null)
  const deadlineRef = useRef(null)

  const activeSession = SESSION_BLUEPRINT[sessionIndex]
  const sessionDuration = getSessionSeconds(sessionIndex)
  const progress = ((sessionDuration - secondsLeft) / sessionDuration) * 100
  const completedSessions = cycleComplete ? totalSessions : sessionIndex

  function playNotification() {
    const audio = notificationAudioRef.current
    if (!audio) return

    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  function startSession(nextIndex, nextSecondsLeft) {
    setSessionIndex(nextIndex)
    setSecondsLeft(nextSecondsLeft)
    setCycleComplete(false)
    deadlineRef.current = Date.now() + nextSecondsLeft * 1000
    setIsRunning(true)
  }

  useEffect(() => {
    if (!isRunning || cycleComplete) return undefined

    function syncTimer() {
      const deadline = deadlineRef.current
      if (!deadline) return

      const now = Date.now()
      const remainingMs = deadline - now

      if (remainingMs > 0) {
        setSecondsLeft(Math.ceil(remainingMs / 1000))
        return
      }

      playNotification()

      const nextState = advanceSession(sessionIndex, Math.abs(remainingMs))

      if (nextState.cycleComplete) {
        deadlineRef.current = null
        setSessionIndex(nextState.sessionIndex)
        setSecondsLeft(0)
        setCycleComplete(true)
        setIsRunning(false)
        return
      }

      deadlineRef.current = now + nextState.remainingMs
      setSessionIndex(nextState.sessionIndex)
      setSecondsLeft(nextState.secondsLeft)
    }

    syncTimer()
    const timer = window.setInterval(syncTimer, 250)
    window.addEventListener('visibilitychange', syncTimer)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('visibilitychange', syncTimer)
    }
  }, [cycleComplete, isRunning, sessionIndex])

  useEffect(() => {
    if (cycleComplete) {
      document.title = 'Pomodoro cycle complete'
      return
    }

    document.title = `${formatTime(secondsLeft)} - ${activeSession.label}`
  }, [activeSession.label, cycleComplete, secondsLeft])

  useEffect(() => {
    const audio = new Audio('/noti.mp3')
    audio.preload = 'auto'
    notificationAudioRef.current = audio

    return () => {
      audio.pause()
      audio.currentTime = 0
      notificationAudioRef.current = null
    }
  }, [])

  function handleStartPause() {
    if (cycleComplete) {
      startSession(0, getSessionSeconds(0))
      return
    }

    if (isRunning) {
      const remainingMs = deadlineRef.current
        ? Math.max(0, deadlineRef.current - Date.now())
        : secondsLeft * 1000

      deadlineRef.current = null
      setSecondsLeft(Math.ceil(remainingMs / 1000))
      setIsRunning(false)
      return
    }

    deadlineRef.current = Date.now() + secondsLeft * 1000
    setIsRunning(true)
  }

  function handleReset() {
    deadlineRef.current = null
    setIsRunning(false)
    setCycleComplete(false)
    setSessionIndex(0)
    setSecondsLeft(getSessionSeconds(0))
  }

  function handleSkip() {
    if (sessionIndex === totalSessions - 1) {
      deadlineRef.current = null
      setIsRunning(false)
      setCycleComplete(true)
      setSecondsLeft(0)
      return
    }

    const nextSession = sessionIndex + 1
    setCycleComplete(false)
    setSessionIndex(nextSession)

    const nextSecondsLeft = getSessionSeconds(nextSession)
    setSecondsLeft(nextSecondsLeft)

    if (isRunning) {
      deadlineRef.current = Date.now() + nextSecondsLeft * 1000
    } else {
      deadlineRef.current = null
    }
  }

  return (
    <main className="app-shell">
      <section className="timer-card">
        <div className="card-glow" aria-hidden="true" />
        <div className="card-grid" aria-hidden="true" />

        <div className="heading-row">
          <div>
            <p className="eyebrow">Pomodoro cycle</p>
            <h1>Quiet focus</h1>
          </div>
          <div className="mini-badge">
            <Sparkles size={16} strokeWidth={2} />
            <span>Flow mode</span>
          </div>
        </div>

        <div className="status-row">
          <span className={`session-chip ${activeSession.type.toLowerCase()}`}>
            {cycleComplete ? <Sparkles size={16} strokeWidth={2} /> : activeSession.type === 'Focus'
              ? <Target size={16} strokeWidth={2} />
              : <Coffee size={16} strokeWidth={2} />}
            {cycleComplete ? 'Completed' : activeSession.type}
          </span>
          <span className="session-count">
            Session {Math.min(sessionIndex + 1, totalSessions)} / {totalSessions}
          </span>
        </div>

        <div className="timer-ring" style={{ '--progress': `${progress}%` }}>
          <div className="timer-ring-inner">
            <p className="session-label">{cycleComplete ? 'Cycle finished' : activeSession.label}</p>
            <p className="time-readout">{formatTime(secondsLeft)}</p>
            <p className="session-note">
              {cycleComplete
                ? 'Take a longer rest before starting another round.'
                : `${activeSession.minutes} minute ${activeSession.type.toLowerCase()} session`}
            </p>
          </div>
        </div>

        <div className="controls">
          <button className="primary-button" type="button" onClick={handleStartPause}>
            {cycleComplete ? <RotateCcw size={17} strokeWidth={2.2} /> : isRunning ? <Pause size={17} strokeWidth={2.2} /> : <Play size={17} strokeWidth={2.2} />}
            {cycleComplete ? 'Restart cycle' : isRunning ? 'Pause' : 'Start'}
          </button>
          <button className="secondary-button" type="button" onClick={handleReset}>
            <RotateCcw size={16} strokeWidth={2.1} />
            Reset
          </button>
          <button className="secondary-button" type="button" onClick={handleSkip} disabled={cycleComplete}>
            <SkipForward size={16} strokeWidth={2.1} />
            Skip
          </button>
        </div>

        <div className="session-summary" aria-label="Pomodoro progress">
          <div className="summary-item">
            <span className="summary-label">Done</span>
            <strong>{completedSessions}</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">Left</span>
            <strong>{totalSessions - completedSessions}</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">Now</span>
            <strong>{cycleComplete ? 'Rest' : activeSession.label}</strong>
          </div>
        </div>

        <ol className="session-strip" aria-label="Pomodoro cycle sessions">
          {SESSION_BLUEPRINT.map((session, index) => {
            const state = index < sessionIndex || cycleComplete
              ? 'done'
              : index === sessionIndex
                ? 'active'
                : 'upcoming'

            return (
              <li key={session.label} className={`session-pill ${state}`}>
                <span className="session-pill-icon" aria-hidden="true">
                  {session.type === 'Focus' ? <Target size={14} strokeWidth={2.1} /> : <Coffee size={14} strokeWidth={2.1} />}
                </span>
                <span>{session.minutes}m</span>
              </li>
            )
          })}
        </ol>
      </section>
    </main>
  )
}
