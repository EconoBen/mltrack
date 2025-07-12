import { GlobalNav } from '@/components/global-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GlobalNav />
      {children}
    </>
  );
}