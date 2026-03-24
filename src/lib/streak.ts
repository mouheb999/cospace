import { differenceInDays, startOfDay, isToday, isYesterday, subDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface StreakData {
  currentStreak: number
  bestStreak: number
  checkedInToday: boolean
  lastCheckIn: Date | null
  weekProgress: boolean[]
}

export function calculateStreak(checkInDates: Date[]): StreakData {
  if (checkInDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      checkedInToday: false,
      lastCheckIn: null,
      weekProgress: Array(7).fill(false),
    }
  }

  const sortedDates = checkInDates
    .map((d) => startOfDay(new Date(d)))
    .sort((a, b) => b.getTime() - a.getTime())

  const today = startOfDay(new Date())
  const checkedInToday = isToday(sortedDates[0])
  const lastCheckIn = sortedDates[0]

  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 1

  // Calculate current streak
  let expectedDate = checkedInToday ? today : startOfDay(subDays(today, 1))
  
  for (const date of sortedDates) {
    if (date.getTime() === expectedDate.getTime()) {
      currentStreak++
      expectedDate = startOfDay(subDays(expectedDate, 1))
    } else if (date.getTime() < expectedDate.getTime()) {
      break
    }
  }

  // Calculate best streak
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const diff = differenceInDays(sortedDates[i - 1], sortedDates[i])
      if (diff === 1) {
        tempStreak++
      } else {
        bestStreak = Math.max(bestStreak, tempStreak)
        tempStreak = 1
      }
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak, currentStreak)

  // Calculate week progress (last 7 days)
  const weekProgress: boolean[] = []
  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(subDays(today, i))
    const hasCheckIn = sortedDates.some((d) => d.getTime() === day.getTime())
    weekProgress.push(hasCheckIn)
  }

  return {
    currentStreak,
    bestStreak,
    checkedInToday,
    lastCheckIn,
    weekProgress,
  }
}

export function getNextMilestone(currentStreak: number): { days: number; reward: string } {
  const milestones = [
    { days: 7, reward: 'Badge Bronze 🥉' },
    { days: 14, reward: 'Badge Argent 🥈' },
    { days: 30, reward: '1 mois gratuit 🎁' },
    { days: 60, reward: 'Badge Champion 👑' },
    { days: 100, reward: 'Membre VIP à vie ⭐' },
  ]

  for (const milestone of milestones) {
    if (currentStreak < milestone.days) {
      return milestone
    }
  }

  return { days: 365, reward: 'Légende CoSpace 🏆' }
}

export function getDaysUntilMilestone(currentStreak: number): number {
  const nextMilestone = getNextMilestone(currentStreak)
  return nextMilestone.days - currentStreak
}

export function formatStreakDate(date: Date): string {
  return format(date, 'EEEE d MMMM', { locale: fr })
}

export function getMonthCheckins(checkInDates: Date[], year: number, month: number): boolean[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const result: boolean[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = startOfDay(new Date(year, month, day))
    const hasCheckIn = checkInDates.some(
      (d) => startOfDay(new Date(d)).getTime() === date.getTime()
    )
    result.push(hasCheckIn)
  }

  return result
}
