import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClients } from '@/modules/clients/actions'
import { NewProjectForm } from '@/modules/projects/components/NewProjectForm'

export default async function NewProjectPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const clients = await getClients(orgId)

  return (
    <div className="container py-6">
      <NewProjectForm clients={clients.map(c => ({ id: c.id, displayName: c.displayName }))} />
    </div>
  )
}
