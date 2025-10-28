# Asset Tracking System
IT Asset Tracking System with QR Codes and Microsoft Authentication for Group 15, Swinburne University

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with Microsoft Azure AD
- **Database**: Supabase (PostgreSQL)
- **UI Components**: Heroicons, Lucide React, Framer Motion

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- npm or yarn package manager
- Microsoft Azure AD app registration (for authentication)
- Supabase project (for database)

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd AssetTracking
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env.local` file in the root directory with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Microsoft Azure AD Provider
AZURE_AD_CLIENT_ID=<your-azure-client-id>
AZURE_AD_CLIENT_SECRET=<your-azure-client-secret>
AZURE_AD_TENANT_ID=<your-azure-tenant-id>

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

4. **Configure Azure AD**
   - Go to Azure Portal → App Registrations
   - Create or select your app registration
   - Add redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
   - Create a client secret in "Certificates & secrets"
   - Ensure API permissions include: `User.Read`, `openid`, `profile`, `email`

5. **Set up Supabase**
   - Create a Supabase project
   - Run the database migrations (if provided)
   - Get your project URL and anon key from Project Settings

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
app/                    # Next.js App Router pages
├── api/               # API routes
├── admin/             # Admin pages (dashboard, assets, etc.)
├── profile/           # User profile page
└── page.tsx           # Login page

components/            # React components
├── auth/              # Authentication components
├── LogoutButton.tsx   # Logout component
└── SessionProvider.tsx # Custom session management

lib/                   # Utility libraries
├── supabase.ts        # Supabase client configuration

types/                 # TypeScript type definitions
└── next-auth.d.ts     # NextAuth type extensions
```

## Key Features

- Microsoft Azure AD authentication via NextAuth.js
- Custom session management with Supabase
- Role-based access control (Admin/User)
- Asset management (CRUD operations)
- QR code scanning for assets
- Staff management
- Department and location tracking
- PDF export functionality
- Responsive mobile-first design

## Authentication Flow

1. User clicks "Sign in with Microsoft" on login page
2. NextAuth redirects to Microsoft login
3. After successful authentication, app fetches staff data from Supabase using Microsoft User ID
4. Session is created in database and stored locally
5. User is redirected to dashboard

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | Secret for JWT encryption | Yes |
| `AZURE_AD_CLIENT_ID` | Azure AD application ID | Yes |
| `AZURE_AD_CLIENT_SECRET` | Azure AD client secret | Yes |
| `AZURE_AD_TENANT_ID` | Azure AD tenant/directory ID | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Troubleshooting

**Authentication not working?**
- Verify Azure AD redirect URI is correctly configured
- Check that client secret is valid and not expired
- Ensure all required API permissions are granted in Azure

**Database connection issues?**
- Verify Supabase URL and anon key are correct
- Check if Supabase project is active
- Test connection at `/api/test-connection`

**Session not persisting?**
- Clear browser localStorage
- Check if cookies are enabled
- Verify NEXTAUTH_SECRET is set

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Contributing

This is a university project for Group 15. Please follow the existing code style and conventions.

## License

This project is for educational purposes as part of Swinburne University's Final Year Project.
