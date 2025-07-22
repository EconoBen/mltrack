'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name?: string
  email?: string
  image?: string
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg'
}

export function UserAvatar({ name, email, image, className, size = 'sm' }: UserAvatarProps) {
  const initials = React.useMemo(() => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return 'U'
  }, [name, email])

  // Generate a consistent color based on the email or name
  const colorIndex = React.useMemo(() => {
    const str = email || name || ''
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash) % 8
  }, [email, name])

  const bgColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-teal-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500'
  ]

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {image ? (
        <AvatarImage src={image} alt={name || email} />
      ) : null}
      <AvatarFallback className={cn(bgColors[colorIndex], 'text-white')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}