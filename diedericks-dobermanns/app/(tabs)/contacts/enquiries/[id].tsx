import { useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ScrollView } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useEnquiry } from '@/hooks/useContacts';

export default function EnquiryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { enquiry, loading, error } = useEnquiry(id ?? '');

  if (loading) {
    return (
      <ScreenContainer>
        <PageHeader title="Enquiry" back />
        <Typography variant="body" className="px-6">Loading…</Typography>
      </ScreenContainer>
    );
  }

  if (error || !enquiry) {
    return (
      <ScreenContainer>
        <PageHeader title="Enquiry" back />
        <Typography variant="body" className="px-6 text-danger">{error ?? 'Enquiry not found'}</Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader title="Enquiry" back />
      <ScrollView className="px-6 pb-12">
        <Card>
          <Typography variant="subtitle">{enquiry.full_name}</Typography>
          <Typography variant="body">{enquiry.email ?? ''}</Typography>
          <Typography variant="body">{enquiry.phone ?? ''}</Typography>
          <Typography variant="body" className="mt-3">{enquiry.subject ?? enquiry.message ?? ''}</Typography>
          <Typography variant="caption" className="mt-3 text-subtle">
            {format(parseISO(enquiry.created_at), 'dd MMM yyyy HH:mm')}
          </Typography>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
