/** One food found in a meal photo, with its estimated amount and nutrition. Values are estimates. */
export interface FoodPhotoItem {
  name: string;
  grams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
}
