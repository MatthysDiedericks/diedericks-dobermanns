import type { MutableRefObject } from 'react';
import { View, type TextInput } from 'react-native';

import { AppQuoteSaveFooter } from '@/components/finance/AppQuoteSaveFooter';
import { DeliveryDecisionCard } from '@/components/finance/DeliveryDecisionCard';
import { LineItemList } from '@/components/finance/LineItemList';
import { type DraftLineItem } from '@/components/finance/LineItemRow';
import { QuoteBuyerPicker } from '@/components/finance/QuoteBuyerPicker';
import { QuoteDraftOfferBanner } from '@/components/finance/QuoteDraftOfferBanner';
import { QuoteTypeField } from '@/components/finance/QuoteTypeField';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import type { CatalogueItem, DeliveryDecision } from '@/lib/finance/catalogue';
import { blankOtherLine, nextQuoteLineKey } from '@/lib/finance/appQuoteBuilderSeed';
import type { UnsentDraftOffer } from '@/lib/finance/quoteDraftQueries';
import { lineFromCatalogue, syncDeliveryLine } from '@/lib/finance/quoteDelivery';
import type { QuoteBuyerOption } from '@/lib/finance/quoteBuyerOptions';
import type { QuoteLitterOption, QuotePuppyOption, QuoteSubjectTier } from '@/lib/finance/quoteSubject';
import type { QuoteOutstandingItem } from '@/lib/finance/quoteOutstanding';
import type { RevenueType } from '@/lib/finance/quoteTypes';
import type { QuoteSaveState } from '@/components/finance/QuoteSaveIndicator';

export function AppQuoteBuilderView(props: {
  draftOffer: UnsentDraftOffer | null;
  onResume: () => void;
  onStartFresh: () => void;
  priceSourceLabel?: string | null;
  buyers: QuoteBuyerOption[];
  selectedBuyer: string;
  setSelectedBuyer: (k: string) => void;
  walkinName: string;
  setWalkinName: (v: string) => void;
  walkinEmail: string;
  setWalkinEmail: (v: string) => void;
  walkinPhone: string;
  setWalkinPhone: (v: string) => void;
  quoteType: RevenueType;
  onQuoteType: (t: RevenueType) => void;
  items: DraftLineItem[];
  setItems: (fn: (prev: DraftLineItem[]) => DraftLineItem[]) => void;
  dogs: QuotePuppyOption[];
  litters: QuoteLitterOption[];
  tiers: QuoteSubjectTier[];
  applicationTier: string | null;
  onAddCatalogue: () => void;
  descRefs: MutableRefObject<Record<string, TextInput | null>>;
  priceRefs: MutableRefObject<Record<string, TextInput | null>>;
  deliveryDecision: DeliveryDecision | null;
  deliveryNote: string;
  deliveryReason: string | null;
  exportPrompt: string | null;
  catalogue: CatalogueItem[];
  setDeliveryDecision: (d: DeliveryDecision | null) => void;
  setDeliveryNote: (n: string) => void;
  setExportPrompt: (n: string | null) => void;
  discount: string;
  setDiscount: (v: string) => void;
  validUntil: string;
  setValidUntil: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  initial: boolean;
  sentEdit: boolean;
  changeNote: string;
  setChangeNote: (v: string) => void;
  outstanding: QuoteOutstandingItem[];
  onSelectOutstanding: (item: QuoteOutstandingItem) => void;
  formError: string | null;
  saveState: QuoteSaveState;
  onRetry: () => void;
  total: number;
  statements: string[];
  canSave: boolean;
  submitting: boolean;
  onSave: () => void;
}) {
  const p = props;
  return (
    <View className="gap-4 px-6 pb-8">
      {p.draftOffer ? (
        <QuoteDraftOfferBanner
          offer={p.draftOffer}
          onResume={p.onResume}
          onStartFresh={p.onStartFresh}
        />
      ) : null}
      {p.priceSourceLabel ? (
        <Typography variant="caption" className="text-gold">{p.priceSourceLabel}</Typography>
      ) : null}
      <QuoteBuyerPicker
        options={p.buyers}
        selectedKey={p.selectedBuyer}
        onSelect={p.setSelectedBuyer}
        walkinName={p.walkinName}
        onWalkinChange={p.setWalkinName}
        walkinEmail={p.walkinEmail}
        onWalkinEmailChange={p.setWalkinEmail}
        walkinPhone={p.walkinPhone}
        onWalkinPhoneChange={p.setWalkinPhone}
      />
      <QuoteTypeField
        value={p.quoteType}
        onChange={p.onQuoteType}
      />
      <LineItemList
        items={p.items}
        puppies={p.dogs}
        litters={p.litters}
        tiers={p.tiers}
        applicationTier={p.applicationTier}
        onUpdate={(key, patch) => p.setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))}
        onRemove={(key) => p.setItems((prev) => prev.filter((it) => it.key !== key))}
        onAdd={() => p.setItems((prev) => [...prev, blankOtherLine()])}
        onAddCatalogue={p.onAddCatalogue}
        bindDescription={(key, el) => {
          p.descRefs.current[key] = el;
        }}
        bindPrice={(key, el) => {
          p.priceRefs.current[key] = el;
        }}
      />
      <DeliveryDecisionCard
        decision={p.deliveryDecision}
        note={p.deliveryNote}
        reason={p.deliveryReason}
        exportPrompt={p.exportPrompt}
        onDecisionChange={(d) => {
          p.setDeliveryDecision(d);
          p.setItems((prev) => syncDeliveryLine(prev, d, p.catalogue, nextQuoteLineKey));
        }}
        onNoteChange={p.setDeliveryNote}
        onDismissExportPrompt={() => p.setExportPrompt(null)}
      />
      <Input label="Discount (ZAR)" keyboardType="phone-pad" value={p.discount} onChangeText={p.setDiscount} />
      <Input label="Valid until (YYYY-MM-DD)" value={p.validUntil} onChangeText={p.setValidUntil} />
      <Input label="Notes" value={p.notes} onChangeText={p.setNotes} multiline className="h-24" />
      {p.initial ? (
        <Input
          label={p.sentEdit ? 'What changed (required)' : 'Edit note (optional)'}
          value={p.changeNote}
          onChangeText={p.setChangeNote}
          multiline
          className="h-20"
        />
      ) : null}
      <AppQuoteSaveFooter
        outstanding={p.outstanding}
        onSelectOutstanding={p.onSelectOutstanding}
        formError={p.formError}
        saveState={p.saveState}
        onRetry={p.onRetry}
        total={p.total}
        statements={p.statements}
        canSave={p.canSave}
        submitting={p.submitting}
        onSave={p.onSave}
      />
    </View>
  );
}
