export interface ScrapedItem {
  externalProductKey: string;
  name: string;
  regularPrice: number;
  memberPrice: number | null;
  unit: string;
}
