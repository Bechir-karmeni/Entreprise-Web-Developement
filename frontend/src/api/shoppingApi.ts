import { authedRequest } from "./authedRequest";
import type { PriceOffer, ShoppingBudget, ShoppingCategory, ShoppingItem, ShoppingItemInput } from "../types/shopping";

export const shoppingApi = {
  list: () => authedRequest<ShoppingItem[]>("/shopping-items"),
  prices: (id: string) => authedRequest<PriceOffer[]>(`/shopping-items/${id}/prices`),
  add: (input: ShoppingItemInput) => authedRequest<ShoppingItem>("/shopping-items", { method: "POST", body: input }),
  setChecked: (id: string, checked: boolean) =>
    authedRequest<ShoppingItem>(`/shopping-items/${id}`, { method: "PATCH", body: { checked } }),
  setCategory: (id: string, category: ShoppingCategory) =>
    authedRequest<ShoppingItem>(`/shopping-items/${id}/category`, { method: "PATCH", body: { category } }),
  setPrice: (id: string, priceCents: number | null) =>
    authedRequest<ShoppingItem>(`/shopping-items/${id}/price`, { method: "PATCH", body: { priceCents } }),
  remove: (id: string) => authedRequest<void>(`/shopping-items/${id}`, { method: "DELETE" }),
  getBudget: () => authedRequest<ShoppingBudget>("/shopping-budget"),
  setBudget: (amountCents: number | null) =>
    authedRequest<ShoppingBudget>("/shopping-budget", { method: "PUT", body: { amountCents } }),
};
