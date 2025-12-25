# Coach Company Setup Guide

To enable company information and branding (logos), you need to create a new storage bucket in Supabase and run the migration script.

## 1. Create Supabase Storage Bucket

Follow these steps to create the `coach-company` bucket:

1.  Log in to your **Supabase Dashboard**.
2.  Navigate to the **Storage** section in the left sidebar.
3.  Click the **"New bucket"** button.
4.  Enter the name: `coach-company`.
5.  Set the bucket to **Public** (`✅ Public bucket`). This allows anyone to view the company logos via their public URLs.
6.  Click **"Save"**.

## 2. Run Migration Script

Once the bucket is created, run the following SQL migration script in your Supabase SQL Editor:

```sql
-- File: apps/athli-web-api/migrations/008_create_coach_company_information.sql
```

You can copy the contents of `apps/athli-web-api/migrations/008_create_coach_company_information.sql` and paste them into the SQL Editor.

## 3. Storage Structure

Company logos will be stored using the following structure:
`coach-company/{coach_id}/{filename}`

The RLS policies included in the migration script ensure that:
- Anyone can view the logos.
- Coaches can only upload/update/delete files within their own folder (`{coach_id}/`).
