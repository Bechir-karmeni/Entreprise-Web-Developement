/**
 * Finds food in a photo on the user's device, with no API key and no server.
 * The model (CLIP) compares the photo with a list of food names and returns the closest ones.
 * The first use downloads the model; the browser then keeps it in its cache.
 */
const MODEL = "Xenova/clip-vit-base-patch32";
const MIN_SCORE = 0.04;
const MAX_ITEMS = 8;

/** Foods the model may name. Lowercase English, one item each. */
export const FOOD_LABELS: string[] = [
  "egg", "milk", "cheese", "butter", "yogurt", "cream", "tofu",
  "chicken breast", "chicken thigh", "beef", "minced meat", "pork", "salmon", "tuna", "shrimp", "fish fillet", "sausage", "bacon", "ham",
  "rice", "pasta", "bread", "oats", "flour", "potato", "sweet potato", "couscous", "quinoa", "lentils", "chickpeas", "black beans",
  "tomato", "cucumber", "lettuce", "spinach", "carrot", "onion", "garlic", "bell pepper", "broccoli", "cauliflower", "zucchini",
  "eggplant", "mushroom", "corn", "peas", "cabbage", "avocado", "lemon", "lime", "apple", "banana", "orange", "strawberry",
  "blueberries", "grapes", "pear", "mango", "pineapple", "watermelon", "peach",
  "olive oil", "honey", "peanut butter", "jam", "nuts", "almonds", "walnuts", "chocolate", "sugar", "salt", "spices", "soy sauce",
  "ketchup", "mustard", "mayonnaise", "hummus", "canned tomatoes", "tuna can", "frozen vegetables", "frozen fish", "ice cream",
  "orange juice", "water bottle", "beer", "wine", "coffee", "tea",
];

type ClassifierResult = { label: string; score: number }[];
type Classifier = (image: string, labels: string[], options: { hypothesis_template: string }) => Promise<ClassifierResult>;

let classifierPromise: Promise<Classifier> | null = null;

function loadClassifier(): Promise<Classifier> {
  if (!classifierPromise) {
    classifierPromise = import("@huggingface/transformers")
      .then(async ({ pipeline }) => {
        const classifier = await pipeline("zero-shot-image-classification", MODEL, { dtype: "q8" });
        return classifier as unknown as Classifier;
      })
      .catch((error: unknown) => {
        classifierPromise = null;
        throw error;
      });
  }
  return classifierPromise;
}

/** Returns the foods the model finds in the image, best match first. Empty when nothing is clear enough. */
export async function detectFoods(imageUrl: string): Promise<string[]> {
  const classify = await loadClassifier();
  const results = await classify(imageUrl, FOOD_LABELS, { hypothesis_template: "a photo of {}" });
  return [...results]
    .sort((a, b) => b.score - a.score)
    .filter((result) => result.score >= MIN_SCORE)
    .slice(0, MAX_ITEMS)
    .map((result) => result.label);
}
