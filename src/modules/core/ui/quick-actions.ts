export type QuickAction = {
  id: string
  label: string
  description: string
  href: string
}

export const ALL_QUICK_ACTIONS: QuickAction[] = [
  { 
    id: 'new-project', 
    label: 'New Project', 
    description: 'Start a new video editing project', 
    href: '/dashboard/projects/new' 
  },
  { 
    id: 'create-invoice', 
    label: 'Create Invoice', 
    description: 'Bill a client for completed work', 
    href: '/dashboard/financials/new' 
  },
  { 
    id: 'new-client', 
    label: 'New Client', 
    description: 'Add a new client to your CRM', 
    href: '/dashboard/clients' 
  },
  { 
    id: 'add-asset', 
    label: 'Add Asset', 
    description: 'Upload a new asset to your library', 
    href: '/dashboard/assets' 
  },
  { 
    id: 'record-expense', 
    label: 'Record Expense', 
    description: 'Log a new business expense', 
    href: '/dashboard/financials' 
  },
]

export type QuickActionPreference = { 
  id: string
  visible: boolean 
}
