# Authentication Setup Guide

MLTrack includes built-in GitHub OAuth authentication for the web UI. This guide will help you set it up.

## Quick Start

### 1. Create a GitHub OAuth App

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the following:
   - **Application name**: MLTrack (or your preferred name)
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and generate a new **Client Secret**

### 2. Configure Environment Variables

Create a `.env.local` file in the `ui/` directory:

```bash
# GitHub OAuth
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here

# Optional: Email provider for magic links
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your_email@gmail.com
EMAIL_SERVER_PASSWORD=your_app_password
EMAIL_FROM=MLTrack <noreply@mltrack.com>
```

To generate a secure `NEXTAUTH_SECRET`, run:
```bash
openssl rand -base64 32
```

### 3. Enable Authentication

Authentication is implemented but disabled by default for development. To enable it:

1. Open `ui/middleware.ts`
2. Comment out line 16: `// return true;`
3. Uncomment line 19: `return !!token;`

```typescript
// BEFORE (Development mode - no auth required)
return true;

// AFTER (Production mode - auth required)
// return true;
return !!token;
```

### 4. Set Up Database (Optional)

If you want to persist user sessions:

1. Install Prisma dependencies (already included)
2. Set up your database connection in `.env.local`:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/mltrack"
   ```
3. Run Prisma migrations:
   ```bash
   cd ui
   npx prisma migrate dev
   ```

## Features

### Protected Routes
Once enabled, all routes except `/auth/*` pages require authentication.

### User Information
Access user data in your components:

```typescript
import { useSession } from 'next-auth/react';

export function MyComponent() {
  const { data: session } = useSession();
  
  if (session) {
    console.log(session.user.name);     // GitHub name
    console.log(session.user.email);    // GitHub email
    console.log(session.user.username); // GitHub username
    console.log(session.user.image);    // Avatar URL
  }
}
```

### Sign In/Out
- Sign in page: `/auth/signin`
- Sign out: Use the user menu in the top navigation
- Magic link verification: `/auth/verify-request`

### User Preferences
New users automatically get default preferences created:
- Default view: table
- Show others' runs: true
- Email notifications: true

## Production Deployment

For production deployment:

1. Update the GitHub OAuth App URLs:
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/api/auth/callback/github`

2. Update environment variables:
   ```bash
   NEXTAUTH_URL=https://your-domain.com
   ```

3. Use a production database (PostgreSQL recommended)

4. Enable authentication in `middleware.ts`

## Troubleshooting

### Common Issues

1. **"Client ID is required" error**
   - Ensure `GITHUB_ID` is set in `.env.local`
   - Restart the Next.js dev server after adding env variables

2. **Callback URL mismatch**
   - Make sure the callback URL in GitHub matches exactly
   - Include the port number for localhost (`:3000`)

3. **Session not persisting**
   - Check your `NEXTAUTH_SECRET` is set
   - Ensure database is properly configured if using database sessions

### Development Tips

- In development, magic links are logged to the console instead of sent via email
- You can test authentication flow without setting up email
- The user menu component shows sign-in state in the top navigation

## Security Considerations

1. **Always use HTTPS in production**
2. **Keep your secrets secure** - never commit `.env.local`
3. **Rotate secrets regularly**
4. **Use strong NEXTAUTH_SECRET** (32+ characters)
5. **Configure CORS and CSP headers** for additional security