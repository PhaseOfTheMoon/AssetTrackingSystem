'use client';
import { useState } from 'react';
import LogoutButton from '../auth/LogoutButton';

export default function Sidebar(
    { isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (value: boolean) => void }) {
    const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});

    return (
        <aside
            className={`${isOpen ? 'translate-x-0' : '-translate-x-full'
                } fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform duration-300 bg-white border-r-4 border-red-500 sm:fixed sm:top-16 sm:left-0 sm:w-64 sm:h-[calc(100vh-64px)] sm:translate-x-0 sm:pt-0 sm:mt-3`}
        >
            <div className="h-full px-3 pb-4 overflow-y-auto">
                <ul className="space-y-2 font-medium">
                    <li>
                        <a
                            href="/admin/dashboard"
                            className="flex items-center p-3 text-black rounded-lg hover:bg-red-100 transition-colors duration-200 group"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg className="w-5 h-5 text-gray-600 group-hover:text-red-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 22 21">
                                <path d="M16.975 11H10V4.025a1 1 0 0 0-1.066-.998 8.5 8.5 0 1 0 9.039 9.039.999.999 0 0 0-1-1.066h.002Z" />
                                <path d="M12.5 0c-.157 0-.311.01-.565.027A1 1 0 0 0 11 1.02V10h8.975a1 1 0 0 0 1-.935c.013-.188.028-.374.028-.565A8.51 8.51 0 0 0 12.5 0Z" />
                            </svg>
                            <span className="ms-3">Dashboard</span>
                        </a>
                    </li>

                    {/* Dropdown menu */}
                    <li>
                        <button
                            onClick={() => setOpenDropdowns({ ...openDropdowns, userManagement: !openDropdowns.userManagement })}
                            className="w-full flex items-center justify-between p-3 text-black rounded-lg hover:bg-red-100 transition-colors duration-200 group"
                        >
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-gray-600 group-hover:text-red-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
                                    <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
                                </svg>
                                <span className="flex-1 ms-3 whitespace-nowrap">User Management</span>
                            </div>
                            <svg
                                className={`w-4 h-4 text-gray-600 transition-transform ${openDropdowns.userManagement ? 'rotate-180' : ''}`}
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 10 6"
                            >
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                            </svg>
                        </button>

                        {/* Dropdown Items */}
                        {openDropdowns.userManagement && (
                            <ul className="pl-6 mt-2 space-y-2">
                                <li>
                                    <a
                                        href="/admin/assetManage/asset"
                                        className="flex items-center p-2 text-black rounded-lg hover:bg-red-100 transition-colors duration-200"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <svg className="w-6 h-6 text-gray-600 group-hover:text-red-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M21 8.5V7a1 1 0 0 0-.553-.894l-8-4a1 1 0 0 0-.894 0l-8 4A1 1 0 0 0 3 7v1.5l9 4.5 9-4.5ZM3 10.382V17a1 1 0 0 0 .553.894l8 4a1 1 0 0 0 .894 0l8-4A1 1 0 0 0 21 17v-6.618l-9 4.5-9-4.5Z" />
                                        </svg>
                                        <span className="ms-3">Assets</span>
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="flex items-center p-2 text-black rounded-lg hover:bg-red-100 transition-colors duration-200"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <svg className="w-6 h-6 text-gray-600 group-hover:text-red-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M3 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v2H3V6Zm0 4h20v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z" />
                                        </svg>
                                        <span className="ms-3">Categories</span>
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="flex items-center p-2 text-black rounded-lg hover:bg-red-100 transition-colors duration-200"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <svg className="w-6 h-6 text-gray-600 group-hover:text-red-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-6-5H5Zm7 7h2v7h-2v-7Zm-4 3h2v4H8v-4Zm8-5h2v9h-2V8Z" />
                                        </svg>
                                        <span className="ms-3">Report</span>
                                    </a>
                                </li>
                                {/* <li>
                    <a
                        href="#"
                        className="flex items-center p-2 text-black rounded-lg hover:bg-red-100 transition-colors duration-200"
                        onClick={() => setIsOpen(false)}
                    >
                        Delete Users
                    </a>
                    </li> */}
                            </ul>
                        )}
                    </li>

                    <li>
                        <a
                            href="#"
                            className="flex items-center p-3 text-black rounded-lg hover:bg-red-100 transition-colors duration-200 group"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg className="w-5 h-5 text-gray-600 group-hover:text-red-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                                <path d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2.97 2.97 0 0 1-.184 1H19a1 1 0 0 0 1-1v-1a5.006 5.006 0 0 0-5-5ZM6.5 9a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 10H5a5.006 5.006 0 0 0-5 5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2a5.006 5.006 0 0 0-5-5Z" />
                            </svg>
                            <span className="flex-1 ms-3 whitespace-nowrap">Staff</span>
                        </a>
                    </li>

                    <li>
                        <a
                            href="#"
                            className="flex items-center p-3 text-black rounded-lg hover:bg-red-100 transition-colors duration-200 group"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg className="w-5 h-5 text-gray-600 group-hover:text-red-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 20">
                                <path d="M3 21V9a1 1 0 0 1 1-1h4V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v4h4a1 1 0 0 1 1 1v12h-3v-4h-2v4h-8v-4H6v4H3Zm6-12V5h6v4H9Zm10 10v-8h-2v8h2ZM7 19v-8H5v8h2Z" />
                            </svg>
                            <span className="flex-1 ms-3 whitespace-nowrap">Dpartment</span>
                        </a>
                    </li>

                    <li>
                        <a
                            href="#"
                            className="flex items-center p-3 text-black rounded-lg hover:bg-red-100 transition-colors duration-200 group"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg className="w-5 h-5 text-gray-600 group-hover:text-red-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                            </svg>
                            <span className="flex-1 ms-3 whitespace-nowrap">Location</span>
                        </a>
                    </li>

                    <li>
                        <LogoutButton
                            className="w-full flex items-center p-3 text-black rounded-lg hover:bg-red-100 transition-colors duration-200 group"
                            showIcon={true}
                            text="Sign Out"
                        />
                    </li>
                </ul>
            </div>
        </aside>
    );
}