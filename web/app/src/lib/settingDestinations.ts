export interface SettingDestination {
  id: string
  label: string
  detail: string
  words: string
  panel?: 'profile' | 'preferences' | 'momo' | 'ai' | 'account' | 'data'
  fallback?: string
  unavailable?: string
  focusContainer?: boolean
}

/** Public field names only. Search never contains the account's values or credentials. */
export const SETTING_DESTINATIONS: readonly SettingDestination[] = [
  { id: 'you-appearance', label: 'Appearance', detail: 'Light, dark or system', words: 'theme colour color night display dark mode', focusContainer: true },
  { id: 'setting-name', panel: 'profile', label: 'Name', detail: 'Profile · Your display name', words: 'profile name' },
  { id: 'setting-gender', panel: 'profile', label: 'Gender', detail: 'Profile · Used for your starting guide', words: 'profile gender' },
  { id: 'setting-height', panel: 'profile', label: 'Height', detail: 'Profile · Height in centimetres', words: 'profile height cm centimetres centimeters' },
  { id: 'setting-weight', panel: 'profile', label: 'Weight', detail: 'Profile · Current weight in kilograms', words: 'profile weight kg kilograms' },
  { id: 'setting-activity', panel: 'profile', label: 'Activity', detail: 'Profile · Your usual activity level', words: 'profile exercise movement activity' },
  { id: 'setting-pace', panel: 'profile', label: 'Day-ring pace', detail: 'Profile · Choose your logging steps', words: 'profile ring pace logging commitment routine' },
  { id: 'setting-goal', panel: 'profile', label: 'Goal', detail: 'Profile · Maintain, lose or gain', words: 'profile goal direction maintain lose gain' },
  { id: 'setting-weekly-change', panel: 'profile', label: 'Weekly change', detail: 'Profile · Weekly change in kilograms', words: 'profile weekly change kg pace', fallback: 'setting-goal', unavailable: 'Weekly change is shown for a lose or gain goal. Your current Goal is highlighted.' },
  { id: 'setting-goal-weight', panel: 'profile', label: 'Goal weight', detail: 'Profile · Optional destination weight', words: 'profile goal target weight kg', fallback: 'setting-goal', unavailable: 'Goal weight is shown when your goal uses it. Your current Goal is highlighted.' },
  { id: 'setting-sound', panel: 'preferences', label: 'Sound', detail: 'Preferences · Short action cues', words: 'preferences sound audio cues' },
  { id: 'setting-haptics', panel: 'preferences', label: 'Haptics', detail: 'Preferences · A light tap on press', words: 'preferences haptics vibration touch' },
  { id: 'setting-notifications', panel: 'preferences', label: 'Notifications', detail: 'Preferences · Allow reminders', words: 'preferences notifications permission reminders' },
  { id: 'setting-pause', panel: 'preferences', label: 'Pause tracking', detail: 'Preferences · Hide numbers and hold your streak', words: 'preferences pause tracking break rest' },
  { id: 'setting-momo-show', panel: 'momo', label: 'Show Momo', detail: 'Momo · Show or hide your companion', words: 'momo mascot hide show companion visibility' },
  { id: 'setting-momo-lively', panel: 'momo', label: 'Lively Momo', detail: 'Momo · More frequent antics', words: 'momo lively mascot antics', fallback: 'setting-momo-show', unavailable: 'Lively and Calm are shown when Momo is visible. Show Momo is highlighted.' },
  { id: 'setting-momo-calm', panel: 'momo', label: 'Calm Momo', detail: 'Momo · Quieter visits', words: 'momo calm mascot quiet cadence', fallback: 'setting-momo-show', unavailable: 'Lively and Calm are shown when Momo is visible. Show Momo is highlighted.' },
  { id: 'setting-momo-mute', panel: 'momo', label: 'Mute Momo', detail: 'Momo · Silence speech bubbles', words: 'momo mascot mute sound speech bubbles silence' },
  { id: 'setting-momo-roast', panel: 'momo', label: 'Roast mode', detail: 'Momo · Optional playful teasing', words: 'momo mascot roast jokes teasing' },
  { id: 'setting-momo-motion', panel: 'momo', label: 'Reduce Momo motion', detail: 'Momo · Stop roaming and gestures', words: 'momo mascot reduce reduced motion animation movement gestures' },
  { id: 'setting-momo-wardrobe', panel: 'momo', label: 'Momo’s wardrobe', detail: 'Momo · Outfits and unlocks', words: 'momo mascot wardrobe clothes outfit unlock' },
  { id: 'setting-own-api', panel: 'ai', label: 'Use my own API', detail: 'AI setup · Choose your own connection', words: 'ai api byok provider service connection' },
  { id: 'ai-api-format', panel: 'ai', label: 'API format', detail: 'AI setup · OpenAI-compatible, Gemini or Anthropic', words: 'ai api format compatible openai gemini anthropic', fallback: 'setting-own-api', unavailable: 'Connection fields are shown when Use my own API is on. Your saved mode has not changed.' },
  { id: 'ai-endpoint', panel: 'ai', label: 'API endpoint', detail: 'AI setup · Full request URL', words: 'ai api endpoint url service address', fallback: 'setting-own-api', unavailable: 'Connection fields are shown when Use my own API is on. Your saved mode has not changed.' },
  { id: 'ai-model', panel: 'ai', label: 'Model', detail: 'AI setup · Model ID from your service', words: 'ai api model vision image', fallback: 'setting-own-api', unavailable: 'Connection fields are shown when Use my own API is on. Your saved mode has not changed.' },
  { id: 'ai-auth-type', panel: 'ai', label: 'Authentication method', detail: 'AI setup · Bearer token, key header or no key', words: 'ai api authentication method auth bearer token', fallback: 'setting-own-api', unavailable: 'Connection fields are shown when Use my own API is on. Your saved mode has not changed.' },
  { id: 'ai-auth-header', panel: 'ai', label: 'Key header name', detail: 'AI setup · Header required by your service', words: 'ai api key header name authorization', fallback: 'ai-auth-type', unavailable: 'A key header name is shown for API key header authentication. Authentication method is highlighted.' },
  { id: 'setting-api-key', panel: 'ai', label: 'API key', detail: 'AI setup · Your personal connection key', words: 'ai api key credential secret', fallback: 'setting-own-api', unavailable: 'A key field is shown when your own connection uses authentication. Use my own API is highlighted; your saved mode has not changed.' },
  { id: 'custom-instructions', panel: 'ai', label: 'Custom instructions', detail: 'AI setup · Optional guidance for your connection', words: 'ai api custom instructions vegetarian diet', fallback: 'setting-own-api', unavailable: 'Custom instructions are shown with your own connection. Your saved mode has not changed.' },
  { id: 'setting-momo-live', panel: 'ai', label: 'Momo live AI', detail: 'AI setup · Optional live reactions', words: 'momo live ai fresh reactions dialogue' },
  { id: 'setting-momo-personality', panel: 'ai', label: 'Momo’s personality', detail: 'AI setup · Warm, witty or sassy', words: 'momo personality warm witty sassy', fallback: 'setting-momo-live', unavailable: 'Personality is available when Momo live AI is enabled. Momo live AI is highlighted.' },
  { id: 'setting-account-identity', panel: 'account', label: 'Account details', detail: 'Account · Your sign-in method', words: 'account email google sign in identity', focusContainer: true },
  { id: 'current-password', panel: 'account', label: 'Password', detail: 'Account · Change your email account password', words: 'account password change update', fallback: 'setting-account-identity', unavailable: 'Password fields are available for email accounts in the hosted app. Your sign-in details are highlighted.' },
  { id: 'setting-signout', panel: 'account', label: 'Sign out', detail: 'Account · Leave this device', words: 'account logout sign out device' },
  { id: 'setting-signout-all', panel: 'account', label: 'Sign out on all devices', detail: 'Account · End other sessions', words: 'account logout sign out all devices sessions', fallback: 'setting-signout', unavailable: 'Signing out all devices is available in the hosted app. Sign out for this device is highlighted.' },
  { id: 'setting-delete-account', panel: 'account', label: 'Delete account', detail: 'Account · Review the permanent deletion action', words: 'account delete remove permanent' },
  { id: 'setting-export', panel: 'data', label: 'Export backup', detail: 'Your data · Download a copy', words: 'data export backup download copy' },
  { id: 'setting-import', panel: 'data', label: 'Import backup', detail: 'Your data · Choose a saved backup', words: 'data import backup restore file' },
  { id: 'setting-delete-data', panel: 'data', label: 'Delete all data', detail: 'Your data · Review the clearing action', words: 'data delete reset clear journal' },
]

export function settingHref(setting: SettingDestination): string {
  return `/settings${setting.panel ? `?panel=${setting.panel}` : ''}#${setting.id}`
}

export function findSettingDestination(hash: string): SettingDestination | undefined {
  return SETTING_DESTINATIONS.find(item => `#${item.id}` === hash)
}

export function searchSettings(query: string): SettingDestination[] {
  const term = query.trim().toLowerCase()
  if (!term) return []
  const words = term.split(/\s+/)
  return SETTING_DESTINATIONS.filter(item => words.every(word => `${item.label} ${item.detail} ${item.words}`.toLowerCase().includes(word)))
    .sort((left, right) => Number(right.label.toLowerCase() === term) - Number(left.label.toLowerCase() === term))
}
