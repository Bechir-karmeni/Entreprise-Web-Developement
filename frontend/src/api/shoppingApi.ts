import { authedRequest } from "./authedRequest";
import type { ShoppingItem, ShoppingItemInput } from "../types/shopping";

export const shoppingApi = {
  list: () => authedRequest<ShoppingItem[]>("/shopping-items"),
  add: (input: ShoppingItemInput) => authedRequest<ShoppingItem>("/shopping-items", { method: "POST", body: input }),
  setChecked: (id: string, checked: boolean) =>
    authedRequest<ShoppingItem>(`/shopping-items/${id}`, { method: "PATCH", body: { checked } }),
  remove: (id: string) => authedRequest<void>(`/shopping-items/${id}`, { method: "DELETE" }),
};
