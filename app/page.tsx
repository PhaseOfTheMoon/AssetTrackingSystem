"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import MicrosoftLoginButton from "@/components/auth/MicrosoftLoginButton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/SessionProvider";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const isAuthenticated = useIsAuthenticated();
  const { accounts, instance } = useMsal();
  const router = useRouter();
  const { session, startSession } = useSession();
  const [isInitializing, setIsInitializing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before any navigation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize session when user logs in with Microsoft
  useEffect(() => {
    if (!mounted) return; // Don't run until component is mounted

    const initializeSession = async () => {
      if (isAuthenticated && accounts.length > 0 && !session && !isInitializing) {
        setIsInitializing(true);

        const account = accounts[0];
        const microsoftUserId = account.localAccountId;

        try {
          // Fetch staff data from database
          const response = await fetch('/api/staff/get-by-microsoft-id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ microsoftUserId }),
          });

          if (response.ok) {
            const staffData = await response.json();
            await startSession(staffData, microsoftUserId);
            
            // Use setTimeout to defer navigation to next tick
            setTimeout(() => {
              router.push('/admin/dashboard');
            }, 0);
          } else {
            console.error('Failed to fetch staff data');
            setIsInitializing(false);
          }
        } catch (error) {
          console.error('Error initializing session:', error);
          setIsInitializing(false);
        }
      }
    };

    initializeSession();
  }, [isAuthenticated, accounts, session, isInitializing, startSession, router, mounted]);

  // Redirect if already has session
  useEffect(() => {
    if (mounted && session && !isInitializing) {
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 0);
    }
  }, [session, router, mounted, isInitializing]);

  // Don't render anything until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated or no session
  if (!isAuthenticated || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl">
          <div className="text-center">
            <Image
              src="/logo-long-full.svg"
              alt="Swinburne Logo"
              width={300}
              height={80}
              className="mx-auto mb-8"
            />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Asset Tracking System
            </h2>
            <p className="text-gray-600 mb-8">
              Sign in with your Microsoft account to continue
            </p>
          </div>
          <MicrosoftLoginButton />
        </div>
      </div>
    );
  }

  // This should not be reached, but just in case
  return null;
}