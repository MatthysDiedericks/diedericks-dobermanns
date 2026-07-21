import { ScrollView, Pressable, View } from 'react-native';
import { useEffect, useState } from 'react';

import { DogPedigreeTab } from '@/components/dogs/detail/DogPedigreeTab';
import { DogBreedingTab } from '@/components/dogs/detail/DogBreedingTab';
import { DogExpensesTab } from '@/components/dogs/DogExpensesTab';
import { DogHealthTab } from '@/components/dogs/detail/DogHealthTab';
import { DogLinksTab } from '@/components/dogs/detail/DogLinksTab';
import { DogTemperamentTab } from '@/components/dogs/detail/DogTemperamentTab';
import { DocumentList } from '@/components/documents/DocumentList';
import { DogOverviewTab } from '@/components/dogs/detail/DogOverviewTab';
import { DogShowsTab } from '@/components/dogs/detail/DogShowsTab';
import { Typography } from '@/components/ui/Typography';
import { useAuthStore } from '@/stores/authStore';
import { hasPedigreeAncestors, useDogPedigree } from '@/hooks/useDogPedigree';
import type { Dog } from '@/types/app.types';

const BASE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'health', label: 'Health' },
  { id: 'breeding', label: 'Breeding' },
  { id: 'temperament', label: 'Temperament' },
  { id: 'shows', label: 'Shows' },
  { id: 'documents', label: 'Documents' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'gallery', label: 'Gallery' },
] as const;

const PEDIGREE_TAB = { id: 'pedigree', label: 'Pedigree' } as const;

type TabId = (typeof BASE_TABS)[number]['id'] | typeof PEDIGREE_TAB.id;

interface DogDetailTabsProps {
  dogId: string;
  dog: Dog;
  onRefresh: () => void;
}

export function DogDetailTabs({ dogId, dog, onRefresh }: DogDetailTabsProps) {
  const [active, setActive] = useState<TabId>('overview');
  const isAdmin = useAuthStore((s) => s.hasRole('admin'));
  const { ancestors, loading: pedigreeLoading } = useDogPedigree(dogId);
  const showPedigreeTab = pedigreeLoading || hasPedigreeAncestors(ancestors);
  const tabs = showPedigreeTab ? [...BASE_TABS, PEDIGREE_TAB] : [...BASE_TABS];

  useEffect(() => {
    if (!showPedigreeTab && active === 'pedigree') setActive('overview');
  }, [showPedigreeTab, active]);

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
          <DogOverviewTab dog={dog} onRefresh={onRefresh} canEdit={isAdmin} />
        ) : null}
        {active === 'health' ? <DogHealthTab dogId={dogId} dog={dog} /> : null}
        {active === 'breeding' ? <DogBreedingTab dog={dog} /> : null}
        {active === 'temperament' ? <DogTemperamentTab dog={dog} canEdit={isAdmin} /> : null}
        {active === 'shows' ? <DogShowsTab dogId={dogId} /> : null}
        {active === 'documents' ? <DocumentList entityType="dog" entityId={dogId} /> : null}
        {active === 'expenses' ? <DogExpensesTab dogId={dogId} dog={dog} /> : null}
        {active === 'gallery' ? <DogLinksTab dogId={dogId} variant="gallery" /> : null}
        {active === 'pedigree' ? (
          <DogPedigreeTab
            dogId={dogId}
            displayName={dog.name}
            profileRoutePrefix="/(admin)/dogs/"
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
