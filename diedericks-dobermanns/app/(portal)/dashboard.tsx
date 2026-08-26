import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { WhatsAppHelpLink } from '@/components/contact/WhatsAppHelpLink';
import { ExpectedLittersSection } from '@/components/portal/ExpectedLittersSection';
import { PortalDogThumb } from '@/components/portal/PortalDogThumb';
import { PortalHealthDueCard } from '@/components/portal/PortalHealthDueCard';
import { JourneyBreadcrumb } from '@/components/portal/JourneyBreadcrumb';
import {
  CommittedLitterPanel,
  WaitingListPlainMessage,
} from '@/components/portal/CommittedLitterPanel';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useBuyerJourney } from '@/hooks/useBuyerJourney';
import { useCommittedBreeding } from '@/hooks/useCommittedBreeding';
import { useMyApplications, usePortalDogs } from '@/hooks/usePortal';
import { canApplyAgain } from '@/lib/applications/applyAgain';
import { ageFromDob, birthdayAgeWords, isBirthdayToday } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';

const BASE_QUICK_LINKS: { href: Href; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { href: '/(portal)/quotes' as Href, icon: 'pricetag', label: 'Quotes' },
  { href: '/(portal)/documents', icon: 'folder-open', label: 'Documents' },
  { href: '/(portal)/contracts', icon: 'create', label: 'Contracts' },
];

const PROFILE_LINK: { href: Href; icon: keyof typeof Ionicons.glyphMap; label: string } = {
  href: '/(portal)/profile',
  icon: 'person-circle-outline',
  label: 'My Profile',
};

const APPLICATION_LINK: { href: Href; icon: keyof typeof Ionicons.glyphMap; label: string } = {
  href: '/(portal)/application-status',
  icon: 'reader',
  label: 'My Application',
};

export default function PortalDashboard() {
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.full_name?.split(' ')[0] ?? 'there';
  const { dogs, loading, error } = usePortalDogs();
  const { data: applications } = useMyApplications();
  const { currentStep } = useBuyerJourney();
  const { parents, litter, onWaitlist } = useCommittedBreeding();
  const isApproved = applications.some((a) => a.status === 'approved');
  const quickLinks = [...BASE_QUICK_LINKS, isApproved ? PROFILE_LINK : APPLICATION_LINK];
  const primaryDog = dogs[0];
  const birthdayDogs = dogs.filter((d) => isBirthdayToday(d.date_of_birth));

  return (
    <ScreenContainer>
      <View className="px-6">
        <Typography variant="label">Client Portal</Typography>
        <Typography variant="displayLg" className="mt-1">
          Welcome back, {name}
        </Typography>
      </View>

      {birthdayDogs.map((dog) => (
        <View
          key={dog.id}
          className="mx-6 mt-4 rounded-xl border border-gold bg-gold/15 px-4 py-3"
        >
          <Typography variant="subtitle" className="text-gold">
            {dog.name} turns {birthdayAgeWords(dog.date_of_birth) ?? 'another year'} today
          </Typography>
        </View>
      ))}

      <View className="mt-6 px-6">
        <JourneyBreadcrumb currentStep={currentStep} />
      </View>

      <View className="mt-8 px-6">
        <SectionHeader eyebrow="Your Dogs" title="Linked Dogs" />
        {loading ? <CardListSkeleton count={2} /> : null}
        {error ? (
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        ) : null}
        {!loading && dogs.length === 0 ? (
          parents.length > 0 && litter ? (
            <CommittedLitterPanel litter={litter} parents={parents} />
          ) : onWaitlist ? (
            <WaitingListPlainMessage />
          ) : (
            <EmptyState
              title="No dogs linked"
              message="No dogs linked to your account yet. WhatsApp us and we will help."
            >
              <WhatsAppHelpLink className="mt-3" />
            </EmptyState>
          )
        ) : null}
        {dogs.length > 0 ? <PortalHealthDueCard /> : null}
        {dogs.map((dog) => (
            <Link key={dog.id} href={`/(portal)/dogs/${dog.id}` as never} asChild>
              <Pressable>
                <Card className="mb-3 flex-row items-center">
                  <PortalDogThumb name={dog.name} media={dog.media} />
                  <View className="ml-4 flex-1">
                    <Typography variant="title">{dog.name}</Typography>
                    <View className="mt-1">
                      <Badge label={dog.status ?? 'active'} tone="gold" />
                    </View>
                    <Typography variant="caption" className="mt-2">
                      {[dog.colour, dog.sex, ageFromDob(dog.date_of_birth)]
                        .filter(Boolean)
                        .join(' ? ')}
                    </Typography>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
                </Card>
              </Pressable>
            </Link>
          ))}
          {primaryDog ? (
          <>
            <Link href={'/(portal)/training/request' as never} asChild>
              <Pressable>
                <Card className="mt-3 flex-row items-center">
                  <Ionicons name="paw" size={20} color={Colors.gold} />
                  <Typography variant="subtitle" className="ml-3 flex-1">
                    Request training
                  </Typography>
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
              View all expected litters ?
            </Typography>
          </Pressable>
        </Link>
      </View>

      <View className="mt-8 px-6">
        <SectionHeader eyebrow="Training" title="Sessions" />
        <Link href={'/(portal)/training/request' as never} asChild>
          <Pressable>
            <Card className="flex-row items-center">
              <Ionicons name="chatbubble-ellipses" size={20} color={Colors.gold} />
              <View className="ml-3 flex-1">
                <Typography variant="subtitle">Request training</Typography>
                <Typography variant="caption" className="mt-0.5">
                  Tell us what you need ? not a booking
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
            </Card>
          </Pressable>
        </Link>
        <Link href="/(portal)/training" asChild>
          <Pressable>
            <Card className="mt-3 flex-row items-center">
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
        <Link href={'/(portal)/training/guides' as never} asChild>
          <Pressable>
            <Card className="mt-3 flex-row items-center">
              <Ionicons name="book" size={20} color={Colors.gold} />
              <Typography variant="subtitle" className="ml-3 flex-1">
                Training library
              </Typography>
              <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
            </Card>
          </Pressable>
        </Link>
      </View>

      <View className="mt-8 px-6">
        <SectionHeader eyebrow="Shortcuts" title="Quick Links" />
        {canApplyAgain(applications[0]?.status) ? (
          <Link href={'/(portal)/application-another' as Href} asChild>
            <Pressable>
              <Card className="mb-3">
                <Typography variant="subtitle">Apply for another dog</Typography>
                <Typography variant="caption" className="mt-1 text-subtle">
                  A new application. Your previous approval stays as it is.
                </Typography>
              </Card>
            </Pressable>
          </Link>
        ) : null}
        <View className="flex-row gap-3">
          {quickLinks.map((link) => (
            <Link key={String(link.href)} href={link.href} asChild>
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
