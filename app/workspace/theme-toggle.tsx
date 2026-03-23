'use client'

import { useTheme } from './theme-provider'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <label className="stack">
      <span className="muted">Theme</span>
      <select value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  )
}
