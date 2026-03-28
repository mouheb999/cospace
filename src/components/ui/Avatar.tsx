'use client'

import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  gradient?: 'teal' | 'gold' | 'silver' | 'bronze' | 'purple' | 'red'
  avatarUrl?: string
}

export function Avatar({ name, size = 'md', className, gradient = 'teal', avatarUrl }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-[0.65rem]',
    md: 'w-[38px] h-[38px] text-[0.78rem]',
    lg: 'w-16 h-16 text-[1.8rem] font-display',
    xl: 'w-20 h-20 text-2xl font-display',
  }

  const gradients = {
    teal: 'bg-gradient-to-br from-teal to-lime',
    gold: 'bg-gradient-to-br from-gold to-[#e8a010]',
    silver: 'bg-gradient-to-br from-silver to-[#909aaa]',
    bronze: 'bg-gradient-to-br from-bronze to-[#9a5f22]',
    purple: 'bg-gradient-to-br from-[#5050c8] to-[#8080e0]',
    red: 'bg-gradient-to-br from-[#c85050] to-[#e08080]',
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-black flex-shrink-0 overflow-hidden',
        sizes[size],
        className
      )}
    >
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={cn(
          'w-full h-full rounded-full flex items-center justify-center',
          gradients[gradient]
        )}>
          {getInitials(name)}
        </div>
      )}
    </div>
  )
}
