# Supabase Authentication Setup (Enhanced)

This is the complete Supabase Auth setup with extended user profiles and storage integration.

## ✅ What's Implemented

1. **Enhanced Migration** - [migrations/001_create_auth_tables.sql](apps/athli-web-api/migrations/001_create_auth_tables.sql)
   - Creates `user_profiles` table with composite key (id, user_type)
   - Stores user type (coach/client), email, signin method, profile picture
   - Auto-creates profile when user signs up
   - Syncs auth.users changes to user_profiles
   - Handles user deletions with CASCADE
   - Smart profile picture fallback (Google → Custom → null)

2. **Supabase Auth Provider** - [lib/providers/supabase-auth-provider.tsx](apps/athli-web-app/lib/providers/supabase-auth-provider.tsx)
   - Complete auth context with new fields
   - Handles sign up, sign in, sign out
   - Email verification with OTP
   - Password reset
   - Google OAuth with automatic profile picture
   - User type detection (coach by default)

3. **Supabase Client** - [lib/supabase/client.ts](apps/athli-web-app/lib/supabase/client.ts)
   - Browser client for Supabase

## 📋 User Profiles Table Schema

```sql
CREATE TABLE public.user_profiles (
  id UUID NOT NULL,                          -- References auth.users(id)
  user_type VARCHAR(20) NOT NULL,            -- 'coach' or 'client'
  email VARCHAR(255) NOT NULL,               -- User's email
  first_name VARCHAR(100) NOT NULL,          -- First name
  last_name VARCHAR(100) NOT NULL,           -- Last name
  profile_picture_url TEXT,                  -- Google pic or S3 bucket URL
  signin_method VARCHAR(20) NOT NULL,        -- 'email' or 'google'
  is_active BOOLEAN DEFAULT true NOT NULL,   -- For soft deletes
  created_at TIMESTAMP WITH TIME ZONE,       -- Auto-set on creation
  updated_at TIMESTAMP WITH TIME ZONE,       -- Auto-updated on changes

  PRIMARY KEY (id, user_type)                -- Composite key for future dual roles
);
```

### Key Features:
- **Composite Primary Key**: Allows same user to be both coach and client in the future
- **Auto-sync**: Changes to auth.users automatically update user_profiles
- **Smart Defaults**: Profile picture from Google OAuth or null for email signups
- **Signin Method Tracking**: Automatically detects email vs Google OAuth
- **User Type**: Hardcoded to 'coach' for /auth registration, 'client' for future client signup
- **Soft Deletes**: Use `is_active` flag instead of hard deleting

## 🔧 Setup Instructions

### Step 1: Run the Migration in Supabase

Go to your Supabase SQL Editor and paste the entire contents of:
[apps/athli-web-api/migrations/001_create_auth_tables.sql](apps/athli-web-api/migrations/001_create_auth_tables.sql)

This will:
- Drop and recreate the `user_profiles` table
- Create all necessary indexes
- Set up Row Level Security (RLS) policies
- Create utility functions for signin method detection
- Create triggers for auto-profile creation and syncing

### Step 2: Create Profile Pictures Storage Bucket

In Supabase Dashboard:

1. Go to **Storage** → **Create a new bucket**
2. Name: `profile-pictures`
3. **Public bucket**: ✅ Yes (checked)
4. Click **Create bucket**

### Step 3: Configure Storage Bucket Policies

Go to your Supabase SQL Editor and run:

```sql
-- ================================================
-- Storage Bucket Policies for Profile Pictures
-- ================================================

-- Policy 1: Anyone can view profile pictures (public bucket)
CREATE POLICY "Public profile pictures are viewable by anyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Policy 2: Authenticated users can upload their own profile picture
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Users can update their own profile picture
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own profile picture
CREATE POLICY "Users can delete own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 4: Set Up Storage File Structure

Profile pictures should be stored with this path pattern:
```
profile-pictures/{user_id}/{filename}
```

Example: `profile-pictures/550e8400-e29b-41d4-a716-446655440000/avatar.jpg`

### Step 5: Verify Google OAuth Settings

In Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Set **Authorized redirect URIs**:
   ```
   https://<your-project>.supabase.co/auth/v1/callback
   ```
5. In **Google Cloud Console**, ensure these scopes are enabled:
   - `email`
   - `profile`
   - `openid`

### Step 6: Verify Email Settings

In Supabase Dashboard:

1. Go to **Authentication** → **Email Templates**
2. Confirm **"Confirm signup"** template is enabled
3. Customize the template if needed (optional)
4. The OTP code will be automatically sent when users register

## 🔄 Authentication Flows

### Email/Password Registration (Coach):
1. User visits `/auth/register`
2. Fills form with email, password, first name, last name
3. `signUp()` called → creates auth.users entry
4. Trigger creates user_profiles entry:
   - `user_type`: 'coach' (hardcoded for /auth registration)
   - `signin_method`: 'email'
   - `profile_picture_url`: null (can be set later in settings)
5. Supabase sends OTP email automatically
6. User redirected to `/auth/verify-email`
7. User enters OTP → `verifyOTP()` called
8. Email verified → redirected to `/home`

### Google OAuth Registration (Coach):
1. User visits `/auth/register` or `/auth/login`
2. Clicks "Sign in with Google"
3. `signInWithGoogle()` called → Supabase OAuth popup
4. User authorizes Google account
5. Redirected to `/auth/callback`
6. Trigger creates user_profiles entry:
   - `user_type`: 'coach'
   - `signin_method`: 'google'
   - `profile_picture_url`: Google profile picture URL (automatic!)
   - `first_name`, `last_name`: from Google profile
7. Session created automatically
8. User redirected to `/home`

### Email/Password Login:
1. User enters credentials at `/auth/login`
2. `signIn()` called
3. Checks if email is verified
4. If verified → creates session → redirected to `/home`
5. If not verified → error shown

### Password Reset:
1. User clicks "Forgot Password" → `/auth/forgot-password`
2. Enters email → `resetPasswordForEmail()` called
3. Supabase sends reset email with link
4. User clicks link → redirected to `/auth/reset-password`
5. Enters new password → `updatePassword()` called
6. Password updated → redirected to `/auth/login`

## 🖼️ Profile Picture Management

### For Google OAuth Users:
- Profile picture is **automatically set** from Google account
- Stored in `profile_picture_url` field
- Updates automatically when auth.users metadata changes

### For Email Users:
- Initial `profile_picture_url` is `null`
- User can upload custom picture from Settings page (to be implemented)
- Upload process:
  1. Select image file
  2. Upload to `profile-pictures/{user_id}/{filename}` in Supabase Storage
  3. Get public URL
  4. Update `auth.users.raw_user_meta_data.profile_picture_url`
  5. Trigger automatically syncs to `user_profiles.profile_picture_url`

### Example Upload Code (for future Settings page):

```typescript
async function uploadProfilePicture(file: File) {
  const supabase = createClient();
  const user = await supabase.auth.getUser();

  if (!user.data.user) throw new Error('Not authenticated');

  const userId = user.data.user.id;
  const fileExt = file.name.split('.').pop();
  const fileName = `avatar.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('profile-pictures')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(filePath);

  // Update user metadata (this will trigger sync to user_profiles)
  const { error: updateError } = await supabase.auth.updateUser({
    data: { profile_picture_url: urlData.publicUrl }
  });

  if (updateError) throw updateError;

  return urlData.publicUrl;
}
```

## 🔒 Security Features

### Row Level Security (RLS):
- ✅ Users can only read their own profile(s)
- ✅ Users can only update their own profile(s)
- ✅ System can insert profiles (via SECURITY DEFINER trigger)
- ✅ Users can delete their own profile(s)

### Storage Security:
- ✅ Profile pictures stored in user-specific folders
- ✅ Public bucket allows viewing (necessary for profile pics)
- ✅ Only file owner can upload/update/delete their pictures
- ✅ Authenticated users only for uploads

### Auth Security:
- ✅ Passwords automatically hashed by Supabase
- ✅ JWT tokens managed by Supabase
- ✅ Email verification required before login
- ✅ Rate limiting built-in
- ✅ OAuth handled securely by Supabase

## 🔄 Data Synchronization

### Automatic Syncs:

1. **On User Creation** (`on_auth_user_created` trigger):
   - Creates user_profiles entry
   - Extracts metadata from auth.users
   - Sets appropriate defaults

2. **On User Update** (`on_auth_user_updated` trigger):
   - Syncs email changes
   - Syncs first_name, last_name changes
   - Syncs profile_picture_url changes
   - Only triggers when relevant fields change

3. **On User Deletion**:
   - Cascade deletes from user_profiles (ON DELETE CASCADE)
   - Automatic cleanup

### Manual Updates:

To update user profile from frontend:

```typescript
// Update auth.users metadata (recommended - triggers auto-sync)
await supabase.auth.updateUser({
  data: {
    first_name: 'New First',
    last_name: 'New Last',
    profile_picture_url: 'https://...'
  }
});

// OR update user_profiles directly (also works)
await supabase
  .from('user_profiles')
  .update({
    first_name: 'New First',
    last_name: 'New Last'
  })
  .eq('id', user.id)
  .eq('user_type', 'coach');
```

## 📊 Database Functions

The migration creates these utility functions:

1. **`get_signin_method(jsonb)`** - Detects signin method from metadata
2. **`get_user_type(jsonb)`** - Determines user type (coach/client)
3. **`get_profile_picture_url(jsonb)`** - Smart fallback for profile pictures
4. **`handle_new_user()`** - Trigger function for new user creation
5. **`handle_user_update()`** - Trigger function for auth.users updates
6. **`update_updated_at_column()`** - Auto-updates updated_at timestamp

## 🎯 User Type Logic

### Current Implementation:
- All `/auth/register` users → `user_type = 'coach'`
- Hardcoded in the `signUp()` function
- Set in `user_metadata.user_type` during registration

### Future Client Registration:
When you add client registration:

```typescript
// In client registration flow
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      first_name: firstName,
      last_name: lastName,
      user_type: 'client', // ← Set to client
    },
  },
});
```

### Composite Key Benefits:
The `(id, user_type)` composite primary key allows:
- Same person to be both coach AND client
- Separate profiles for each role
- Future flexibility for role-based access

Example:
```
| id (UUID)      | user_type | email          | ... |
|----------------|-----------|----------------|-----|
| abc-123...     | coach     | john@email.com | ... |
| abc-123...     | client    | john@email.com | ... |
```

## 🧪 Testing Checklist

- [ ] **Email Registration**: Register with email → Receive OTP → Verify → Login
- [ ] **Google OAuth**: Click Google button → Authorize → Auto-login with profile pic
- [ ] **Email Login**: Login with verified email account
- [ ] **Password Reset**: Request reset → Check email → Reset password → Login
- [ ] **Profile Picture (Google)**: Verify Google users have profile picture
- [ ] **Profile Picture (Email)**: Verify email users have null profile picture
- [ ] **User Type**: Verify all /auth registrations create 'coach' type
- [ ] **Signin Method**: Verify email users show 'email', Google users show 'google'
- [ ] **Data Sync**: Update auth.users → Verify user_profiles syncs
- [ ] **Storage Access**: Try uploading file to profile-pictures bucket

## 📝 Next Steps

1. ✅ Run the migration SQL script
2. ✅ Create profile-pictures storage bucket
3. ✅ Configure storage policies
4. ✅ Enable Google OAuth provider
5. ✅ Test complete auth flow
6. ⏳ Implement profile picture upload in Settings page
7. ⏳ Add client registration flow (future)
8. ⏳ Build user profile page showing all fields

## 🚀 Suggested Improvements

### Additional Features to Consider:

1. **Email Change Verification**
   - Add email change flow with verification
   - Update user_profiles.email on verification

2. **Profile Completeness Indicator**
   - Add computed field for profile completeness %
   - Prompt users to complete profile

3. **Multi-Factor Authentication (MFA)**
   - Supabase supports MFA out of the box
   - Add MFA enrollment flow

4. **Session Management**
   - Show active sessions
   - Allow users to revoke sessions

5. **Account Deletion**
   - Add account deletion flow
   - Soft delete with `is_active = false` first
   - Hard delete after confirmation period

6. **Audit Logging**
   - Log profile changes to separate audit table
   - Track when email, password, profile updated

7. **Profile Picture Validation**
   - Validate file size (e.g., max 2MB)
   - Validate file type (jpg, png only)
   - Image compression before upload

8. **Default Avatar Generation**
   - Generate default avatar with initials
   - Use services like DiceBear or UI Avatars
   - Example: `https://ui-avatars.com/api/?name=John+Doe`

## 🔗 TypeScript Types

Define these types in your frontend:

```typescript
// apps/athli-web-app/lib/types/auth.types.ts
export type UserType = 'coach' | 'client';
export type SigninMethod = 'email' | 'google';

export interface UserProfile {
  id: string;
  userType: UserType;
  email: string;
  firstName: string;
  lastName: string;
  profilePictureUrl: string | null;
  signinMethod: SigninMethod;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  profile: UserProfile;
  supabaseUser: User; // from @supabase/supabase-js
}
```

## 🆘 Troubleshooting

### Issue: Profile not created after signup
- **Check**: RLS policies allow INSERT via trigger
- **Check**: Trigger `on_auth_user_created` exists
- **Check**: Function `handle_new_user()` has SECURITY DEFINER

### Issue: Google profile picture not showing
- **Check**: OAuth provider is enabled
- **Check**: Scopes include 'profile'
- **Check**: Trigger extracts 'avatar_url' or 'picture' from metadata

### Issue: Profile not syncing after update
- **Check**: Trigger `on_auth_user_updated` exists
- **Check**: You're updating auth.users.raw_user_meta_data
- **Check**: Function `handle_user_update()` has SECURITY DEFINER

### Issue: Can't upload profile picture
- **Check**: Bucket 'profile-pictures' exists
- **Check**: Storage policies are configured
- **Check**: User is authenticated
- **Check**: File path follows `{user_id}/{filename}` pattern

### Issue: User type is always 'coach'
- **Expected**: This is correct for /auth registration
- **Future**: Client registration will set user_type = 'client'

---

**This setup provides a robust, scalable authentication system with minimal custom code!**
