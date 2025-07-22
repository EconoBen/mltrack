import { GlobalNav } from '@/components/global-nav';
import { AuthWarningBanner } from '@/components/auth-warning-banner';
import { WelcomeRedirect } from '@/components/welcome-redirect';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <WelcomeRedirect />
      <AuthWarningBanner />
      <GlobalNav />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}