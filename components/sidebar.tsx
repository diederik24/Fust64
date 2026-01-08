'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, PlusCircle, List, Package, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mutatie', label: 'Mutatie Invoeren', icon: PlusCircle },
  { href: '/overzicht', label: 'Fust Overzicht', icon: List },
  { href: '/mutatie-beheer', label: 'Mutatie Beheer', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-lg z-40 flex flex-col">
      <div className="p-6 border-b border-blue-500">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <h1 className="text-xl font-bold">Fust Beheer</h1>
        </div>
        <p className="text-sm text-blue-100 mt-2 ml-8">StraverPflanzenExport</p>
      </div>
      <nav className="p-4 space-y-2 flex-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-white text-blue-600 font-semibold"
                    : "text-blue-100 hover:bg-blue-500 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-blue-500">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full",
            "text-blue-100 hover:bg-blue-500 hover:text-white",
            loggingOut && "opacity-50 cursor-not-allowed"
          )}
        >
          <LogOut className="h-5 w-5" />
          <span>{loggingOut ? 'Uitloggen...' : 'Uitloggen'}</span>
        </button>
      </div>
    </aside>
  );
}

