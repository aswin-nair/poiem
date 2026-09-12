/** Lucide artwork with short interaction-driven motion. Parent controls own accessible names. */
import type { SVGProps } from 'react'
import {
  House, ChartNoAxesCombined, Bookmark, MessageCircle, Settings, Plus, X,
  ChevronLeft, ChevronRight, ChevronDown, Star, Minus, Trash2, Send, Check,
  List, PencilLine, Camera, ClipboardList, ArrowUpRight, CalendarDays, Bell,
  Search, ScanLine, Flame, Sparkles, Utensils, Egg, Wheat, Droplets, Trophy,
  ArrowRight, History, Coffee, Salad, Pizza, Fish, Apple, Soup, CircleCheck,
  CloudUpload, CloudOff, ShieldCheck, Sprout, Armchair, Footprints, Dumbbell, Zap, Sunrise, Sun, Moon,
  GlassWater, CupSoda, Milk, Wine, Beer, Hamburger, Sandwich, Drumstick, Beef, Shrimp, EggFried, Carrot, Croissant,
  Cookie, CakeSlice, Donut, IceCreamCone, Candy, Popcorn, Banana, Citrus, Cherry, Grape, Nut, type LucideIcon,
} from 'lucide-react'
import { foodGlyphFor, type FoodGlyph } from '../lib/foodGlyph'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox'> {
  size?: number
  active?: boolean
}

function LibraryIcon({ glyph: Component, motion = 'pop', size = 20, active, className = '', ...rest }: IconProps & {
  glyph: LucideIcon
  motion?: 'pop' | 'tilt' | 'nudge' | 'draw'
}) {
  return <Component size={size} strokeWidth={2} aria-hidden="true" focusable="false"
    {...rest} className={`ui-icon ui-icon-${motion}${active ? ' is-active' : ''} ${className}`.trim()} />
}

export function IconHome(props: IconProps) { return <LibraryIcon glyph={House} {...props} /> }
export function IconProgress(props: IconProps) { return <LibraryIcon glyph={ChartNoAxesCombined} motion="draw" {...props} /> }
export function IconJourney(props: IconProps) { return <LibraryIcon glyph={Bookmark} motion="tilt" {...props} /> }
export function IconCoach(props: IconProps) { return <LibraryIcon glyph={MessageCircle} {...props} /> }
export function IconSettings(props: IconProps) { return <LibraryIcon glyph={Settings} motion="tilt" {...props} /> }
export function IconPlus(props: IconProps) { return <LibraryIcon glyph={Plus} motion="tilt" {...props} /> }
export function IconClose(props: IconProps) { return <LibraryIcon glyph={X} {...props} /> }
export function IconChevronLeft(props: IconProps) { return <LibraryIcon glyph={ChevronLeft} motion="nudge" {...props} /> }
export function IconChevronRight(props: IconProps) { return <LibraryIcon glyph={ChevronRight} motion="nudge" {...props} /> }
export function IconChevronDown(props: IconProps) { return <LibraryIcon glyph={ChevronDown} motion="nudge" {...props} /> }
export function IconStar(props: IconProps) { return <LibraryIcon glyph={Star} {...props} /> }
export function IconMinus(props: IconProps) { return <LibraryIcon glyph={Minus} {...props} /> }
export function IconTrash(props: IconProps) { return <LibraryIcon glyph={Trash2} motion="tilt" {...props} /> }
export function IconSend(props: IconProps) { return <LibraryIcon glyph={Send} motion="nudge" {...props} /> }
export function IconCheck(props: IconProps) { return <LibraryIcon glyph={Check} motion="draw" {...props} /> }
export function IconMenuLines(props: IconProps) { return <LibraryIcon glyph={List} motion="draw" {...props} /> }
export function IconEdit(props: IconProps) { return <LibraryIcon glyph={PencilLine} motion="tilt" {...props} /> }
export function IconCamera(props: IconProps) { return <LibraryIcon glyph={Camera} {...props} /> }
export function IconClipboard(props: IconProps) { return <LibraryIcon glyph={ClipboardList} motion="draw" {...props} /> }
export function IconArrowUpRight(props: IconProps) { return <LibraryIcon glyph={ArrowUpRight} motion="nudge" {...props} /> }
export function IconCalendar(props: IconProps) { return <LibraryIcon glyph={CalendarDays} motion="tilt" {...props} /> }
export function IconSearch(props: IconProps) { return <LibraryIcon glyph={Search} motion="tilt" {...props} /> }
export function IconScan(props: IconProps) { return <LibraryIcon glyph={ScanLine} motion="draw" {...props} /> }
export function IconFlame(props: IconProps) { return <LibraryIcon glyph={Flame} motion="tilt" {...props} /> }
export function IconSparkles(props: IconProps) { return <LibraryIcon glyph={Sparkles} {...props} /> }
export function IconMeal(props: IconProps) { return <LibraryIcon glyph={Utensils} motion="tilt" {...props} /> }
export function IconProtein(props: IconProps) { return <LibraryIcon glyph={Egg} motion="tilt" {...props} /> }
export function IconCarbs(props: IconProps) { return <LibraryIcon glyph={Wheat} motion="tilt" {...props} /> }
export function IconWater(props: IconProps) { return <LibraryIcon glyph={Droplets} {...props} /> }
export function IconTrophy(props: IconProps) { return <LibraryIcon glyph={Trophy} {...props} /> }
export function IconArrowRight(props: IconProps) { return <LibraryIcon glyph={ArrowRight} motion="nudge" {...props} /> }
export function IconHistory(props: IconProps) { return <LibraryIcon glyph={History} motion="tilt" {...props} /> }
export function IconComplete(props: IconProps) { return <LibraryIcon glyph={CircleCheck} motion="draw" {...props} /> }
export function IconCloud(props: IconProps) { return <LibraryIcon glyph={CloudUpload} motion="nudge" {...props} /> }
export function IconOffline(props: IconProps) { return <LibraryIcon glyph={CloudOff} {...props} /> }
export function IconShield(props: IconProps) { return <LibraryIcon glyph={ShieldCheck} motion="draw" {...props} /> }
export function IconSprout(props: IconProps) { return <LibraryIcon glyph={Sprout} motion="tilt" {...props} /> }
export function IconRest(props: IconProps) { return <LibraryIcon glyph={Armchair} {...props} /> }
export function IconWalk(props: IconProps) { return <LibraryIcon glyph={Footprints} motion="nudge" {...props} /> }
export function IconWorkout(props: IconProps) { return <LibraryIcon glyph={Dumbbell} motion="tilt" {...props} /> }
export function IconEnergy(props: IconProps) { return <LibraryIcon glyph={Zap} {...props} /> }
export function IconBreakfast(props: IconProps) { return <LibraryIcon glyph={Sunrise} motion="nudge" {...props} /> }
export function IconLunch(props: IconProps) { return <LibraryIcon glyph={Sun} {...props} /> }
export function IconDinner(props: IconProps) { return <LibraryIcon glyph={Moon} motion="tilt" {...props} /> }

export interface IconBellProps extends IconProps {
  dot?: boolean
  dotColor?: string
  ringColor?: string
}
export function IconBell({ dot, dotColor = 'var(--coral)', ringColor = 'var(--paper-warm)', size = 20, active: _active, className = '', ...rest }: IconBellProps) {
  return <Bell size={size} aria-hidden="true" focusable="false" {...rest} className={`ui-icon ui-icon-tilt ${className}`.trim()}>
    {dot && <circle cx="18" cy="5" r="3" fill={dotColor} stroke={ringColor} strokeWidth="1.6" />}
  </Bell>
}

const foodIcons: Record<string, LucideIcon> = {
  '☕': Coffee, '🥤': Coffee, '🥗': Salad, '🥬': Salad, '🍕': Pizza,
  '🐟': Fish, '🍎': Apple, '🍏': Apple, '🥣': Soup, '🍜': Soup,
  '🍲': Soup, '🥚': Egg, '🍳': Egg, '🍞': Wheat, '🥐': Wheat,
}
const glyphIcons: Record<FoodGlyph, LucideIcon> = {
  coffee: Coffee, water: GlassWater, soda: CupSoda, milk: Milk, wine: Wine, beer: Beer,
  burger: Hamburger, pizza: Pizza, sandwich: Sandwich, chicken: Drumstick, beef: Beef, fish: Fish, shrimp: Shrimp, egg: EggFried,
  salad: Salad, carrot: Carrot, soup: Soup, bread: Wheat, croissant: Croissant,
  cookie: Cookie, cake: CakeSlice, donut: Donut, icecream: IceCreamCone, candy: Candy, popcorn: Popcorn,
  banana: Banana, apple: Apple, citrus: Citrus, cherry: Cherry, grape: Grape, nut: Nut,
  meal: Utensils,
}

/** Preserve stored meal data; change only its decorative presentation. A known emoji wins, then the meal's name. */
export function FoodIcon({ emoji, name, size = 24 }: { emoji?: string; name?: string; size?: number }) {
  const Component = foodIcons[emoji?.replace(/️/g, '') ?? ''] ?? glyphIcons[foodGlyphFor(name)]
  return <Component size={size} aria-hidden="true" focusable="false" className="ui-icon ui-icon-tilt" />
}
