export interface WaterEntry {
  id: string;
  amountMl: number;
  createdAt: string;
}

export interface WaterDay {
  date: string;
  totalMl: number;
  entries: WaterEntry[];
}

export interface WaterIntakeInput {
  date: string;
  amountMl: number;
}
