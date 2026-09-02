import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { ContactLinkedSection } from '@/components/contacts/ContactLinkedSection';
import { CreateSaleButton } from '@/components/contracts/CreateSaleButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useContact } from '@/hooks/useContacts';
import { useContactLinks } from '@/hooks/useContactLinks';
import { openWhatsApp } from '@/lib/social';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View className="border-b border-gold/10 py-2">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="body" className="mt-1">
        {value || '—'}
      </Typography>
    </View>
  );
}

export default function AdminContactDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const contactId = id ?? '';
  const { contact, loading, error, refresh } = useContact(contactId);
  const { links, loading: linksLoading, error: linksError, refresh: refreshLinks } =
    useContactLinks(contactId, {
      email: contact?.email ?? null,
      userId: contact?.user_id ?? null,
    });

  const onRefresh = () => {
    void refresh();
    void refreshLinks();
  };

  if (loading && !contact) {
    return (
      <ScreenContainer>
        <PageHeader title="Contact" />
        <ActivityIndicator color={Colors.gold} className="mt-8" />
      </ScreenContainer>
    );
  }

  if (error || !contact) {
    return (
      <ScreenContainer>
        <PageHeader title="Contact" />
        <Typography variant="body" className="px-6 text-danger">
          {error ?? 'Contact not found.'}
        </Typography>
      </ScreenContainer>
    );
  }

  const typeLabel = (contact.contact_type ?? 'prospect').toUpperCase();
  const wa = contact.whatsapp_number ?? contact.phone;

  return (
    <ScreenContainer scroll={false}>
      <PageHeader title={contact.full_name} eyebrow="Contact" />
      <ScrollView
        className="px-6 pb-12"
        refreshControl={
          <RefreshControl
            refreshing={loading || linksLoading}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
          />
        }
      >
        <View className="mb-4 flex-row flex-wrap items-center gap-2">
          <View className="rounded-full bg-gold/15 px-3 py-1">
            <Typography variant="caption" className="text-gold">
              {typeLabel}
            </Typography>
          </View>
          {contact.user_id ? (
            <Typography variant="caption" className="text-gold">
              📱 App user
            </Typography>
          ) : null}
        </View>

        <Card>
          <Field label="Phone" value={contact.phone} />
          <Field label="WhatsApp" value={contact.whatsapp_number} />
          <Field label="Email" value={contact.email} />
          <Field label="City" value={[contact.city, contact.country].filter(Boolean).join(', ')} />
          <Field label="Company" value={contact.company} />
          <Field label="Address" value={contact.address} />
          <Field
            label="Marketing opt-in"
            value={contact.marketing_opt_in ? 'yes' : 'no'}
          />
        </Card>

        <Card className="mt-4 flex-row justify-around py-4">
          <Pressable onPress={() => wa && openWhatsApp(wa)} disabled={!wa} className="items-center gap-1">
            <Ionicons name="logo-whatsapp" size={26} color={Colors.gold} />
            <Typography variant="caption">WhatsApp</Typography>
          </Pressable>
          <Pressable
            onPress={() => contact.email && Linking.openURL(`mailto:${contact.email}`)}
            disabled={!contact.email}
            className="items-center gap-1"
          >
            <Ionicons name="mail" size={26} color={Colors.gold} />
            <Typography variant="caption">Email</Typography>
          </Pressable>
          <Pressable
            onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone}`)}
            disabled={!contact.phone}
            className="items-center gap-1"
          >
            <Ionicons name="call" size={26} color={Colors.gold} />
            <Typography variant="caption">Call</Typography>
          </Pressable>
        </Card>

        {contact.user_id ? (
          <Button
            label="View App Profile"
            variant="outline"
            className="mt-4"
            onPress={() =>
              router.push({ pathname: '/(admin)/clients/[id]', params: { id: contact.user_id! } } as never)
            }
          />
        ) : null}

        {contact.notes ? (
          <View className="mt-6">
            <Typography variant="label" className="mb-2 text-gold">
              NOTES
            </Typography>
            <Card>
              <Typography variant="body">{contact.notes}</Typography>
            </Card>
          </View>
        ) : null}

        {linksError ? (
          <Typography variant="body" className="mt-4 text-danger">
            {linksError}
          </Typography>
        ) : null}

        <ContactLinkedSection title="Quotes" rows={links.quotes} empty="No quotes linked." />
        <ContactLinkedSection title="Invoices" rows={links.invoices} empty="No invoices linked." />
        <ContactLinkedSection title="Contracts" rows={links.contracts} empty="No contracts linked." />
        <ContactLinkedSection title="Dogs" rows={links.dogs} empty="No dogs linked yet." />
        {links.dogs.map((d) => (
          <View key={`sale-${d.id}`} className="mt-2">
            <CreateSaleButton dogId={d.id} contactId={contactId} label={`Agreement for ${d.label}`} />
          </View>
        ))}
        <ContactLinkedSection
          title="Applications"
          rows={links.applications}
          empty="No applications linked."
        />
      </ScrollView>
    </ScreenContainer>
  );
}
