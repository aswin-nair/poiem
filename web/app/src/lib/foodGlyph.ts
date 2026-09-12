/**
 * Picks a line icon for a meal from its name, so a manual entry called
 * "Avocado toast" doesn't look identical to "Chicken rice bowl".
 * Decoration only: the stored entry never changes.
 */
export type FoodGlyph =
  | 'coffee' | 'water' | 'soda' | 'milk' | 'wine' | 'beer'
  | 'burger' | 'pizza' | 'sandwich' | 'chicken' | 'beef' | 'fish' | 'shrimp' | 'egg'
  | 'salad' | 'carrot' | 'soup' | 'bread' | 'croissant'
  | 'cookie' | 'cake' | 'donut' | 'icecream' | 'candy' | 'popcorn'
  | 'banana' | 'apple' | 'citrus' | 'cherry' | 'grape' | 'nut'
  | 'meal'

/* Order matters: the first match wins, so specific foods come before the broad ones. */
const RULES: ReadonlyArray<readonly [RegExp, FoodGlyph]> = [
  [/\b(cookies?|biscuits?|brownies?)\b/, 'cookie'],
  [/\b(cake|cheesecake|muffins?|cupcakes?|pie|tart|pancakes?|waffles?)\b/, 'cake'],
  [/\b(donuts?|doughnuts?)\b/, 'donut'],
  [/\b(ice ?cream|gelato|froyo|sundae)\b/, 'icecream'],
  [/\b(chocolate|candy|sweets|gummies|dessert)\b/, 'candy'],
  [/\bpopcorn\b/, 'popcorn'],
  [/\b(coffee|latte|espresso|cappuccino|americano|flat white|mocha|tea|chai|matcha)\b/, 'coffee'],
  [/\b(smoothie|milkshake|shake|milk|yogh?urt|kefir|lassi)\b/, 'milk'],
  [/\b(juice|soda|cola|lemonade|kombucha)\b/, 'soda'],
  [/\bwater\b/, 'water'],
  [/\b(wine|prosecco|champagne)\b/, 'wine'],
  [/\b(beer|ale|lager|cider)\b/, 'beer'],
  [/\b(burgers?|cheeseburger)\b/, 'burger'],
  [/\bpizza\b/, 'pizza'],
  [/\b(sandwich|wrap|burrito|taco|sub|panini|toastie)\b/, 'sandwich'],
  [/\b(sushi|salmon|tuna|cod|fish|sardines?|mackerel)\b/, 'fish'],
  [/\b(shrimp|prawns?|lobster|crab)\b/, 'shrimp'],
  [/\b(chicken|turkey|wings?|drumsticks?)\b/, 'chicken'],
  [/\b(beef|steak|lamb|pork|bacon|sausages?|ham|meatballs?)\b/, 'beef'],
  [/\b(eggs?|omelett?e|frittata|shakshuka)\b/, 'egg'],
  [/\b(salad|greens|spinach|kale|lettuce)\b/, 'salad'],
  [/\b(soup|stew|curry|ramen|noodles?|pho|dal|porridge|oats|oatmeal|granola|cereal|bowl)\b/, 'soup'],
  [/\b(croissants?|pastry|pastries|danish)\b/, 'croissant'],
  [/\b(toast|bread|bagels?|pasta|spaghetti|rice|tortilla|pitta|pita|naan|roti|chapati|crackers?)\b/, 'bread'],
  [/\b(carrots?|vegetables?|veggies|broccoli|peppers?|beans|lentils|hummus)\b/, 'carrot'],
  [/\bbananas?\b/, 'banana'],
  [/\b(apples?|pears?)\b/, 'apple'],
  [/\b(oranges?|lemons?|limes?|grapefruit|clementines?|mandarins?)\b/, 'citrus'],
  [/\b(berries|strawberr(y|ies)|blueberr(y|ies)|raspberr(y|ies)|cherr(y|ies))\b/, 'cherry'],
  [/\bgrapes?\b/, 'grape'],
  [/\b(nuts?|almonds?|peanuts?|cashews?|walnuts?|trail mix|peanut butter)\b/, 'nut'],
]

export function foodGlyphFor(name: string | undefined): FoodGlyph {
  const text = (name ?? '').toLowerCase()
  if (!text.trim()) return 'meal'
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? 'meal'
}
