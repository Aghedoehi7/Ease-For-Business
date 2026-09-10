'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { hydrateAuthStore, useAuthStore } from '@/store/authStore';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { logout, user: authUser, setUser, setSessionToken } = useAuthStore();

  useEffect(() => {
    hydrateAuthStore();
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setSessionToken(null);
    router.push('/');
    setIsOpen(false);
  };

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/#features' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Sell', href: '/sell' },
    { name: 'Inventory', href: '/inventory' },
    { name: 'Expenses', href: '/expenses' },
    { name: 'Reports', href: '/reports' },
    { name: 'Settings', href: '/settings' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white text-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group shrink-0">
            <img
              src="/logo.svg"
              alt="Ease for Business"
              className="h-24 w-auto sm:h-28 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.12)] group-hover:scale-[1.03] transition-transform"
              style={{ marginLeft: '-6px' }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-orange-600 transition-colors font-medium"
              >
                {item.name}
              </Link>
            ))}

            {authUser ? (
              <div className="flex items-center gap-4 pl-8 border-l border-orange-400">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#FF6A00] text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {authUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-semibold">{authUser.name}</p>
                    <p className="text-xs text-orange-100">{authUser.businessName}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white px-3 py-1 rounded-lg text-sm font-semibold hover:opacity-95 transition-all flex items-center gap-1 shadow-md"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/signin"
                  className="text-gray-700 hover:text-orange-600 transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white px-4 py-2 rounded-lg font-semibold hover:opacity-95 transition-all shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-orange-700"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {authUser ? (
              <>
                <div className="px-3 py-3 border-t border-orange-400 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-[#FF6A00] text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {authUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{authUser.name}</p>
                      <p className="text-xs text-orange-100">{authUser.businessName}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full mt-2 bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white px-4 py-2 rounded-lg font-semibold hover:opacity-95 transition-all flex items-center justify-center gap-1 shadow-md"
                >
                  <LogOut size={18} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="block w-full mt-2 bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white px-4 py-2 rounded-lg font-semibold hover:opacity-95 transition-all text-center shadow-md"
                  onClick={() => setIsOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
