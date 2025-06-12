export interface Game {
  id: number;
  name: string;
  price: string;
  type: string;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface DigitalProduct {
  game_id: number;
  game: Game;
  downloadUrl: string;
}

export interface ConsoleCardProduct {
  game_id: number;
  game: Game;
  platform: string;
}

export interface DummyProduct {
  game_id: number;
}

export interface ProductsResponse<T> {
  totalNumber: number;
  data: T[];
}

export type ProductsState = {
  digital: DigitalProduct[];
  consoleCard: ConsoleCardProduct[];
  dummy: DummyProduct[];
  loading: boolean;
  error: string | null;
  digitalPage: number;
  consoleCardPage: number;
  digitalHasMore: boolean;
  consoleCardHasMore: boolean;
  dummyPage: number;
  dummyHasMore: boolean;
}; 