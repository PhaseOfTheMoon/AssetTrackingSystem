# User Registration & Approval System - Implementation Guide

## Overview
This document describes the new user registration and approval system implemented for the Asset Tracking System.

## System Architecture

### Authentication Flow (Option A - Hybrid Approach)

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW USER REGISTRATION                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. User visits /register (public page)                          │
│ 2. Fills form: name, email, mobile, department                  │
│ 3. System auto-generates Staff ID (S001, S002, etc.)           │
│ 4. Saved to database with status='pending'                      │
│ 5. microsoft_user_id = null (will be filled at first login)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN APPROVAL                              │
├─────────────────────────────────────────────────────────────────┤
│ 1. Admin visits /admin/staff/approvals                          │
│ 2. Views pending registrations                                  │
│ 3. Approves or rejects each registration                        │
│ 4. Status updated to 'approved' or 'rejected'                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      USER LOGIN                                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. User clicks "Sign in with Microsoft"                         │
│ 2. Azure AD authenticates user                                  │
│ 3. Returns: email + microsoft_user_id (OID)                     │
│ 4. System queries staff table by EMAIL                          │
│ 5. Checks status = 'approved'                                   │
│ 6. IF microsoft_user_id is null → UPDATE it (first login)      │
│ 7. Grant access based on role (admin/staff)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Database Changes

### New Columns Added to `staff` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `status` | VARCHAR(20) | 'pending' | Registration status: 'pending', 'approved', 'rejected' |
| `role` | VARCHAR(20) | 'staff' | User role: 'admin', 'staff' |

### Modified Columns

| Column | Change | Reason |
|--------|--------|--------|
| `microsoft_user_id` | Now nullable | Will be populated at first login |

### New Database Function

**`get_next_staff_id()`**
- Auto-generates sequential staff IDs (S001, S002, S003...)
- Prevents duplicates
- Handles gaps in sequence

## Files Created

### 1. Database Migration
- **File:** `database-updates.sql`
- **Purpose:** SQL script to update Supabase schema
- **Action Required:** Run this in Supabase SQL Editor

### 2. Registration Page
- **Route:** `/register`
- **File:** `app/register/page.tsx`
- **Access:** Public (no authentication required)
- **Features:**
  - Form validation
  - Email format check
  - Duplicate email detection
  - Auto-generated Staff ID display

### 3. Registration API
- **Endpoint:** `POST /api/auth/register`
- **File:** `app/api/auth/register/route.ts`
- **Functionality:**
  - Validates input
  - Checks for existing email
  - Auto-generates Staff ID
  - Creates pending registration

### 4. Admin Approval Page
- **Route:** `/admin/staff/approvals`
- **File:** `app/admin/staff/approvals/page.tsx`
- **Access:** Authenticated admins only
- **Features:**
  - View pending registrations
  - Approve/reject with confirmation
  - Real-time list updates
  - Formatted timestamps

### 5. Approval APIs
- **Endpoints:**
  - `GET /api/staff/pending` - Get pending registrations
  - `POST /api/staff/approve` - Approve registration
  - `POST /api/staff/reject` - Reject registration
- **Files:**
  - `app/api/staff/pending/route.ts`
  - `app/api/staff/approve/route.ts`
  - `app/api/staff/reject/route.ts`

### 6. Email-based Login API
- **Endpoint:** `POST /api/staff/get-by-email`
- **File:** `app/api/staff/get-by-email/route.ts`
- **Functionality:**
  - Looks up staff by email
  - Checks approval status
  - Auto-captures microsoft_user_id on first login
  - Returns appropriate error messages

### 7. Updated Login Page
- **Route:** `/` (homepage)
- **File:** `app/page.tsx`
- **Changes:**
  - Match by email instead of microsoft_user_id
  - Improved error messages
  - Added "Register for Access" link

## Setup Instructions

### Step 1: Run Database Migration

1. Open Supabase SQL Editor
2. Open the file: `database-updates.sql`
3. Copy and paste into SQL Editor
4. Click "Run"
5. Verify success:
   ```sql
   SELECT * FROM staff LIMIT 5;
   SELECT get_next_staff_id();
   ```

### Step 2: Test Registration Flow

1. Visit `http://localhost:3000/register`
2. Fill in the form with test data:
   - Name: Test User
   - Email: test@swin.edu.my
   - Mobile: 0123456789
   - Department: IT
3. Submit and note the auto-generated Staff ID
4. Check Supabase: registration should be in `staff` table with `status='pending'`

### Step 3: Test Admin Approval

1. Login as an existing admin
2. Visit `/admin/staff/approvals`
3. You should see the pending registration
4. Click "Approve"
5. Verify status changed to 'approved' in database

### Step 4: Test User Login

1. Go to login page
2. Click "Sign in with Microsoft"
3. Use the email you registered with
4. Should successfully login and capture microsoft_user_id
5. Verify microsoft_user_id is now filled in database

## Error Scenarios Handled

### Registration Page
- ✅ Email already registered (approved)
- ✅ Email pending approval
- ✅ Email previously rejected
- ✅ Invalid email format
- ✅ Missing required fields

### Login Page
- ✅ Email not registered → "Please register first"
- ✅ Registration pending → "Waiting for approval"
- ✅ Registration rejected → "Contact administrator"
- ✅ First time login → Auto-capture microsoft_user_id

## User Roles

### Staff (Default)
- Can scan and update assets
- Can assign assets to owners
- Can add new assets when scanning unknown barcodes

### Admin
- All staff permissions
- Can approve/reject registrations
- Can manage users
- Can perform CRUD operations on assets

## Security Features

1. **Email Verification via Azure AD**
   - Users must authenticate with Microsoft
   - Email returned by Azure AD is trusted

2. **Admin Approval Required**
   - No automatic access
   - Admin manually reviews each registration

3. **Status-based Access Control**
   - Only 'approved' users can login
   - Pending/rejected users blocked

4. **Microsoft User ID Binding**
   - Captured at first login
   - Prevents impersonation
   - Can be used for future lookups

## Future Migration Path to Full AAD

When you get AAD API access, you can migrate to Option B:

### Changes Required:
1. Query AAD for roles instead of local database
2. Auto-sync user data from AAD periodically
3. Remove manual approval (or keep as additional layer)
4. Use AAD groups for role management

### Code Already Prepared For:
- The `role` column structure matches AAD role structure
- Email-based matching works with AAD
- microsoft_user_id is already stored for AAD queries

## Troubleshooting

### Issue: Staff ID not auto-generating
**Solution:** Check that `get_next_staff_id()` function exists:
```sql
SELECT get_next_staff_id();
```

### Issue: Login fails with "Staff not found"
**Solution:**
1. Check email matches exactly (case-sensitive)
2. Verify status = 'approved' in database
3. Check Azure AD is returning email correctly

### Issue: microsoft_user_id not being captured
**Solution:**
1. Check NextAuth is configured correctly
2. Verify Azure AD scope includes "openid profile email"
3. Check route.ts line 27 for OID extraction

### Issue: Registration form shows "already exists" but user can't login
**Solution:**
1. Check status in database - might be 'rejected'
2. Admin needs to change status to 'approved'
3. Or delete and re-register

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Registration page loads at /register
- [ ] Registration form validates all fields
- [ ] Staff ID auto-generates correctly
- [ ] Pending registrations appear in /admin/staff/approvals
- [ ] Approve button changes status to 'approved'
- [ ] Reject button changes status to 'rejected'
- [ ] Login with pending account shows "waiting for approval"
- [ ] Login with approved account succeeds
- [ ] microsoft_user_id is captured on first login
- [ ] Subsequent logins work correctly
- [ ] "Register for Access" link appears on login page

## Client Requirements Alignment

✅ **Requirement 2 - User Authentication & Access Control**
- NextAuth.js with Azure AD ✓
- Manual admin user addition ✓
- Ready for future AAD API integration ✓

✅ **Requirement 7 - Admin Workflow**
- Admin manages users (register/approve) ✓
- Admin can grant access ✓
- Role-based access control ✓

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify Supabase connection
3. Check Azure AD configuration
4. Review this guide's troubleshooting section

---

**Implementation Date:** 2025-11-02
**System Version:** Asset Tracking System v1.0
**Authentication Method:** Hybrid (Option A)
