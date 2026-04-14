export type BannerPosition =
  | "HomeHeroSlider"
  | "HomeSubBanner"
  | "Popup"
  | "CategoryTop";

export type BannerLinkType = "Campaign" | "Product" | "ProductVariant" | "Brand";

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  imagePublicId: string | null;
  mobileImageUrl: string | null;
  mobileImagePublicId: string | null;
  altText: string | null;
  position: BannerPosition;
  displayOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  linkType: BannerLinkType;
  linkTarget: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateBannerPayload {
  title: string;
  temporaryImageId: string;
  temporaryMobileImageId?: string | null;
  altText?: string | null;
  position: BannerPosition;
  displayOrder?: number;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  linkType: BannerLinkType;
  linkTarget: string;
}

export interface UpdateBannerPayload {
  title: string;
  temporaryImageId?: string | null;
  temporaryMobileImageId?: string | null;
  altText?: string | null;
  position: BannerPosition;
  displayOrder: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  linkType: BannerLinkType;
  linkTarget: string;
}

export interface TemporaryBannerImage {
  id: string;
  url: string;
  altText: string | null;
  displayOrder: number;
  fileSize: number | null;
  mimeType: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface BannerListParams {
  SearchTerm?: string;
  Position?: BannerPosition;
  IsActive?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
}

export interface PaginatedBannerResponse {
  items: Banner[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
