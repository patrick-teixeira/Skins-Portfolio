export interface Skin {
  id: string;
  skinId?: string;
  name: string;
  purchasePrice: number;
  marketplace: string;
  purchaseDate: string;
  status: 'in_stock' | 'sold';
  rarity?: string;
  rarityColor?: string;
  image?: string;
  salePrice?: number;
  saleFee?: number;
  saleDate?: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  skinId: string;
  skinName: string;
  skinRarity?: string;
  skinRarityColor?: string;
  skinImage?: string;
  buyPrice: number;
  marketplace?: string;
  purchaseDate: string;
  salePrice?: number | null;
  saleFee?: number | null;
  saleDate?: string | null;
  notes?: string;
}

export interface User {
  id: string;
  username: string;
}

export interface PnLDataPoint {
  date: string;
  profit: number;
  cumulative: number;
}

export interface DashboardMetrics {
  totalProfit: number;
  totalInvested: number;
  totalSold: number;
  skinsInStock: number;
  roi: number;
  avgProfitPercent: number;
}
