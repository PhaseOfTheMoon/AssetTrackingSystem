'use client'

import { useIsAuthenticated } from '@azure/msal-react'
import MicrosoftLoginButton from '@/components/auth/MicrosoftLoginButton'
import Image from 'next/image'

export default function LoginPage() {
  const isAuthenticated = useIsAuthenticated()

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Welcome to Asset Tracking!
          </h1>
          <p className="text-gray-600">
            You are successfully logged in with Microsoft.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/logo-long-full.svg"
              alt="Swinburne University of Technology"
              width={180}
              height={60}
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Asset Tracking System
          </h1>
          <p className="text-gray-600 text-sm">IT Asset Management</p>
        </div>

        {/* Microsoft Login */}
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Sign in with your organization account
            </p>
          </div>

          <MicrosoftLoginButton />

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Secure authentication powered by Microsoft Azure AD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// export default function HomePage() {
//   return (
//     <main className="min-h-screen flex items-center justify-center bg-gray-100">
//       <div className="text-center">
//         <h1 className="h-16 text-3xl font-bold mb-4 text-shadow-lg" >Welcome to Asset Tracking</h1>
//         <a
//           href="/scan"
//           className="px-6 py-3 bg-red-600 text-white rounded-lg shadow hover:bg-red-700"
//         >
//           Go to Scanner
//         </a>
//       </div>
//     </main>
//   );
// }