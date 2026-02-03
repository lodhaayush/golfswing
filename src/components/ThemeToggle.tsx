import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { colors } from '@/styles/colors'

export function ThemeToggle() {
  const { resolvedTheme, cycleTheme } = useTheme()

  const getIcon = () => {
    return resolvedTheme === 'light'
      ? <Sun className="w-4 h-4" />
      : <Moon className="w-4 h-4" />
  }

  const getTitle = () => {
    return resolvedTheme === 'light'
      ? 'Light mode (click to switch to dark)'
      : 'Dark mode (click to switch to light)'
  }

  return (
    <button
      onClick={cycleTheme}
      className={`p-2 rounded-lg ${colors.button.ghost} ${colors.bg.hover} transition-colors`}
      title={getTitle()}
      aria-label={getTitle()}
    >
      {getIcon()}
    </button>
  )
}
