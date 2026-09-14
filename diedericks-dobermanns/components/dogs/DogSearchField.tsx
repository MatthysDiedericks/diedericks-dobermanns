import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Colors } from "@/constants/colors";
import {
  DOG_SEARCH_DEBOUNCE_MS,
  DOG_SEARCH_PLACEHOLDER,
  noDogMatchLine,
} from "@/lib/dogs/search";

export function DogSearchField({
  query,
  onQueryChange,
  placeholder = DOG_SEARCH_PLACEHOLDER,
  empty = false,
  debounceMs = DOG_SEARCH_DEBOUNCE_MS,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  empty?: boolean;
  debounceMs?: number;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [text, setText] = useState(query);

  useEffect(() => {
    setText(query);
  }, [query]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleChange(next: string) {
    setText(next);
    if (debounceMs <= 0) {
      onQueryChange(next);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onQueryChange(next), debounceMs);
  }

  return (
    <View>
      <TextInput
        value={text}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.silver}
        autoCapitalize="none"
        autoCorrect={false}
        className="rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
      />
      {empty && query.trim() ? (
        <Text className="mt-2 font-body text-xs text-amber-200">{noDogMatchLine(query)}</Text>
      ) : null}
    </View>
  );
}
