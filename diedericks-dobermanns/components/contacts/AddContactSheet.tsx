import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { CONTACT_TAGS } from '@/hooks/useContacts';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { createContact, updateContact } from '@/lib/contacts/mutations';
import { useAuthStore } from '@/stores/authStore';
import type { ContactInput, ContactRow, ContactType } from '@/types/phase10';

export interface AddContactSheetHandle {
  open: (existingContact?: ContactRow) => void;
  close: () => void;
}

interface AddContactSheetProps {
  onSaved: () => void;
}

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'breeder', label: 'Breeder' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'judge', label: 'Judge' },
  { value: 'other', label: 'Other' },
];

const SOURCES = [
  { value: 'manual', label: 'Manual' },
  { value: 'referral', label: 'Referral' },
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'import', label: 'Import' },
];

function ChipRow({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <View className="mb-4">
      <Typography variant="caption" className="mb-2 text-silver">
        {label}
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <Pressable
            key={o.value}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            className={`rounded-full border px-3 py-1.5 ${value === o.value ? 'border-gold bg-gold/15' : 'border-gold/25'} ${disabled ? 'opacity-50' : ''}`}
          >
            <Typography variant="caption">{o.label}</Typography>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const AddContactSheet = forwardRef<AddContactSheetHandle, AddContactSheetProps>(
  function AddContactSheet({ onSaved }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['92%'], []);
    const isAdmin = useAuthStore((s) => s.hasRole('admin', 'super_admin', 'management'));

    const [editId, setEditId] = useState<string | null>(null);
    const [linkedUser, setLinkedUser] = useState(false);
    const [fullName, setFullName] = useState('');
    const [contactType, setContactType] = useState<ContactType>('prospect');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [address, setAddress] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [notes, setNotes] = useState('');
    const [source, setSource] = useState('manual');
    const [saving, setSaving] = useState(false);

    const reset = useCallback(() => {
      setEditId(null);
      setLinkedUser(false);
      setFullName('');
      setContactType('prospect');
      setPhone('');
      setWhatsapp('');
      setEmail('');
      setCompany('');
      setCity('');
      setCountry('');
      setAddress('');
      setTags([]);
      setMarketingOptIn(false);
      setNotes('');
      setSource('manual');
    }, []);

    const close = useCallback(() => {
      sheetRef.current?.dismiss();
      reset();
    }, [reset]);

    const open = useCallback(
      (existing?: ContactRow) => {
        reset();
        if (existing) {
          setEditId(existing.id);
          setLinkedUser(Boolean(existing.user_id));
          setFullName(existing.full_name);
          setContactType(existing.user_id ? 'client' : (existing.contact_type ?? 'prospect'));
          setPhone(existing.phone ?? '');
          setWhatsapp(existing.whatsapp_number ?? '');
          setEmail(existing.email ?? '');
          setCompany(existing.company ?? '');
          setCity(existing.city ?? '');
          setCountry(existing.country ?? '');
          setAddress(existing.address ?? '');
          setTags(existing.tags ?? []);
          setMarketingOptIn(existing.marketing_opt_in ?? false);
          setNotes(existing.notes ?? '');
          setSource(existing.source ?? 'manual');
        }
        sheetRef.current?.present();
      },
      [reset],
    );

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    const toggleTag = (tag: string) => {
      setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    };

    const payload = (): ContactInput => ({
      full_name: fullName,
      email,
      phone,
      whatsapp_number: whatsapp || phone,
      address,
      city,
      country,
      company,
      contact_type: linkedUser ? 'client' : contactType,
      tags,
      marketing_opt_in: marketingOptIn,
      popia_consent: marketingOptIn,
      notes,
      source,
    });

    const save = async () => {
      if (!fullName.trim()) {
        showError('Full name is required.');
        return;
      }
      setSaving(true);
      try {
        if (editId) await updateContact(editId, payload());
        else await createContact(payload());
        showSaved(editId ? 'Contact updated' : 'Contact added');
        onSaved();
        close();
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Could not save contact.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        handleIndicatorStyle={{ backgroundColor: Colors.gold, width: 40 }}
        backgroundStyle={{ backgroundColor: Colors.nav }}
      >
        <View className="flex-row items-center justify-between px-6 pb-3 pt-4">
          <Typography variant="subtitle" className="text-gold">
            {editId ? 'Edit Contact' : 'Add Contact'}
          </Typography>
          <Pressable onPress={close} hitSlop={12} className="rounded-full bg-surface p-2">
            <Ionicons name="close" size={20} color={Colors.gold} />
          </Pressable>
        </View>

        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
          <Typography variant="caption" className="mb-1 text-silver">
            Full name *
          </Typography>
          <BottomSheetTextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor={Colors.silver}
            className="mb-4 rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
          />

          <ChipRow
            label="Contact type *"
            options={CONTACT_TYPES}
            value={contactType}
            onChange={(v) => setContactType(v as ContactType)}
            disabled={linkedUser}
          />
          {linkedUser ? (
            <Typography variant="caption" className="mb-4 text-subtle">
              App-linked contacts are always clients.
            </Typography>
          ) : null}

          {[
            { label: 'Phone', value: phone, set: setPhone, keyboard: 'phone-pad' as const },
            { label: 'WhatsApp number', value: whatsapp, set: setWhatsapp, keyboard: 'phone-pad' as const, hint: 'Leave blank if same as phone' },
            { label: 'Email', value: email, set: setEmail, keyboard: 'email-address' as const },
            { label: 'Company', value: company, set: setCompany, keyboard: 'default' as const },
            { label: 'City', value: city, set: setCity, keyboard: 'default' as const },
            { label: 'Country', value: country, set: setCountry, keyboard: 'default' as const },
          ].map((f) => (
            <View key={f.label}>
              <Typography variant="caption" className="mb-1 text-silver">
                {f.label}
              </Typography>
              <BottomSheetTextInput
                value={f.value}
                onChangeText={f.set}
                keyboardType={f.keyboard}
                placeholder={f.label}
                placeholderTextColor={Colors.silver}
                className="mb-1 rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
              />
              {'hint' in f && f.hint ? (
                <Typography variant="caption" className="mb-3 text-subtle">
                  {f.hint}
                </Typography>
              ) : (
                <View className="mb-3" />
              )}
            </View>
          ))}

          <Typography variant="caption" className="mb-1 text-silver">
            Address
          </Typography>
          <BottomSheetTextInput
            value={address}
            onChangeText={setAddress}
            multiline
            placeholder="Address"
            placeholderTextColor={Colors.silver}
            className="mb-4 min-h-[72px] rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
          />

          <Typography variant="caption" className="mb-2 text-silver">
            Tags
          </Typography>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {CONTACT_TAGS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1.5 ${tags.includes(tag) ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
              >
                <Typography variant="caption">{tag}</Typography>
              </Pressable>
            ))}
          </View>

          <View className="mb-4 flex-row items-center justify-between gap-3">
            <Typography variant="caption" className="flex-1 text-ink-muted">
              I confirm this person has consented to marketing communications (POPIA)
            </Typography>
            <Switch value={marketingOptIn} onValueChange={setMarketingOptIn} />
          </View>

          <Typography variant="caption" className="mb-1 text-silver">
            Notes
          </Typography>
          <BottomSheetTextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Notes"
            placeholderTextColor={Colors.silver}
            className="mb-4 min-h-[72px] rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
          />

          {isAdmin ? (
            <ChipRow label="Source" options={SOURCES} value={source} onChange={setSource} />
          ) : null}

          <Button label={editId ? 'Save changes' : 'Add contact'} onPress={() => void save()} loading={saving} fullWidth />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
