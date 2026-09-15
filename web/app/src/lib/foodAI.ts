import type { AISettings } from './aiConfig'
import type { FoodAnalysis, FoodIngredientLine } from '../types'
import { completeChat, completeVision } from './aiClient'

const FOOD_JSON_SHAPE =
  `{"name":"...","servingSizeGrams":0,"ingredients":[{"item":"...","grams":0,"calories":0,"protein":0.0,"carbs":0.0,"fat":0.0,"alcohol":0.0}],"calories":0,"protein":0.0,"carbs":0.0,"fat":0.0,"emoji":"🍽️"}`

// Low temperature keeps numeric estimation consistent run-to-run instead of "creative".
const FOOD_TEMPERATURE = 0.2
const FOOD_MAX_TOKENS = 1600

function buildFoodSystemPrompt(customInstructions?: string): string {
  const custom = customInstructions?.trim()
  return `You are a meticulous nutrition estimator who reasons like an experienced dietitian using standard reference nutrition values (USDA FoodData Central style, per 100g) for each ingredient — not a rough guess.

Follow this method every time:
1. Decompose the food into its individual components: protein, starch/grain, vegetables/fruit, and — critically — every added fat or extra (cooking oil, ghee, butter, cheese, cream, mayo, dressing, sauce, sugar, batter/breading, nuts). Hidden cooking oil and sauces are the single most common reason nutrition estimates come in too low, so always account for them even if not explicitly mentioned (e.g. stir-fries, curries, and sautéed dishes typically include 1-3 tbsp of oil per serving).
2. Estimate each component's cooked weight in grams from the description or photo. If an exact quantity isn't given, assume a realistic, typical home-or-restaurant portion for that dish — not the smallest plausible amount.
3. Apply standard per-100g nutrition values for each component, scaled to its estimated grams.
4. Sum the components into totals, then verify: calories should be within ~5% of (protein_g × 4) + (carbs_g × 4) + (fat_g × 9) + (alcohol_g × 7). Adjust any component that breaks this identity before answering — it must hold exactly in your final numbers.
5. When a photo is provided, use visible objects as a size reference: a dinner plate is ~26-28cm across, a fist ≈ 1 cup, a deck of cards ≈ 85g of cooked meat, a thumb-tip ≈ 1 tbsp, a tennis ball ≈ 1 cup of rice.
${custom ? `\nThe user has shared this context about their diet/cooking — apply it when relevant: "${custom}"\n` : ''}
Respond with ONLY valid JSON in exactly this shape — no prose, no markdown fences, no comments:
${FOOD_JSON_SHAPE}

Rules for the JSON:
- "ingredients": list every component you identified (usually 2-6 lines, at least 1). Each line's own calories/protein/carbs/fat/alcohol must be internally consistent with its own grams (using the same 4/4/9/7 kcal-per-gram identity).
- "alcohol" is grams of pure alcohol (7 kcal/g) — only nonzero for alcoholic drinks, otherwise 0.
- "calories" is an integer; "protein"/"carbs"/"fat" are decimal grams.
- The top-level "calories", "protein", "carbs", "fat" must equal the sum of the ingredient lines.
- "servingSizeGrams" is the total estimated cooked weight in grams across all ingredients.
- "name" should be short and specific (e.g. "Grilled chicken burrito bowl", not just "Bowl").
- Include one representative food emoji in "emoji".`
}

function extractJSON(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found in AI response')
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
}

/** Coerces to a finite, non-negative number, falling back otherwise. Guards against AI hallucinations like negative or NaN values. */
function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Exact kcal-per-gram identity: calories must always agree with macros, never drift independently. */
function impliedCalories(protein: number, carbs: number, fat: number, alcohol = 0): number {
  return protein * 4 + carbs * 4 + fat * 9 + alcohol * 7
}

function toIngredients(raw: unknown): FoodIngredientLine[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((line): FoodIngredientLine | null => {
      if (!line || typeof line !== 'object') return null
      const l = line as Record<string, unknown>
      const item = String(l.item ?? l.name ?? '').trim()
      if (!item) return null
      const protein = safeNum(l.protein)
      const carbs = safeNum(l.carbs)
      const fat = safeNum(l.fat)
      const alcohol = safeNum(l.alcohol)
      return {
        item,
        grams: safeNum(l.grams),
        protein: round1(protein),
        carbs: round1(carbs),
        fat: round1(fat),
        // Recompute each line's calories from its own macros so every row shown to the
        // user is internally consistent, even if the model's own arithmetic drifted.
        calories: Math.round(impliedCalories(protein, carbs, fat, alcohol)),
      }
    })
    .filter((l): l is FoodIngredientLine => l !== null)
}

function sumField(lines: FoodIngredientLine[], key: 'calories' | 'protein' | 'carbs' | 'fat'): number {
  return lines.reduce((s, l) => s + l[key], 0)
}

function toAnalysis(data: Record<string, unknown>): FoodAnalysis {
  const name = String(data.name ?? 'Unknown food')
  const ingredients = toIngredients(data.ingredients)

  let calories: number
  let protein: number
  let carbs: number
  let fat: number

  if (ingredients.length > 0) {
    // Trust the decomposed, ingredient-level breakdown over a single holistic guess —
    // decomposition is the main lever that improves LLM numeric accuracy here. Sum the
    // lines' own (already macro-reconciled) calories rather than re-deriving from
    // protein/carbs/fat alone, so any alcohol content is still counted in the total.
    protein = round1(sumField(ingredients, 'protein'))
    carbs = round1(sumField(ingredients, 'carbs'))
    fat = round1(sumField(ingredients, 'fat'))
    calories = Math.round(sumField(ingredients, 'calories'))
  } else {
    // No breakdown returned (e.g. a weaker model ignored that part of the schema) —
    // fall back to the model's own totals, but still enforce macro/calorie consistency.
    protein = round1(safeNum(data.protein))
    carbs = round1(safeNum(data.carbs))
    fat = round1(safeNum(data.fat))
    const alcohol = safeNum(data.alcohol)
    const rawCalories = safeNum(data.calories)
    const implied = impliedCalories(protein, carbs, fat, alcohol)
    // Only override when they disagree substantially — avoids clobbering legitimate
    // edge cases (e.g. fiber-heavy or alcohol-only items) while catching the common
    // failure mode where the model states calories independently of its own macros.
    calories = implied > 0 && (rawCalories === 0 || Math.abs(rawCalories - implied) / implied > 0.3)
      ? Math.round(implied)
      : Math.round(rawCalories)
  }

  const servingSizeGrams = safeNum(data.serving_size_grams ?? data.servingSizeGrams) || 100
  const emoji = data.emoji != null ? String(data.emoji) : '🍽️'
  if (!name || Number.isNaN(calories)) throw new Error('Invalid food analysis response')
  return {
    name,
    calories,
    protein,
    carbs,
    fat,
    servingSizeGrams,
    emoji,
    ingredients: ingredients.length ? ingredients : undefined,
  }
}

function textPrompt(description: string): string {
  return `Estimate nutrition for this food log entry. Parse quantities, brands, and multiple items — if several distinct items are listed, include each as its own ingredient line (or group) and sum totals.
Entry: "${description}"`
}

const imagePrompt = `Identify the food in this photo and estimate its nutrition, including every visible component — sauces, oil sheen, cheese, toppings, and sides. Use the plate, utensils, container, or hands in the photo as a scale reference for the portion size.`

export async function analyzeTextFood(
  description: string,
  settings: AISettings,
  signal?: AbortSignal,
): Promise<FoodAnalysis> {
  const messages = [
    { role: 'system' as const, content: buildFoodSystemPrompt(settings.customInstructions) },
    { role: 'user' as const, content: textPrompt(description) },
  ]
  const text = await completeChat(settings, messages, FOOD_MAX_TOKENS, FOOD_TEMPERATURE, { signal, task: 'food_text' })
  return toAnalysis(extractJSON(text))
}

export async function analyzeImageFood(
  imageBase64: string,
  settings: AISettings,
  mimeType = 'image/jpeg',
  signal?: AbortSignal,
): Promise<FoodAnalysis> {
  const text = await completeVision(
    settings,
    imagePrompt,
    imageBase64,
    mimeType,
    FOOD_MAX_TOKENS,
    FOOD_TEMPERATURE,
    buildFoodSystemPrompt(settings.customInstructions),
    { signal, task: 'food_photo' },
  )
  return toAnalysis(extractJSON(text))
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const match = result.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) reject(new Error('Could not read image'))
      else resolve({ mimeType: match[1], base64: match[2] })
    }
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}
