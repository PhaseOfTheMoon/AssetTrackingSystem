'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
// Import all required Heroicons
import {
  Bars3Icon,
  UserCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import LogoutButton from '../auth/LogoutButton';

const sidebarItems = [
  { name: 'Dashboard', icon: Bars3Icon, href: '/admin/dashboard' },
  {
    name: 'Asset Management',
    icon: CogIcon,
    href: '/admin/assetManage/',
    dropdown: ['Assets', 'Categories', 'Reports'],
  },
  {
    name: 'Location',
    icon: MapPinIcon,
    href: '/location',
    dropdown: ['Sites', 'Rooms', 'Zones'],
  },
  {
    name: 'Department',
    icon: BuildingOfficeIcon,
    href: '/department',
    dropdown: ['Units', 'Teams', 'Budgets'],
  },
  {
    name: 'Staff',
    icon: UsersIcon,
    href: '/staff',
    dropdown: ['Employees', 'Roles', 'Attendance'],
  },
];

const profileItems = [
  { name: 'My Profile', icon: UserCircleIcon, href: '/profile' },
  { name: 'Settings', icon: CogIcon, href: '/settings' },
  { name: 'Log Out', icon: ArrowRightOnRectangleIcon, href: '/logout' },
];

const sidebarVariants: Variants = {
  open: { x: 0, opacity: 1, width: '16rem', transition: { duration: 0.3, ease: 'easeInOut' } },
  closed: { x: -250, opacity: 0, width: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
  mobileOpen: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } },
  mobileClosed: { y: '-100%', opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
};

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (value: boolean) => void }) {
  const [activeItem, setActiveItem] = useState<string | null>(null); // Controls dropdown visibility
  const [highlightedItem, setHighlightedItem] = useState<string | null>('/dashboard'); // Controls highlight
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !isMobile) {
        setIsOpen(false); // Force close when entering mobile to trigger dropdown
      } else if (!mobile && isMobile) {
        setIsOpen(true); // Open on desktop transition
      }
    };
    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsOpen, isMobile]);

  const toggleDropdown = (href: string) => {
    // Toggle activeItem for dropdown, keep highlight
    setActiveItem((current) => (current === href ? null : href));
    if (activeItem !== href) {
      setHighlightedItem(href); // Highlight new item if different
    }
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (isMobile && isOpen && !(e.target as HTMLElement).closest('.sidebar')) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isMobile && isOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMobile, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`sidebar bg-white shadow-lg flex flex-col z-40 overflow-hidden ${
            isMobile ? 'fixed top-0 left-0 w-full h-[calc(100%-64px)] p-4 pt-6' : 'min-h-screen w-64 p-4 fixed'
          }`}
          variants={sidebarVariants}
          initial={isMobile ? 'mobileClosed' : 'closed'}
          animate={isMobile ? (isOpen ? 'mobileOpen' : 'mobileClosed') : (isOpen ? 'open' : 'closed')}
          exit={isMobile ? 'mobileClosed' : 'closed'}
        >
          {/* Logo and Close Button for Mobile */}
          <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
            <span className="text-xl font-bold">Swinburne University</span>
            {isMobile && (
              <button onClick={() => setIsOpen(false)} className="text-red-600 hover:text-red-800">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Search Bar for Mobile */}
          {isMobile && (
            <div className="relative mb-6">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 w-full"
              />
            </div>
          )}

          {/* Sidebar Items */}
          <nav className="flex-1 space-y-2 overflow-y-auto">
            {sidebarItems.map((item) => (
              <div key={item.name}>
                <button
                  onClick={() => toggleDropdown(item.href)}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${
                    highlightedItem === item.href
                      ? 'bg-red-600 text-white shadow-md'
                      : hoveredItem === item.name
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  {item.name}
                  {item.dropdown && (
                    <ChevronDownIcon
                      className={`h-5 w-5 ml-auto transition-transform duration-200 ${activeItem === item.href ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                <AnimatePresence>
                  {item.dropdown && activeItem === item.href && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="ml-8 space-y-1 mt-1 overflow-hidden"
                    >
                      {item.dropdown.map((subItem) => (
                        <a
                          key={subItem}
                          href={`${item.href}/${subItem.toLowerCase()}`}
                          className="block p-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
                        >
                          {subItem}
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Separator and Bottom Items */}
          <div className="border-t border-gray-200 pt-4 space-y-2 shrink-0">
            <a
              href="/settings"
              onMouseEnter={() => setHoveredItem('Settings')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ease-in-out ${
                highlightedItem === '/settings'
                  ? 'bg-red-600 text-white shadow-md'
                  : hoveredItem === 'Settings'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <CogIcon className="h-5 w-5 mr-3 flex-shrink-0" />
              Settings
            </a>
            <LogoutButton
              className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${
                highlightedItem === '/logout'
                  ? 'bg-red-600 text-white shadow-md'
                  : hoveredItem === 'Log Out'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
              }`}
              showIcon={true}
              text="Sign Out"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}