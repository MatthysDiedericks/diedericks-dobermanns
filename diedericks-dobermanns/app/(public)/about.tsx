import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SocialBar } from '@/components/social/SocialBar';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

const ABOUT_IMG =
  'https://images.unsplash.com/photo-1568572933382-74d440642117?auto=format&fit=crop&w=1200&q=80';

const OFFERINGS = [
  {
    icon: 'paw' as const,
    title: 'Standard Puppies',
    body: 'Purebred Dobermann puppies from health-tested, selectively bred parents. The right start, at the right price, from people who know the breed — an accessible entry into genuine quality.',
  },
  {
    icon: 'ribbon' as const,
    title: 'Elite Developed Puppies',
    body: 'We develop our Elite pups in-kennel until six months of age — an obedience foundation, an introduction to protection work, structured socialisation, and real-world environmental exposure most buyers could never replicate on their own. And we don\u2019t send a courier: we deliver personally and hand over formally, so you and your dog begin the right way.',
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Elite Family Protection Dogs',
    body: 'The pinnacle of what we produce. Fully trained adult Dobermanns taken from foundation through to scenario-based protection — tested under real pressure, in realistic environments. These dogs don\u2019t just arrive; they are introduced, delivered personally, and handed over with the knowledge, history, and relationship they deserve.',
  },
];

const LINKS = [
  { href: '/training-philosophy', icon: 'school' as const, label: 'Training Philosophy' },
  { href: '/achievements', icon: 'trophy' as const, label: 'Achievements & Titles' },
  { href: '/testimonials', icon: 'chatbubbles' as const, label: 'Testimonials' },
  { href: '/faq', icon: 'help-circle' as const, label: 'Frequently Asked Questions' },
  { href: '/terms-of-sale', icon: 'document-text' as const, label: 'Terms & Conditions of Sale' },
  { href: '/privacy', icon: 'lock-closed' as const, label: 'Privacy Policy' },
] as const;

/** Reusable block: gold eyebrow + heading + one or more paragraphs. */
function Section({
  eyebrow,
  title,
  paragraphs,
}: {
  eyebrow: string;
  title: string;
  paragraphs: string[];
}) {
  return (
    <View className="mt-10">
      <SectionHeader eyebrow={eyebrow} title={title} />
      <View className="gap-4">
        {paragraphs.map((p, i) => (
          <Typography key={i} variant="bodyMuted">
            {p}
          </Typography>
        ))}
      </View>
    </View>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  return (
    <ScreenContainer contentContainerStyle={{ paddingTop: 0 }}>
      {/* Hero */}
      <View className="h-[420px] w-full">
        <Image
          source={{ uri: ABOUT_IMG }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <View className="absolute inset-0 bg-black/[0.55]" />
        <View className="absolute inset-0 items-center justify-center px-6">
          <Typography variant="label" className="text-center">
            Diedericks Dobermanns
          </Typography>
          <Typography variant="hero" className="mt-3">
            Born With Purpose. Built With Discipline.
          </Typography>
          <Typography variant="body" className="mt-4 max-w-md text-center text-ink-muted">
            We don&apos;t breed dogs for everyone. We breed them for people who understand what a
            Dobermann, at its finest, is capable of.
          </Typography>
        </View>
      </View>

      <View className="px-6 pb-4">
        <Section
          eyebrow="Our Story"
          title="Who We Are"
          paragraphs={[
            'Diedericks Dobermanns is an elite Dobermann breeding and professional training operation with an unwavering commitment to one thing: producing exceptional dogs.',
            'Every decision we make — from the bloodlines we select, to the health testing we insist on, to the training we put into every animal that leaves our care — is driven by a single standard. Not the easiest standard. Not the most common one. The right one.',
            'We work with some of the most respected Dobermann genetics available anywhere in the world — European working lines from Altobello, Dominator, and Quantum bloodlines, as well as our own established kennel lines, developed through decades of deliberate, multi-generational selection. These are lines we would put against any in the world.',
          ]}
        />

        <Section
          eyebrow="Standard Over Volume"
          title="Our Breeding Philosophy"
          paragraphs={[
            'We do not breed volume. We breed quality.',
            'Every breeding decision at Diedericks begins long before the litter is planned. Both parents are health tested for Dilated Cardiomyopathy (DCM1–DCM5 genetic panels), hip dysplasia, and elbow dysplasia — a testing protocol that exceeds what most breed clubs require, because our standard is not set by clubs. It is set by the dogs themselves, and by the families who trust us to put a Dobermann in their home.',
            'Temperament is not an afterthought. We evaluate every animal for stability, drive, courage, and social adaptability — because a dog that cannot live in a family is not a dog we will place in one.',
          ]}
        />

        {/* What We Offer */}
        <View className="mt-10">
          <SectionHeader eyebrow="Three Tiers" title="What We Offer" />
          <View className="gap-4">
            {OFFERINGS.map((o) => (
              <View
                key={o.title}
                className="rounded-2xl border border-gold/15 bg-black-rich p-5"
              >
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-gold/15">
                    <Ionicons name={o.icon} size={20} color={Colors.gold} />
                  </View>
                  <Typography variant="subtitle" className="ml-4 flex-1 text-gold">
                    {o.title}
                  </Typography>
                </View>
                <Typography variant="bodyMuted" className="mt-3">
                  {o.body}
                </Typography>
              </View>
            ))}
          </View>
        </View>

        <Section
          eyebrow="Reliable First, Impressive Second"
          title="Our Training"
          paragraphs={[
            'We compete in PSA — the Protection Sports Association — one of the most demanding protection dog disciplines in the world. It tests real-world scenarios, obedience under pressure, and genuine handler teamwork. Few kennels in Africa compete at this level. We do, because it keeps our standard honest.',
            'Our training methodology is balanced. We use what works. Positive reinforcement where it builds, correction where it is needed. Every dog is different, and we meet each one where they are — then shape them into what they need to become.',
            'Obedience is not optional. An unreliable protection dog is not a protection dog — it is a liability. Every Diedericks dog is reliable first, impressive second.',
          ]}
        />

        {/* Our Promise — emphasised block */}
        <View className="mt-10">
          <SectionHeader eyebrow="What You Can Expect" title="Our Promise" />
          <View className="rounded-2xl border-l-2 border-gold bg-black-rich p-5">
            <View className="gap-4">
              <Typography variant="bodyMuted">
                When you come to Diedericks, you are not buying a dog. You are entering a
                relationship with a kennel that takes its reputation as seriously as you take your
                family&apos;s safety.
              </Typography>
              <Typography variant="bodyMuted">
                We will be honest with you about what we have and what suits you. We will not place
                a dog that is not ready. We will not match a dog to a home that is not right. And
                when your dog arrives — whether it is a puppy or a fully trained adult — we will be
                there for what comes next.
              </Typography>
              <Typography variant="body" className="text-gold">
                That is not a marketing line. That is how we operate.
              </Typography>
            </View>
          </View>
        </View>

        {/* Closing tagline */}
        <Typography variant="display" className="mt-12 text-center">
          Precision Bred.{'\n'}Professionally Trained.{'\n'}Lifetime Proven.
        </Typography>

        {/* Learn More */}
        <View className="mt-12">
          <SectionHeader eyebrow="Explore" title="Learn More" />
          <View className="gap-3">
            {LINKS.map((l) => (
              <Pressable key={l.href} onPress={() => router.push(l.href)}>
                <Card className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-gold/15">
                    <Ionicons name={l.icon} size={20} color={Colors.gold} />
                  </View>
                  <Typography variant="subtitle" className="ml-4 flex-1">
                    {l.label}
                  </Typography>
                  <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
                </Card>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Follow */}
        <View className="mt-12 items-center">
          <SocialBar title="Follow Us" />
        </View>
      </View>
    </ScreenContainer>
  );
}
