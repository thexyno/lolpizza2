export interface basketItem {
  name: string;
  quantity: number;
  selectedVariant: {
    prices: { delivery: number };
    selectedOptions: { [key: string]: { prices: { delivery: number } } };
  };
}

export interface getBasketResponse {
  content: baskets,
  meta: { Url: string, Locked: boolean, ActiveAddress: string }
}
export type mode = "host" | "client";


export interface baskets {
  [key: string]: basketItem[];
}
