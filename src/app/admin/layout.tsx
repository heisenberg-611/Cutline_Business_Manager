import Link from 'next/link';
import { Home, Users, CreditCard, Activity, LogOut, ShieldAlert, Settings, Building2, Megaphone, ShieldCheck } from 'lucide-react';
import prisma from '@/modules/core/db/prisma';
import { cookies } from 'next/headers';
import { AdminAuthForm } from './components/AdminAuthForm';
import { logoutAdmin } from './actions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth Flow: Check for admin_session cookie
  const cookieStore = await cookies();
  const adminEmail = cookieStore.get('admin_session')?.value;

  // If no session cookie, or if the user doesn't exist in the DB, show the login screen
  let isAuthenticated = false;

  if (adminEmail) {
    const globalAdmin = await prisma.globalAdmin.findUnique({
      where: { email: adminEmail },
    });
    if (globalAdmin && globalAdmin.passwordHash) {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Admin Authentication</h2>
          <p className="text-zinc-500 mb-6 text-sm">
            Please enter your admin email and master password to continue.
          </p>
          <AdminAuthForm />
        </div>
      </div>
    );
  }

  // Render the Admin Panel
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
          <img src="/icon.svg" alt="Cutline OS" className="w-8 h-8 mr-3 rounded-md object-cover" />
          <h1 className="font-bold text-zinc-900 dark:text-white">Cutline Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Home className="w-4 h-4" /> Overview
          </Link>
          <Link href="/admin/subscriptions" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Activity className="w-4 h-4" /> Subscriptions
          </Link>
          <Link href="/admin/finances" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <CreditCard className="w-4 h-4" /> Finances
          </Link>
          <Link href="/admin/organizations" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Building2 className="w-4 h-4" /> Organizations
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Users className="w-4 h-4" /> Users
          </Link>
          <Link href="/admin/broadcasts" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Megaphone className="w-4 h-4" /> Broadcasts
          </Link>
          <Link href="/admin/audit" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <ShieldCheck className="w-4 h-4" /> Audit Logs
          </Link>
          <Link href="/admin/admins" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <ShieldAlert className="w-4 h-4" /> Admins
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Settings className="w-4 h-4" /> Platform Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="text-xs text-zinc-500 text-center mb-2 truncate">
            {adminEmail}
          </div>
          <form action={logoutAdmin}>
            <button type="submit" className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400">
              <LogOut className="w-4 h-4" /> Lock Panel
            </button>
          </form>
          <Link href="/dashboard" className="block text-center text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline mt-2">
            ← Back to App
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
