import {
  MOMO_BODY_PATH,
  MOMO_COLORS,
  MOMO_VIEWBOX,
  momoScene,
  type MomoFace,
  type MomoShape,
  type OutfitSlots,
} from '@fud-ai/product/momoArt';
import { useId, type ReactNode } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

export type MomoArtworkProps = {
  size: number;
  face?: MomoFace;
  outfit?: OutfitSlots;
  steam?: boolean;
};

/**
 * Momo, drawn from the same shape data as the web app and the brand kit
 * (`@fud-ai/product/momoArt`). His steam carries the mood; his outfit comes
 * from the wardrobe.
 */
export function MomoArtwork({ size, face = 'neutral', outfit, steam = true }: MomoArtworkProps) {
  const clipId = `momo-body-${useId().replace(/:/g, '')}`;
  return (
    <Svg accessible={false} height={size} pointerEvents="none" viewBox={MOMO_VIEWBOX} width={size}>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={MOMO_BODY_PATH} />
        </ClipPath>
      </Defs>
      {momoScene({ face, outfit, steam }).map((shape, index) => renderShape(shape, index, clipId))}
    </Svg>
  );
}

function paint(shape: MomoShape) {
  return {
    fill: shape.fill ? MOMO_COLORS[shape.fill] : 'none',
    fillOpacity: shape.fillOpacity,
    opacity: shape.opacity,
    stroke: shape.stroke ? MOMO_COLORS[shape.stroke] : undefined,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: shape.strokeWidth,
    transform: shape.transform,
  };
}

function renderShape(shape: MomoShape, key: number, clipId: string): ReactNode {
  switch (shape.kind) {
    case 'group':
      return (
        <G
          clipPath={shape.clip ? `url(#${clipId})` : undefined}
          key={key}
          opacity={shape.opacity}
          transform={shape.transform}
        >
          {shape.children.map((child, index) => renderShape(child, index, clipId))}
        </G>
      );
    case 'path':
      return <Path d={shape.d} key={key} {...paint(shape)} />;
    case 'ellipse':
      return <Ellipse cx={shape.cx} cy={shape.cy} key={key} rx={shape.rx} ry={shape.ry} {...paint(shape)} />;
    case 'circle':
      return <Circle cx={shape.cx} cy={shape.cy} key={key} r={shape.r} {...paint(shape)} />;
    case 'rect':
      return <Rect height={shape.height} key={key} rx={shape.rx} width={shape.width} x={shape.x} y={shape.y} {...paint(shape)} />;
  }
}
