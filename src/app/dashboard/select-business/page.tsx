import { OrganizationList } from '@clerk/nextjs'

export default async function SelectBusinessPage({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  const { redirect_url } = await searchParams;
  const redirectUrl = redirect_url || '/dashboard';
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Welcome to Cutline OS</h1>
        <p className="text-zinc-500 mt-2">Please select or create a Business to continue.</p>
      </div>
      
      <OrganizationList 
        hidePersonal={true}
        afterSelectOrganizationUrl={redirectUrl}
        afterCreateOrganizationUrl={redirectUrl}
      />
    </div>
  )
}
