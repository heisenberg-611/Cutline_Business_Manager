import { getClients } from '@/modules/clients/actions'
import { ClientForm } from '@/modules/clients/components/ClientForm'
import { ClientActions } from '@/modules/clients/components/ClientActions'
import { ClientRating } from '@/modules/clients/components/ClientRating'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Clients',
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { orgId } = await auth()
  const resolvedSearchParams = await searchParams
  const shouldOpenNewClient = resolvedSearchParams.newClient === '1'
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const clients = await getClients(orgId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Client Directory
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your repeat clients, view their ratings, and track their lifetime value.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <ClientForm defaultOpen={shouldOpenNewClient} />
        </div>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">
            You don't have any clients yet. Click "New Client" to get started!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Preferred Channel</TableHead>
                <TableHead>Internal Rating</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <div>{client.displayName}</div>
                    {client.companyName && (
                      <div className="text-xs text-zinc-500">{client.companyName}</div>
                    )}
                  </TableCell>
                  <TableCell>{client.industry || '-'}</TableCell>
                  <TableCell>{client.preferredChannel || '-'}</TableCell>
                  <TableCell>
                    <ClientRating clientId={client.id} initialRating={client.internalRating} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <ClientActions client={{
                        id: client.id,
                        displayName: client.displayName,
                        companyName: client.companyName || '',
                        email: client.email || '',
                        phone: client.phone || '',
                        industry: client.industry || '',
                        preferredChannel: client.preferredChannel || '',
                        internalRating: client.internalRating
                      }} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
