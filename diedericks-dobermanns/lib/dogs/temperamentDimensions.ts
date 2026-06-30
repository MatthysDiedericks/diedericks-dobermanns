export const TEMPERAMENT_DIMENSIONS = {
  nerve_stability: {
    key: 'nerve_stability',
    label: 'Nerve Stability',
    labelDE: 'Nervenfestigkeit',
    description: 'Calmness under unusual stimuli — traffic, crowds, sudden noises.',
    ficGuide: '10 = No stress reaction to unfamiliar stimuli. Composed and unshaken.',
    akcGuide: '10 = Ignores distractions, does not startle to environmental stimuli.',
  },
  drive_and_energy: {
    key: 'drive_and_energy',
    label: 'Drive & Energy',
    labelDE: 'Triebveranlagung',
    description: 'Prey drive, play drive, retrieve motivation.',
    ficGuide: '10 = Explosive, highly motivated pursuit. Strong ball/toy drive.',
    akcGuide: '10 = Enthusiastic worker with high energy and sustained drive.',
  },
  courage: {
    key: 'courage',
    label: 'Courage',
    labelDE: 'Mut',
    description: 'Willingness to confront adversity without retreating.',
    ficGuide: '10 = Advances confidently on threat. No hesitation.',
    akcGuide: '10 = Bold, fearless, advances under pressure.',
  },
  hardness: {
    key: 'hardness',
    label: 'Hardness / Recovery',
    labelDE: 'Härte',
    description: 'Speed of recovery after a stressful experience.',
    ficGuide: '10 = Immediate recovery, re-engages without prompting.',
    akcGuide: '10 = Fast recovery without handler reassurance.',
  },
  environmental_confidence: {
    key: 'environmental_confidence',
    label: 'Environmental Confidence',
    labelDE: 'Umweltsicherheit',
    description: 'Confidence in new environments and public spaces.',
    ficGuide: '10 = Moves freely in all environments. Curious and stable.',
    akcGuide: '10 = CGC-level confidence in public settings.',
  },
  working_willingness: {
    key: 'working_willingness',
    label: 'Working Willingness',
    labelDE: 'Arbeitswille',
    description: 'Desire to engage in structured tasks with the handler.',
    ficGuide: '10 = Actively seeks work. Excellent task persistence.',
    akcGuide: '10 = Enthusiastic obedience/sport engagement.',
  },
  social_behavior: {
    key: 'social_behavior',
    label: 'Social Behavior',
    labelDE: 'Sozialverhalten',
    description: 'Appropriate behavior with unfamiliar people and dogs.',
    ficGuide: '10 = Neutral with strangers, non-reactive with dogs.',
    akcGuide: '10 = Friendly or neutral. No reactivity.',
  },
  obedience: {
    key: 'obedience',
    label: 'Obedience & Handler Bond',
    labelDE: 'Gehorsamkeit',
    description: 'Response to commands and handler focus under distraction.',
    ficGuide: '10 = Immediate response under full distraction.',
    akcGuide: '10 = AKC obedience-standard reliability in public.',
  },
} as const;

export type TemperamentDimensionKey = keyof typeof TEMPERAMENT_DIMENSIONS;

export const TEMPERAMENT_DIMENSION_KEYS = Object.keys(TEMPERAMENT_DIMENSIONS) as TemperamentDimensionKey[];
