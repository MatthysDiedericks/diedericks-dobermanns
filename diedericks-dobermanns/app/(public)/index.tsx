import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Dimensions, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DogCard } from '@/components/dogs/DogCard';
import { BrandMark } from '@/components/layout/BrandMark';
import { SocialBar } from '@/components/social/SocialBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { Config } from '@/constants/config';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useDogs } from '@/hooks/useDogs';
import { useTestimonials } from '@/hooks/useContent';
import { openUrl } from '@/lib/social';

const { height } = Dimensions.get('window');
const HERO_IMG =
  'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=1200&q=80';

const TIERS = [
  {
    title: 'Standard Puppies',
    desc: 'Our quality entry point — precision bred, health tested, ready to grow with you.',
  },
  {
    title: 'Elite Developed Puppies',
    desc: '6-month in-kennel programme with personal delivery and full handover.',
  },
  {
    title: 'Elite Family Protection Dogs',
    desc: 'Fully trained, scenario-proofed, delivered and handed over in person.',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dogs } = useDogs({ featuredOnly: true });
  const { data: testimonials } = useTestimonials();
  const { settings } = useAppSettings();

  return (
    <ScreenContainer contentContainerStyle={{ paddingTop: 0 }}>
      {/* Hero */}
      <View style={{ height: height * 0.72 }} className="w-full">
        <Image
          source={{ uri: HERO_IMG }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <View className="absolute inset-0 bg-black/55" />
        <View
          className="absolute inset-0 items-center justify-center px-6"
          style={{ paddingTop: insets.top + 16, paddingBottom: 24 }}
        >
          <View className="mb-6">
            <BrandMark size="lg" showWordmark={false} />
          </View>
          <Typography variant="label" className="mb-3 text-center">
            Diedericks Dobermanns
          </Typography>
          <Typography variant="hero" className="leading-tight">
            Born With Purpose.{'\n'}Built With Discipline.
          </Typography>
          <Typography variant="bodyMuted" className="mt-4 max-w-[90%] text-center">
            Elite Dobermann breeding and professional protection dog training.
          </Typography>
          <View className="mt-6 w-full flex-row gap-3">
            <Button
              label="View Our Dogs"
              onPress={() => router.push('/dogs')}
              className="flex-1"
            />
            <Button
              label="Apply Now"
              variant="solid"
              onPress={() => router.push('/apply')}
              className="flex-1"
            />
          </View>
        </View>
      </View>

      {/* Featured dogs */}
      <View className="px-6 pt-10">
        <SectionHeader eyebrow="Our Bloodline" title="Featured Dogs" />
      </View>
      <FlatList
        horizontal
        data={dogs}
        keyExtractor={(d) => d.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
        renderItem={({ item }) => <DogCard dog={item} variant="carousel" />}
      />

      {/* About snippet */}
      <View className="px-6 pt-12">
        <SectionHeader eyebrow="About Us" title="A Standard, Not a Style" />
        <Typography variant="bodyMuted">
          Every dog we produce is bred for sound temperament, structural
          correctness and clear-headed working ability. We hold ourselves to an
          uncompromising standard — from health testing to the day of handover.
        </Typography>
        <Link href="/about" asChild>
          <Pressable className="mt-4 flex-row items-center">
            <Typography variant="label">Read our story</Typography>
            <Ionicons name="arrow-forward" size={14} color={Colors.gold} style={{ marginLeft: 6 }} />
          </Pressable>
        </Link>
      </View>

      {/* Product tiers */}
      <View className="px-6 pt-12">
        <SectionHeader eyebrow="Programmes" title="Three Ways In" />
        <View className="gap-3">
          {TIERS.map((tier) => (
            <Card key={tier.title}>
              <Typography variant="subtitle" className="text-gold">
                {tier.title}
              </Typography>
              <Typography variant="bodyMuted" className="mt-2">
                {tier.desc}
              </Typography>
            </Card>
          ))}
        </View>
      </View>

      {/* Testimonial snippet */}
      {testimonials[0] ? (
        <View className="px-6 pt-12">
          <SectionHeader eyebrow="Testimonials" title="What Owners Say" />
          <Card>
            <Typography variant="body" className="italic">
              “{testimonials[0].content}”
            </Typography>
            <Typography variant="label" className="mt-3">
              {testimonials[0].client_name} · {testimonials[0].location}
            </Typography>
          </Card>
          <Link href="/testimonials" asChild>
            <Pressable className="mt-4 flex-row items-center">
              <Typography variant="label">All testimonials</Typography>
              <Ionicons name="arrow-forward" size={14} color={Colors.gold} style={{ marginLeft: 6 }} />
            </Pressable>
          </Link>
        </View>
      ) : null}

      {/* Contact strip */}
      <View className="mx-6 mt-12 rounded-2xl border border-gold/20 bg-black-rich p-6">
        <Typography variant="display">Ready to Begin?</Typography>
        <Typography variant="bodyMuted" className="mt-2">
          Start your application or reach out with any questions.
        </Typography>
        <View className="mt-4 flex-row gap-3">
          <Button label="Apply" onPress={() => router.push('/apply')} className="flex-1" />
          <Button
            label="Contact"
            variant="secondary"
            onPress={() => router.push('/contact')}
            className="flex-1"
          />
        </View>
      </View>

      {/* Connect / social */}
      <View className="mx-6 mt-12 rounded-2xl border border-gold/20 bg-black-rich p-6">
        <SectionHeader eyebrow="Stay Connected" title="Join Our Community" />
        {settings.whatsapp_community_url ? (
          <Button
            label="Join our WhatsApp Community"
            onPress={() => openUrl(settings.whatsapp_community_url)}
            fullWidth
            className="mb-3"
          />
        ) : null}
        {settings.telegram_channel_url ? (
          <Button
            label="Join our Telegram Channel"
            variant="outline"
            onPress={() => openUrl(settings.telegram_channel_url)}
            fullWidth
            className="mb-6"
          />
        ) : null}
        <SocialBar title="Follow Us" />
      </View>

      {Config.isDemoMode ? (
        <View className="mx-6 mt-8">
          <Typography variant="caption" className="text-center">
            Demo mode — showing sample data. Connect Supabase in .env for live content.
          </Typography>
        </View>
      ) : null}

      <View className="mt-10 items-center px-6">
        <Link href="/(public)/login" asChild>
          <Pressable>
            <Typography variant="label">Client Portal →</Typography>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}
