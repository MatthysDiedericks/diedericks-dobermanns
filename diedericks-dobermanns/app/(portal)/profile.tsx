import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  EXPERIENCE_OPTIONS,
  ProfileChip,
  PROPERTY_OPTIONS,
  PURPOSE_OPTIONS,
} from '@/components/portal/ProfileFormOptions';
import { ProfileSection } from '@/components/portal/ProfileSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Config } from '@/constants/config';
import { useClientProfile } from '@/hooks/useClientProfile';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const { profile, save, saving, isComplete, completionPercent } = useClientProfile();

  const email = session?.user?.email ?? (Config.isDemoMode ? 'demo@diedericksdobermanns.com' : '—');

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

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Account" title="My Profile" back={false} />
      <ScrollView className="px-6 pb-12">
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
          <Button label="Sign Out" variant="danger" onPress={() => void onLogout()} fullWidth className="mt-2" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
