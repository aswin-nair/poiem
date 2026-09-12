import type { MomoFace, OutfitSlots } from '@fud-ai/product/momoArt';
import { View } from 'react-native';

import { MomoArtwork } from './MomoArtwork';

export type MomoMood = 'neutral' | 'sleepy' | 'excited' | 'proud' | 'curious' | 'cozy';

/** Mood reaches only Momo's face and steam. There is no sad face to reach. */
const FACE_BY_MOOD: Record<MomoMood, MomoFace> = {
  cozy: 'wink',
  curious: 'curious',
  excited: 'happy',
  neutral: 'neutral',
  proud: 'proud',
  sleepy: 'sleepy',
};

export function Momo({ mood, size = 88, outfit }: { mood: MomoMood; size?: number; outfit?: OutfitSlots }) {
  return (
    <View style={{ height: size, width: size }}>
      <MomoArtwork face={FACE_BY_MOOD[mood]} outfit={outfit} size={size} />
    </View>
  );
}
