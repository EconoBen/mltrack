'use client'

import React from 'react'
import { UserAvatar } from './user-avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface UserInfoProps {
  userId?: string
  userName?: string
  userEmail?: string
  userTeam?: string
  showName?: boolean
  showTeam?: boolean
  avatarSize?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function UserInfo({
  userId,
  userName,
  userEmail,
  userTeam,
  showName = false,
  showTeam = false,
  avatarSize = 'sm',
  className
}: UserInfoProps) {
  if (!userName && !userEmail) {
    // Try to extract from userId if it's an email
    if (userId?.includes('@')) {
      userEmail = userId
      userName = userId.split('@')[0]
    } else {
      userName = userId || 'Unknown'
    }
  }

  const displayName = userName || userEmail?.split('@')[0] || 'Unknown'
  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">{displayName}</div>
      {userEmail && <div className="text-xs text-muted-foreground">{userEmail}</div>}
      {userTeam && <div className="text-xs text-muted-foreground">Team: {userTeam}</div>}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <UserAvatar 
              name={userName}
              email={userEmail}
              size={avatarSize}
            />
            {showName && (
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName}</span>
                {showTeam && userTeam && (
                  <span className="text-xs text-muted-foreground">{userTeam}</span>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Utility function to extract user info from run tags
export function extractUserInfo(tags: Record<string, string>) {
  return {
    userId: tags['mltrack.user.id'] || tags['mlflow.user'] || tags['user'],
    userName: tags['mltrack.user.name'] || tags['mlflow.userName'],
    userEmail: tags['mltrack.user.email'] || tags['user'],
    userTeam: tags['mltrack.user.team'] || tags['team']
  }
}