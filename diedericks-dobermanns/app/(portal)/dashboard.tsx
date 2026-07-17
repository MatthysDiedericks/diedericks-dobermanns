import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ExpectedLittersSection } from '@/components/portal/ExpectedLittersSection';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useMyApplications, usePortalDogs } from '@/hooks/usePortal';
import { useAuthStore } from '@/stores/authStore';

const BASE_QUICK_LINKS = [
  { href: '/(portal)/documents', icon: 'folder-open' as const, label: 'Documents' },
  { href: '/(portal)/contracts', icon: 'create' as const, label: 'Contracts' },
] as const;

const PROFILE_LINK = {
  href: '/(portal)/profile',
  icon: 'person-circle-outline' as const,
  label: 'My Profile',
} as const;

const APPLICATION_LINK = {
  href: '/(portal)/application-status',
  icon: 'reader' as const,
  label: 'My Application',
} as const;

export default function PortalDashboard() {
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.full_name?.split(' ')[0] ?? 'there';
  const { dogs, loading, error } = usePortalDogs();
  const { data: applications } = useMyApplications(profile?.id);
  const isApproved = applications.some((a) => a.status === 'approved');
  const quickLinks = [...BASE_QUICK_LINKS, isApproved ? PROFILE_LINK : APPLICATION_LINK];
  const primaryDog = dogs[0];

  return (
    <ScreenContainer>
      <View className="px-6">
        <Typography variant="label">Client Portal</Typography>
        <Typography variant="displayLg" className="mt-1">
          Welcome back, {name}
        </Typography>
      </View>

      <View className="mt-8 px-6">
        <SectionHeader eyebrow="Your Dogs" title="Linked Dogs" />
        {loading ? <CardListSkeleton count={2} /> : null}
        {error ? (
          <Typography variant="body" className="text-danger">{error}</Typography>
        ) : null}
        {!loading && dogs.length === 0 ? (
          <EmptyState
            title="No dogs linked"
            message="No dogs linked to your account yet. Contact us to link your dog."
          />
        ) : null}
        {primaryDog ? (
          <>
            <Link href={`/(portal)/puppy-tracker/${primaryDog.id}`} asChild>
              <Pressable>
                <Card className="flex-row">
                  <View className="h-20 w-20 overflow-hidden rounded-xl bg-surface">
                    {primaryDog.media?.[0] ? (
                      <Image
                        source={{ uri: primaryDog.media[0].url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : null}
                  </View>
                  <View className="ml-4 flex-1">
                    <Typography variant="title">{primaryDog.name}</Typography>
                    <View className="mt-1">
                      <Badge label={primaryDog.status ?? 'active'} tone="gold" />
                    </View>
                    <Typography variant="caption" className="mt-2">
                      {primaryDog.colour ?? '—'} · {primaryDog.sex ?? '—'}
                    </Typography>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
                </Card>
              </Pressable>
            </Link>
            <Link href={`/(portal)/training-updates/${primaryDog.id}`} asChild>
              <Pressable>
                <Card className="mt-3 flex-row items-center">
                  <Ionicons name="barbell" size={20} color={Colors.gold} />
                  <Typography variant="subtitle" className="ml-3 flex-1">
                    Training Updates
                  </Typography>
                  <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
                </Card>
              </Pressable>
            </Link>
            <Link href="/(portal)/vaccination-records" asChild>
              <Pressable>
                <Card className="mt-3 flex-row items-center">
                  <Ionicons name="medkit" size={20} color={Colors.gold} />
                  <Typography variant="subtitle" className="ml-3 flex-1">
                    Vaccination Records
                  </Typography>
                  <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
                </Card>
              </Pressable>
            </Link>
            <Link href={'/(portal)/health-schedule' as never} asChild>
              <Pressable>
                <Card className="mt-3 flex-row items-center">
                  <Ionicons name="calendar" size={20} color={Colors.gold} />
                  <Typography variant="subtitle" className="ml-3 flex-1">
                    Health Schedule
                  </Typography>
                  <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
                </Card>
              </Pressable>
            </Link>
          </>
        ) : null}
      </View>

      <View className="mt-8 px-6">
        <ExpectedLittersSection compact />
        <Link href={'/(portal)/expected-litters' as never} asChild>
          <Pressable className="mt-2">
            <Typography variant="caption" className="text-gold">
              View all expected litters →
            </Typography>
          </Pressable>
        </Link>
      </View>

      <View className="mt-8 px-6">
        <SectionHeader eyebrow="Training" title="Sessions" />
        <Link href="/(portal)/training" asChild>
          <Pressable>
            <Card className="flex-row items-center">
              <Ionicons name="calendar" size={20} color={Colors.gold} />
              <View className="ml-3 flex-1">
                <Typography variant="subtitle">Book a Training Session</Typography>
                <Typography variant="caption" className="mt-0.5">
                  Consultations, obedience, protection & video reviews
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
            </Card>
          </Pressable>
        </Link>
        <Link href="/(portal)/training/bookings" asChild>
          <Pressable>
            <Card className="mt-3 flex-row items-center">
              <Ionicons name="videocam" size={20} color={Colors.gold} />
              <Typography variant="subtitle" className="ml-3 flex-1">
                My Sessions
              </Typography>
              <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
            </Card>
          </Pressable>
        </Link>
        <Link href={'/(portal)/groups/index' as never} asChild>
          <Pressable>
            <Card className="mt-3 flex-row items-center">
              <Ionicons name="people" size={20} color={Colors.gold} />
              <Typography variant="subtitle" className="ml-3 flex-1">
                My Groups
              </Typography>
              <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
            </Card>
          </Pressable>
        </Link>
      </View>

      <View className="mt-8 px-6">
        <SectionHeader eyebrow="Shortcuts" title="Quick Links" />
        <View className="flex-row gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} asChild>
              <Pressable className="flex-1 items-center rounded-2xl border border-gold/15 bg-black-rich py-5">
                <Ionicons name={link.icon} size={22} color={Colors.gold} />
                <Typography variant="caption" className="mt-2 text-center">
                  {link.label}
                </Typography>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}
