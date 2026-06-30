import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AdminDashboardContent } from '@/components/dashboard/AdminDashboardContent';

export default function AdminDashboard() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Admin" title="Dashboard" back={false} />
      <AdminDashboardContent />
    </ScreenContainer>
  );
}
