import { OrganizationList } from '@clerk/nextjs'

export default function SelectBusinessPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Welcome to Cutline</h1>
        <p className="text-zinc-500 mt-2">Please select or create a Business to continue.</p>
      </div>
      
      <OrganizationList 
        hidePersonal={true}
        afterSelectOrganizationUrl="/dashboard"
        afterCreateOrganizationUrl="/dashboard"
      />
    </div>
  )
}
