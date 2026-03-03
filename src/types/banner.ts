export type BannerStatus = "draft" | "scheduled" | "published";

export interface Banner {
  id: string;
  name: string;
  tagline: string;
  description: string;
  heroImageUrl: string;
  mobileImageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  notes?: string[];
  productId?: string;
  isHomeFeatured?: boolean;
  priority: number;
  status: BannerStatus;
  createdAt: string;
  updatedAt: string;
}

export type BannerPayload = Omit<Banner, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};
