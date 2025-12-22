# Supabase Authentication Setup (Simplified)

This is the simplified approach using Supabase Auth completely - no custom backend auth API needed!

## ✅ What's Done

1. **Migration Created** - [migrations/001_create_auth_tables.sql](apps/athli-web-api/migrations/001_create_auth_tables.sql)
   - Creates `user_profiles` table that extends `auth.users`
   - Auto-creates profile when user signs up
   - Stores first_name and last_name

2. **Supabase Auth Provider** - [lib/providers/supabase-auth-provider.tsx](apps/athli-web-app/lib/providers/supabase-auth-provider.tsx)
   - Complete auth context using Supabase client-side
   - Handles sign up, sign in, sign out
   - Email verification with OTP
   - Password reset
   - Google OAuth

3. **Supabase Client** - [lib/supabase/client.ts](apps/athli-web-app/lib/supabase/client.ts)
   - Browser client for Supabase

## 🔧 Required Steps

### 1. Run the Migration in Supabase

Go to your Supabase SQL Editor and run:

```sql
-- Create user_profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_profiles table
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2. Verify Supabase Email Settings

Since you mentioned Supabase automatically sends OTP emails, verify in Supabase Dashboard:
1. Go to **Authentication** → **Email Templates**
2. Confirm "Confirm signup" template is enabled
3. The OTP code will be automatically sent when users register

### 3. Update Auth Pages to Use Supabase Auth

Now all your auth pages should use `useSupabaseAuth()` instead of the custom hooks.

I'll update them now...

### 4. Update Layout to Use SupabaseAuthProvider

Replace `AuthProvider` with `SupabaseAuthProvider` in layout.tsx

### 5. Remove Custom Backend Auth API (Optional)

Since we're using Supabase Auth completely, you can remove:
- `/apps/athli-web-api/src/api/v1/auth/` folder
- `/apps/athli-web-api/src/services/auth.service.ts` (already deleted)
- The auth routes from `/apps/athli-web-api/src/api/v1/routes/index.ts`

## 🔄 Authentication Flow

### Email/Password Registration:
1. User fills registration form
2. Call `signUp(email, password, firstName, lastName)`
3. Supabase creates user in `auth.users`
4. Trigger automatically creates profile in `user_profiles`
5. **Supabase automatically sends OTP email**
6. User redirected to `/auth/verify-email`
7. User enters OTP from email
8. Call `verifyOTP(email, token)`
9. User logged in and redirected to `/home`

### Email/Password Login:
1. User enters credentials
2. Call `signIn(email, password)`
3. Supabase validates and creates session
4. User redirected to `/home`

### Google OAuth:
1. User clicks "Sign in with Google"
2. Call `signInWithGoogle()`
3. Supabase OAuth popup appears
4. User authorizes
5. Redirected to `/auth/callback`
6. Session created automatically
7. Profile created if new user
8. User logged in

### Password Reset:
1. User enters email on forgot password page
2. Call `resetPasswordForEmail(email)`
3. Supabase sends reset email with link
4. User clicks link in email
5. Redirected to `/auth/reset-password` with token
6. User enters new password
7. Call `updatePassword(newPassword)`
8. Password updated, redirected to login

## 📋 Benefits of This Approach

✅ **No custom backend auth API needed**
✅ **Supabase handles all security** (password hashing, token management)
✅ **Built-in OTP email sending**
✅ **Row Level Security** for data access
✅ **OAuth providers** built-in (Google, GitHub, etc.)
✅ **Email templates** customizable in Supabase
✅ **Fewer dependencies** (no bcrypt, jwt, nodemailer needed)
✅ **Less code to maintain**

## 🔒 Security Features

- Passwords automatically hashed by Supabase
- JWT tokens managed by Supabase
- Row Level Security on user_profiles table
- Secure email verification
- Rate limiting built-in
- Session management handled

## 🧪 Testing

1. **Register**: Go to `/auth/register` → Check email for OTP → Verify
2. **Login**: Go to `/auth/login` → Enter credentials
3. **Google OAuth**: Click Google button → Authorize
4. **Forgot Password**: Enter email → Check email → Reset password

## 📝 Next Steps

1. Run the migration
2. Update all auth pages to use `useSupabaseAuth()`
3. Update layout with `SupabaseAuthProvider`
4. Test the complete flow
5. Customize email templates in Supabase (optional)
6. Remove old custom auth code (optional)

This approach is much simpler and leverages Supabase's built-in features!
