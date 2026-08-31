import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  EXPERIENCE_OPTIONS,
  ProfileChip,
  PROPERTY_OPTIONS,
  PURPOSE_OPTIONS,
} from '@/components/portal/ProfileFormOptions';
import { MarketingConsentToggle } from '@/components/portal/MarketingConsentToggle';
import { GuestAccessBanner } from '@/components/portal/GuestAccessBanner';
import { ProfileSection } from '@/components/portal/ProfileSection';
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal';
import { ReportProblemLink } from '@/components/portal/ReportProblemLink';
import { AccountSafetyCard } from '@/components/portal/AccountSafetyCard';
import { OptionalPasswordHint } from '@/components/portal/OptionalPasswordHint';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Config } from '@/constants/config';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useGuestAccess } from '@/hooks/useGuestAccess';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { useAuthStore } from '@/stores/authStore';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const { profile, save, saving, isComplete, completionPercent } = useClientProfile();
  const guest = useGuestAccess();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const email = session?.user?.email ?? (Config.isDemoMode ? 'demo@diedericksdobermanns.com' : '—');
  // Deletion is a client-only self-service flow — staff accounts never reach this row
  // client-side (the Edge Function is the real 403 guard against staff self-deletion).
  const canDeleteAccount = profile?.role === 'client';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [experience, setExperience] = useState('');
  const [currentPets, setCurrentPets] = useState('');
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [propertyType, setPropertyType] = useState('');
  const [hasFencing, setHasFencing] = useState<boolean | null>(null);
  const [purpose, setPurpose] = useState<string[]>([]);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('');
  const [vetPractice, setVetPractice] = useState('');
  const [vetName, setVetName] = useState('');
  const [vetPhone, setVetPhone] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setWhatsapp(profile.whatsapp_number ?? '');
    setCountry(profile.country ?? '');
    setAddress(profile.address ?? '');
    setExperience(profile.dog_experience ?? '');
    setCurrentPets(profile.current_pets ?? '');
    setHasChildren(profile.has_children);
    setPropertyType(profile.property_type ?? '');
    setHasFencing(profile.has_fencing);
    setPurpose(profile.purpose ?? []);
    setEmergencyName(profile.emergency_contact_name ?? '');
    setEmergencyPhone(profile.emergency_contact_phone ?? '');
    setEmergencyRel(profile.emergency_contact_relationship ?? '');
    setVetPractice(profile.vet_practice ?? '');
    setVetName(profile.vet_name ?? '');
    setVetPhone(profile.vet_phone ?? '');
  }, [profile]);

  function togglePurpose(p: string) {
    setPurpose((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function onLogout() {
    await logout();
    router.replace('/(public)/login');
  }

  async function onAccountDeleted() {
    await logout();
    router.replace({
      pathname: '/(public)/login',
      params: { message: 'Your account has been deleted.' },
    });
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Account" title="My Profile" back={false} />
      <ScrollView className="px-6 pb-12">
        <GuestAccessBanner access={guest} />
        <Pressable
          onPress={() => router.push('/(portal)/profile/access' as never)}
          className="mb-4 rounded-xl border border-gold/30 bg-gold/10 p-4"
        >
          <Typography variant="subtitle" className="text-gold">
            Portal access
          </Typography>
          <Typography variant="caption" className="mt-1 text-subtle">
            {guest.isGuest
              ? 'You have guest access on this portal.'
              : 'Add a partner or handler — they get their own sign-in.'}
          </Typography>
        </Pressable>
        {isComplete ? (
          <View className="mb-4 rounded-xl border border-success/40 bg-success/10 p-4">
            <Typography variant="body" className="text-success">
              ✓ Profile complete — thank you, {firstName}
            </Typography>
          </View>
        ) : (
          <View className="mb-4 rounded-xl border border-gold/40 bg-gold/10 p-4">
            <Typography variant="label" className="text-gold">
              ⚠ Your profile is incomplete
            </Typography>
            <Typography variant="caption" className="mt-1 text-subtle">
              Complete your details to unlock all features and allow us to serve you better.
            </Typography>
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <View className="h-full bg-gold" style={{ width: `${completionPercent}%` }} />
            </View>
            <Typography variant="caption" className="mt-1 text-subtle">
              {completionPercent}% complete
            </Typography>
          </View>
        )}

        <ProfileSection
          title="PERSONAL DETAILS"
          saving={saving}
          onSave={() =>
            void save({
              full_name: fullName.trim(),
              phone: phone.trim(),
              whatsapp_number: whatsapp.trim() || undefined,
              country: country.trim(),
              address: address.trim(),
            })
          }
        >
          <Input label="Full Name *" value={fullName} onChangeText={setFullName} />
          <Input label="Email" value={email} editable={false} />
          <Input label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
          <Input label="Country / Region *" value={country} onChangeText={setCountry} />
          <Input label="Address *" value={address} onChangeText={setAddress} multiline numberOfLines={3} />
        </ProfileSection>

        <ProfileSection
          title="DOBERMANN EXPERIENCE"
          saving={saving}
          onSave={() =>
            void save({
              dog_experience: experience,
              current_pets: currentPets.trim() || undefined,
              has_children: hasChildren ?? undefined,
              property_type: propertyType || undefined,
              has_fencing: hasFencing ?? undefined,
            })
          }
        >
          <Typography variant="caption" className="mb-2 text-subtle">
            Your experience
          </Typography>
          <View className="flex-row flex-wrap">
            {EXPERIENCE_OPTIONS.map((o) => (
              <ProfileChip
                key={o.value}
                label={o.label}
                active={experience === o.value}
                onPress={() => setExperience(o.value)}
              />
            ))}
          </View>
          <Input label="Current pets" value={currentPets} onChangeText={setCurrentPets} />
          <Typography variant="caption" className="mb-2 mt-2 text-subtle">
            Children at home
          </Typography>
          <View className="mb-3 flex-row gap-2">
            <ProfileChip label="Yes" active={hasChildren === true} onPress={() => setHasChildren(true)} />
            <ProfileChip label="No" active={hasChildren === false} onPress={() => setHasChildren(false)} />
          </View>
          <Typography variant="caption" className="mb-2 text-subtle">
            Property type
          </Typography>
          <View className="mb-3 flex-row flex-wrap">
            {PROPERTY_OPTIONS.map((p) => (
              <ProfileChip key={p} label={p} active={propertyType === p} onPress={() => setPropertyType(p)} />
            ))}
          </View>
          <Typography variant="caption" className="mb-2 text-subtle">
            Security fencing
          </Typography>
          <View className="flex-row gap-2">
            <ProfileChip label="Yes" active={hasFencing === true} onPress={() => setHasFencing(true)} />
            <ProfileChip label="No" active={hasFencing === false} onPress={() => setHasFencing(false)} />
          </View>
        </ProfileSection>

        <ProfileSection title="YOUR PURPOSE" saving={saving} onSave={() => void save({ purpose })}>
          <Typography variant="caption" className="mb-2 text-subtle">
            Why are you interested in a Dobermann? (select all that apply)
          </Typography>
          <View className="flex-row flex-wrap">
            {PURPOSE_OPTIONS.map((p) => (
              <ProfileChip key={p} label={p} active={purpose.includes(p)} onPress={() => togglePurpose(p)} />
            ))}
          </View>
        </ProfileSection>

        <ProfileSection
          title="EMERGENCY CONTACT"
          saving={saving}
          onSave={() =>
            void save({
              emergency_contact_name: emergencyName.trim() || undefined,
              emergency_contact_phone: emergencyPhone.trim() || undefined,
              emergency_contact_relationship: emergencyRel.trim() || undefined,
            })
          }
        >
          <Input label="Name" value={emergencyName} onChangeText={setEmergencyName} />
          <Input label="Phone" value={emergencyPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" />
          <Input label="Relationship" value={emergencyRel} onChangeText={setEmergencyRel} />
        </ProfileSection>

        <ProfileSection
          title="VETERINARIAN"
          saving={saving}
          onSave={() =>
            void save({
              vet_practice: vetPractice.trim() || undefined,
              vet_name: vetName.trim() || undefined,
              vet_phone: vetPhone.trim() || undefined,
            })
          }
        >
          <Input label="Practice name" value={vetPractice} onChangeText={setVetPractice} />
          <Input label="Vet's name" value={vetName} onChangeText={setVetName} />
          <Input label="Phone" value={vetPhone} onChangeText={setVetPhone} keyboardType="phone-pad" />
        </ProfileSection>

        <MarketingConsentToggle initial={Boolean(profile?.marketing_opt_in)} />

        <Typography variant="label" className="mb-2 text-gold">
          ACCOUNT
        </Typography>
        <View className="mb-6 rounded-2xl border border-gold/15 bg-black-rich p-4">
          <View className="flex-row justify-between border-b border-gold/10 py-3">
            <Typography variant="caption">Role</Typography>
            <Typography variant="body">{profile?.role ?? 'client'}</Typography>
          </View>
          <View className="flex-row justify-between py-3">
            <Typography variant="caption">Member since</Typography>
            <Typography variant="body">{formatKennelDate(profile?.created_at)}</Typography>
          </View>
          {session?.user?.last_sign_in_at ? (
            <View className="flex-row justify-between border-t border-gold/10 py-3">
              <Typography variant="caption">Last signed in</Typography>
              <Typography variant="body">
                {new Date(session.user.last_sign_in_at).toLocaleString()}
              </Typography>
            </View>
          ) : null}
          <Button label="Sign Out" variant="danger" onPress={() => void onLogout()} fullWidth className="mt-2" />

          {canDeleteAccount ? (
            <Pressable onPress={() => setDeleteModalVisible(true)} className="mt-4 items-center">
              <Typography variant="caption" className="text-danger underline">
                Delete Account
              </Typography>
            </Pressable>
          ) : null}
        </View>

        <OptionalPasswordHint />
        <AccountSafetyCard email={email} />

        <ReportProblemLink />
        <Typography variant="caption" className="mb-6 text-center text-subtle">
          v{APP_VERSION}
        </Typography>
      </ScrollView>

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onDeleted={() => void onAccountDeleted()}
      />
    </ScreenContainer>
  );
}
