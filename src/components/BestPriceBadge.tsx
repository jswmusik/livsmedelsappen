export interface PriceInfo {
  price: number;
  isMember: boolean;
  storeName: string;
  scrapedAt: string;
}

export function BestPriceBadge({ info }: { info: PriceInfo | undefined }) {
  if (!info) return null;

  return (
    <p className="text-xs text-green-700">
      Bästa pris: {info.price.toFixed(2)} kr hos {info.storeName}
      {info.isMember ? " (medlemspris)" : ""}
    </p>
  );
}
