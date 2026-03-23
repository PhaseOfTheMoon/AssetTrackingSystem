// components\navbar\navbar.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircleIcon,
  CogIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import LogoutButton from '../logoutButton';
import { useSession } from "next-auth/react";

// Dynamically import Sidebar with SSR disabled
const Sidebar = dynamic(() => import('./sidebar'));

interface navbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

/** Commented by Desmond @ 23-Mar-26
 * Get initials (e.g., LY, or WC) avatar from session
 */
function getInitialsAvatar(name: string): string {
  const initials = name
  .split(' ') // Breaks the name into a list of words
  .map((part) => part[0]?.toUpperCase() ?? '') // Takes the first letter of each word and makes it uppercase
  .slice(0, 2) // If a user has more than 2 words in their name, only take the first two initials
  .join(''); // Join the initials together to form a string

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox=0 0 40 40"> ${/* Standard namespace declaration for XML and SVG files */ ''}
    <rect width="40" height="40" rx="20" fill="#DC2626" /> ${/* Draws a red square but rounds the corners by 20px */ ''}
    <text x="20" y="25" text-anchor="middle" font-family="sans-serif" 
      font-size="14" font-weight="600" fill="white">${initials} ${/* Place the initials in the center of the circle */ ''}
    </text>
    </svg>
    `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`; // Put the entire SVG into a data URL so it can be used as an image source
}

export default function Navbar({ sidebarOpen, setSidebarOpen }: navbarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();

  const router = useRouter(); // Replaces window.location.href for navigation which doesn't cause a full page reload
  const { data: session } = useSession();
  const dashboardPath = session?.user?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'; // Determine dashboard path based on user role

  const [isMobile, setIsMobile] = useState(false);
  const prevPathname = useRef(pathname);
  const profileDropdownRef = useRef<HTMLDivElement>(null); // Clicking outside the handler closes the profile dropdown menu

  // Fetching the values needed from the user session
  const userName = session?.user?.name ?? 'User';
  const userEmail = session?.user?.email ?? 'No email available';
  const userAvatar = session?.user?.image || getInitialsAvatar(userName); // Use profile picture if available, otherwise generate an avatar with initials

  /**
   * Detect when website is displayed on mobile screen sizes
   */
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  /**
   * Closes sidebar and dropdown menu when navigating to a different page
   */
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      if (isMobile) {
         setSidebarOpen(false);
      }
      setIsProfileOpen(false);
      prevPathname.current = pathname; // Update last visited page to the current page
    }
  }, [pathname, isMobile, setSidebarOpen]); // Whenever these three attributes change, the function runs

  /**
   * Close profile dropdown if sidebar opens (only on mobile)
   */
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setIsProfileOpen(false);
    }
  }, [sidebarOpen, isMobile]);

  /**
   * Click-outside handler for profile dropdown
   */
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
      setIsProfileOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isProfileOpen, handleClickOutside]);

  /**
   * Use escape key to close profile dropdown
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      }
    }
  }, []);

  /**
   * Event handlers
   */
  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    if (isMobile) { 
      setIsProfileOpen(false);
    }
  };

  const handleToggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Render the navbar component
  return (
    <> {/* Ghost tag to group multiple elements together without adding an extra <div> */}
      {/* Fixed position, glued at top edge of screen, z-50 ensure it stays on top other elements */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
        {/* Left right, up down padding. But also bigger padding on larger screens, though left side is smaller */}
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          {/* Flexbox, ensure logo and buttons sit in the same vertical line, pushes logo and last item to far left and right */}
          <div className="flex items-center justify-between">
            {/* Left section */}
            {/* Flex and items-center to center logo and button vertically; Push everything to left side of navbar; If language is arabic, flip everything to rtl */}
            <div className="flex items-center justify-start rtl:justify-end">
              <button
                onClick={handleToggleSidebar}
                type="button"
                className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                aria-label="Toggle sidebar"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              <Link href={dashboardPath} className="flex ms-2 md:me-24" rel="noopener noreferrer">
                <Image src="/logo-long-full.svg" className="h-12 w-auto me-5" alt="Swinburne Logo" width={180} height={48} priority unoptimized />
              </Link>
            </div>

            {/* Right section */}
            <div className="flex items-center">
              <div className="flex items-center ms-3 relative" ref={profileDropdownRef} >
                <button
                  onClick={handleToggleProfile}
                  type="button"
                  className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-red-400"
                  aria-expanded={isProfileOpen}
                >
                  <img
                    className="w-8 h-8 rounded-full"
                    src={userAvatar}
                    alt={`${userName}'s profile picture`}
                  />
                </button>

                {/* Profile dropdown */}
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="absolute right-0 top-12 z-40 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-xl w-64 p-6"
                      role="menu"
                      aria-label="User profile menu"
                    >
                      <div className="flex items-center mb-4 space-x-3">
                        <img
                          className="w-12 h-12 rounded-full"
                          src={userAvatar}
                          alt={`${userName}'s profile picture`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {userName}
                          </p>
                          <p className="text-xs text-gray-600 truncate" title={userEmail}>
                            {userEmail}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4 space-y-2">
                        <button
                          onClick={() => {
                            router.push('/profile');
                            setIsProfileOpen(false);
                          }}
                          role="menuitem"
                          className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${pathname === '/profile'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-800 hover:bg-red-50 hover:text-red-600'
                            }`}
                        >
                          <UserCircleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                          Profile
                        </button>

                        <button
                          onClick={() => {
                            router.push('/settings');
                            setIsProfileOpen(false);
                          }}
                          className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${pathname === '/settings'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-800 hover:bg-red-50 hover:text-red-600'
                            }`}
                        >
                          <CogIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                          Settings
                        </button>

                        <LogoutButton
                          className="flex items-center w-full p-3 rounded-lg text-gray-800 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ease-in-out"
                          showIcon={true}
                          text="Sign Out"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
