export type SkillLevel = 'building' | 'solid' | 'proofed';

export type TemperamentArea = {
  area: string;
  body: string;
};

export type SkillLibraryRow = {
  id: string;
  discipline: string;
  label: string;
  detail: string | null;
  default_conditions: string[];
  sort_order: number;
  is_active: boolean;
};

export type DogSkillRow = {
  id: string;
  dog_id: string;
  library_id: string | null;
  discipline: string;
  label: string;
  detail: string | null;
  conditions: string[];
  level: SkillLevel | null;
  sort_order: number;
  is_public: boolean;
};

export type ProtectionDogOption = {
  id: string;
  name: string;
};
