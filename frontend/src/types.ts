export interface basketItem {
  name: string;
  quantity: number;
  selectedVariant: {
    prices: { delivery: number};
    selectedOptions: { [key: string]: { prices: { delivery: number } } };
  };
}

export type mode = "host" | "client";


export interface baskets {
  [key: string]: basketItem[];
}
