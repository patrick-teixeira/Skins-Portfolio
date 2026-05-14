export interface User {
  id: string;
  username: string;
}

export interface Transaction {
  id: string;
  skinId: string;
  skinName: string;
  skinRarity: string;
  skinRarityColor: string;
  skinImage: string;
  buyPrice: number;
  purchaseDate: string;
  salePrice: number | null;
  saleFee: number | null;
  saleDate: string | null;
  notes: string;
}

export interface Skin {
  id: string;
  name: string;
  image: string;
  rarity: string;
  rarityColor: string;
}

export interface PortfolioStats {
  totalSkins: number;
  totalInvested: number;
  totalSold: number;
  totalPnl: number;
  averagePnlPercent: number;
}

export function hasSale(transaction: Transaction): boolean {
  return transaction.salePrice !== null && Number.isFinite(transaction.salePrice);
}

export function getNetSale(transaction: Transaction): number {
  if (!transaction.salePrice) return 0;
  return transaction.salePrice - getSaleFeeAmount(transaction);
}

export function getSaleFee(transaction: Transaction): number {
  return Number(transaction.saleFee) || 0;
}

export function getSaleFeeAmount(transaction: Transaction): number {
  if (!transaction.salePrice) return 0;
  return transaction.salePrice * (getSaleFee(transaction) / 100);
}

export function getPnl(transaction: Transaction): number {
  return getNetSale(transaction) - transaction.buyPrice;
}

export function getProfitPercent(transaction: Transaction): number {
  if (transaction.buyPrice <= 0) return 0;
  return (getPnl(transaction) / transaction.buyPrice) * 100;
}

export function calculateStats(transactions: Transaction[]): PortfolioStats {
  const invested = transactions.reduce((sum, t) => sum + t.buyPrice, 0);
  const sold = transactions.reduce((sum, t) => {
    if (!hasSale(t)) return sum;
    return sum + getNetSale(t);
  }, 0);
  const pnl = transactions.reduce((sum, t) => {
    if (!hasSale(t)) return sum;
    return sum + getPnl(t);
  }, 0);

  const soldItems = transactions.filter(hasSale);
  const averagePnlPercent =
    soldItems.length > 0
      ? soldItems.reduce((sum, t) => sum + getProfitPercent(t), 0) / soldItems.length
      : 0;

  return {
    totalSkins: transactions.length,
    totalInvested: invested,
    totalSold: sold,
    totalPnl: pnl,
    averagePnlPercent,
  };
}
