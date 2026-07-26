import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { X, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Member {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

interface MemberPickerProps {
  members: Member[]
  isLoading: boolean
  selectedUserIds: string[]
  onToggleUser: (userId: string) => void
  disabled?: boolean
}

export function MemberPicker({
  members,
  isLoading,
  selectedUserIds,
  onToggleUser,
  disabled
}: MemberPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMembers = members.filter(m => 
    (m.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (m.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <div className="flex flex-col gap-2 shrink-0">
        {selectedUserIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30">
            {selectedUserIds.map(id => {
              const m = members.find(u => u.id === id)
              if (!m) return null
              return (
                <div key={id} className="flex items-center gap-1 bg-background border px-2 py-1 rounded-full text-xs font-medium">
                  {m.firstName}
                  <button 
                    onClick={() => onToggleUser(id)} 
                    disabled={disabled}
                    className="hover:bg-muted rounded-full p-0.5 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <Input 
          placeholder="Search members..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-[150px] border rounded-md p-1">
        {isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : filteredMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">No members found.</p>
        ) : (
          <div className="space-y-1">
            {filteredMembers.map(m => {
              const isSelected = selectedUserIds.includes(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => onToggleUser(m.id)}
                  disabled={disabled}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors",
                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded-sm border flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-input")}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm font-medium">{m.firstName} {m.lastName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.email}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
