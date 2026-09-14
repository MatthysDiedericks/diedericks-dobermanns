import { ScrollView, Pressable, View } from 'react-native';
import { useRef } from 'react';

import { DogPedigreeTab } from '@/components/dogs/detail/DogPedigreeTab';
import { DogBreedingTab } from '@/components/dogs/detail/DogBreedingTab';
import { DogHealthTab } from '@/components/dogs/detail/DogHealthTab';
import { DogLinksTab } from '@/components/dogs/detail/DogLinksTab';
import { DogTemperamentTab } from '@/components/dogs/detail/DogTemperamentTab';
import { ProtectionListingTab } from '@/components/dogs/detail/ProtectionListingTab';
import { DocumentList } from '@/components/documents/DocumentList';
import { MicrochipQuickAttach } from '@/components/documents/MicrochipQuickAttach';
import { DogOverviewTab } from '@/components/dogs/detail/DogOverviewTab';
import { ReceivedPuppyCard } from '@/components/portal/ReceivedPuppyCard';
import { Typography } from '@/components/ui/Typography';
import { useAuthStore } from '@/stores/authStore';
import type { LineageStripData } from '@/lib/dogs/lineageStrip';
import type { Dog } from '@/types/app.types';

const BASE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'protection', label: 'Protection Listing' },
  { id: 'health', label: 'Health' },
  { id: 'pedigree', label: 'Pedigree' },
  { id: 'breeding', label: 'Breeding' },
  { id: 'temperament', label: 'Temperament' },
  { id: 'documents', label: 'Documents' },
  { id: 'gallery', label: 'Gallery' },
] as const;

type TabId = (typeof BASE_TABS)[number]['id'];

interface DogDetailTabsProps {
  dogId: string;
  dog: Dog;
  onRefresh: () => void;
  clientView?: boolean;
  lineage?: LineageStripData | null;
}

export function DogDetailTabs({ dogId, dog, onRefresh, clientView, lineage = null }: DogDetailTabsProps) {
  const isAdmin = useAuthStore((s) => s.hasRole('admin'));
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<TabId, number>>>({});
  const tabs = BASE_TABS.filter((t) => {
    if (clientView && t.id === 'breeding') return false;
    if (t.id === 'protection' && (clientView || dog.programme_tier !== 'protection_dog')) {
      return false;
    }
    return true;
  });

  function jump(id: TabId) {
    const y = offsets.current[id] ?? 0;
    scrollRef.current?.scrollTo({ y, animated: true });
  }

  function mark(id: TabId, y: number) {
    offsets.current[id] = y;
  }

  return (
    <View className="flex-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4 max-h-12 px-4"
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => jump(tab.id)}
            className="rounded-full border border-gold/25 bg-surface px-4 py-2"
          >
            <Typography variant="caption">{tab.label}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        className="px-4 pb-12"
        keyboardShouldPersistTaps="handled"
      >
        <View onLayout={(e) => mark('overview', e.nativeEvent.layout.y)}>
          {clientView ? <ReceivedPuppyCard dog={dog} /> : null}
          <DogOverviewTab
            dog={dog}
            onRefresh={onRefresh}
            canEdit={isAdmin && !clientView}
            lineage={lineage}
          />
        </View>
        {!clientView && dog.programme_tier === 'protection_dog' ? (
          <View onLayout={(e) => mark('protection', e.nativeEvent.layout.y)} className="mt-8">
            <Typography variant="label" className="mb-3 text-gold">
              PROTECTION LISTING
            </Typography>
            <ProtectionListingTab dog={dog} onRefresh={onRefresh} />
          </View>
        ) : null}
        <View onLayout={(e) => mark('health', e.nativeEvent.layout.y)} className="mt-8">
          <Typography variant="label" className="mb-3 text-gold">
            HEALTH
          </Typography>
          <DogHealthTab dogId={dogId} dog={dog} />
        </View>
        <View onLayout={(e) => mark('pedigree', e.nativeEvent.layout.y)} className="mt-8">
          <Typography variant="label" className="mb-3 text-gold">
            PEDIGREE
          </Typography>
          <DogPedigreeTab
            dogId={dogId}
            displayName={dog.name}
            profileRoutePrefix="/(admin)/dogs/"
            disableAncestorLinks={clientView}
            showCoi={!clientView}
          />
        </View>
        {!clientView ? (
          <View onLayout={(e) => mark('breeding', e.nativeEvent.layout.y)} className="mt-8">
            <Typography variant="label" className="mb-3 text-gold">
              BREEDING
            </Typography>
            <DogBreedingTab dog={dog} />
          </View>
        ) : null}
        <View onLayout={(e) => mark('temperament', e.nativeEvent.layout.y)} className="mt-8">
          <Typography variant="label" className="mb-3 text-gold">
            TEMPERAMENT
          </Typography>
          <DogTemperamentTab dog={dog} canEdit={isAdmin} />
        </View>
        <View onLayout={(e) => mark('documents', e.nativeEvent.layout.y)} className="mt-8">
          <Typography variant="label" className="mb-3 text-gold">
            DOCUMENTS
          </Typography>
          {!clientView ? (
            <MicrochipQuickAttach dogId={dogId} dogName={dog.name} onSaved={onRefresh} />
          ) : null}
          <DocumentList
            entityType="dog"
            entityId={dogId}
            entityLabel={dog.name}
            readOnly={clientView}
            showUpload={!clientView}
            clientVisibleOnly={clientView}
          />
        </View>
        <View onLayout={(e) => mark('gallery', e.nativeEvent.layout.y)} className="mt-8">
          <Typography variant="label" className="mb-3 text-gold">
            GALLERY
          </Typography>
          <DogLinksTab dogId={dogId} variant="gallery" />
        </View>
      </ScrollView>
    </View>
  );
}
