// app/api/auth/[...nextauth]/route.ts
/*
  - route.ts are not normal modules
  - They are special files where Next.js is very strict about
  - what are allowed to export.
  - In app/api/__/route.ts, we can only export HTTP hanlers such as
  - GET, POST, PUT, DELETE and etc.
  - And small set of special config fields like runtime or revalidate.
*/
import NextAuth, { AuthOptions } from "next-auth" // NextAuth handler
import { authOptions } from "@/lib/auth"; // Import auth config

const handler = NextAuth(authOptions) // Create NextAuth handler with config

export { handler as GET, handler as POST } // Export handler for both GET and POST requests
