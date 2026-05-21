import { useState, useEffect } from 'react'

export function useDataFreshness(triggerKey?: unknown) {
  const [timestamp, setTimestamp] = useState(() => new Date())

  useEffect(() => {
    setTimestamp(new Date())
  }, [triggerKey])

  const formatted = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return { timestamp, formatted, label: `As of ${formatted}` }
}
