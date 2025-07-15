'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { User, Users, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserFilterProps {
  selectedUsers: string[];
  selectedTeams: string[];
  onUsersChange: (users: string[]) => void;
  onTeamsChange: (teams: string[]) => void;
  availableUsers?: Array<{ id: string; name: string; email: string; team?: string }>;
  showOnlyMyRuns?: boolean;
  onToggleMyRuns?: (show: boolean) => void;
}

export function UserFilter({
  selectedUsers,
  selectedTeams,
  onUsersChange,
  onTeamsChange,
  availableUsers = [],
  showOnlyMyRuns = false,
  onToggleMyRuns,
}: UserFilterProps) {
  const [open, setOpen] = useState(false);
  
  // Get unique teams from available users
  const uniqueTeams = Array.from(
    new Set(availableUsers.filter(u => u.team).map(u => u.team!))
  );
  
  // Get current user from localStorage or session
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // This would be replaced with actual auth when implemented
    const storedUser = localStorage.getItem('mltrack_current_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUserId(user.id);
      } catch (e) {
        console.error('Failed to parse current user');
      }
    }
  }, []);
  
  const handleUserToggle = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onUsersChange(selectedUsers.filter(id => id !== userId));
    } else {
      onUsersChange([...selectedUsers, userId]);
    }
  };
  
  const handleTeamToggle = (team: string) => {
    if (selectedTeams.includes(team)) {
      onTeamsChange(selectedTeams.filter(t => t !== team));
    } else {
      onTeamsChange([...selectedTeams, team]);
    }
  };
  
  const handleClearAll = () => {
    onUsersChange([]);
    onTeamsChange([]);
    if (onToggleMyRuns) {
      onToggleMyRuns(false);
    }
  };
  
  const activeFilters = selectedUsers.length + selectedTeams.length + (showOnlyMyRuns ? 1 : 0);
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Users className="mr-2 h-4 w-4" />
          Users
          {activeFilters > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1">
              {activeFilters}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Filter by Users</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* My Runs Toggle */}
        {currentUserId && onToggleMyRuns && (
          <>
            <DropdownMenuCheckboxItem
              checked={showOnlyMyRuns}
              onCheckedChange={onToggleMyRuns}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              My Runs Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Teams Section */}
        {uniqueTeams.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Teams
            </DropdownMenuLabel>
            {uniqueTeams.map(team => (
              <DropdownMenuCheckboxItem
                key={team}
                checked={selectedTeams.includes(team)}
                onCheckedChange={() => handleTeamToggle(team)}
              >
                <Users className="mr-2 h-4 w-4" />
                {team}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Individual Users Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Individual Users
        </DropdownMenuLabel>
        {availableUsers.length === 0 ? (
          <DropdownMenuItem disabled>
            No users found
          </DropdownMenuItem>
        ) : (
          availableUsers.map(user => (
            <DropdownMenuCheckboxItem
              key={user.id}
              checked={selectedUsers.includes(user.id)}
              onCheckedChange={() => handleUserToggle(user.id)}
            >
              <User className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuCheckboxItem>
          ))
        )}
        
        {activeFilters > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearAll}>
              Clear all filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}