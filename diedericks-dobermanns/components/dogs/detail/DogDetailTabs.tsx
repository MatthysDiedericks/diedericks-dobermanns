import { ScrollView, Pressable, View } from 'react-native';
import { useState } from 'react';

import { DogPedigreeTab } from '@/components/dogs/detail/DogPedigreeTab';
import { DogBreedingTab } from '@/components/dogs/detail/DogBreedingTab';
import { DogHealthTab } from '@/components/dogs/detail/DogHealthTab';
import { DogLinksTab } from '@/components/dogs/detail/DogLinksTab';
import { DogTemperamentTab } from '@/components/dogs/detail/DogTemperamentTab';
import { DocumentList } from '@/components/documents/DocumentList';
import { MicrochipQuickAttach } from '@/components/documents/MicrochipQuickAttach';
import { DogOverviewTab } from '@/components/dogs/detail/DogOverviewTab';
import { Typography } from '@/components/ui/Typography';
import { useAuthStore } from '@/stores/authStore';
import type { Dog } from '@/types/app.types';

const BASE_TABS = [
  { id: 'overview', label: 'Overview' },
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
}

export function DogDetailTabs({ dogId, dog, onRefresh, clientView }: DogDetailTabsProps) {
  const [active, setActive] = useState<TabId>('overview');
  const isAdmin = useAuthStore((s) => s.hasRole('admin'));
  const tabs = clientView ? BASE_TABS.filter((t) => t.id !== 'breeding') : BASE_TABS;

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
            onPress={() => setActive(tab.id)}
            className={`rounded-full border px-4 py-2 ${
              active === tab.id ? 'border-gold bg-gold/15' : 'border-gold/25 bg-surface'
            }`}
          >
            <Typography variant="caption" className={active === tab.id ? 'text-gold' : ''}>
              {tab.label}
            </Typography>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView className="px-4 pb-12" keyboardShouldPersistTaps="handled">
        {active === 'overview' ? (
          <DogOverviewTab dog={dog} onRefresh={onRefresh} canEdit={isAdmin && !clientView} />
        ) : null}
        {active === 'health' ? <DogHealthTab dogId={dogId} dog={dog} /> : null}
        {active === 'breeding' && !clientView ? <DogBreedingTab dog={dog} /> : null}
        {active === 'temperament' ? <DogTemperamentTab dog={dog} canEdit={isAdmin} /> : null}
        {active === 'documents' ? (
          <>
            {!clientView ? (
              <MicrochipQuickAttach dogId={dogId} dogName={dog.name} onSaved={onRefresh} />
            ) : null}
            <DocumentList
              entityType="dog"
              entityId={dogId}
              readOnly={clientView}
              showUpload={!clientView}
              clientVisibleOnly={clientView}
            />
          </>
        ) : null}
        {active === 'gallery' ? <DogLinksTab dogId={dogId} variant="gallery" /> : null}
        {active === 'pedigree' ? (
          <DogPedigreeTab
            dogId={dogId}
            displayName={dog.name}
            profileRoutePrefix="/(admin)/dogs/"
            disableAncestorLinks={clientView}
            showCoi={!clientView}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
