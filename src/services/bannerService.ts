import type { Banner, BannerPayload, BannerStatus } from "@/types/banner";

const STORAGE_KEY = "perfume-gpt:banners";
const FALLBACK_STATUS: BannerStatus = "published";
const nowIso = () => new Date().toISOString();

const seedBanners: Banner[] = [
  {
    id: "elixir-absolu",
    name: "Elixir Absolu",
    tagline: "Exclusive Release",
    description:
      "Khơi gợi những nốt hương quyến rũ với hoa hồng, vani và xạ hương chuẩn haute couture.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Mua ngay",
    ctaHref: "/products/elixir-absolu",
    notes: ["Rose", "Vanilla", "White Musk"],
    isHomeFeatured: true,
    priority: 1,
    status: "published",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "gris-dior",
    name: "Gris Dior",
    tagline: "Limited Re-Edition",
    description:
      "Bản phối 2026 mang sắc xám biểu tượng cùng hoa hồng Grasse và patchouli đầy cá tính.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Đặt giữ chỗ",
    ctaHref: "/products/gris-dior",
    notes: ["Patchouli", "Grasse Rose"],
    priority: 2,
    status: "scheduled",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "saffron-veil",
    name: "Saffron Veil",
    tagline: "Boutique Drop",
    description:
      "Định nghĩa lại mùi hương tiệc đêm với nghệ tây Ma-rốc, gỗ tuyết tùng và hổ phách.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Khám phá",
    ctaHref: "/collections/night",
    notes: ["Saffron", "Amber"],
    priority: 3,
    status: "draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const hasWindow = typeof window !== "undefined";
const createBannerId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `banner-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseBanners = (raw: string | null): Banner[] => {
  if (!raw) {
    return seedBanners;
  }
  try {
    const parsed = JSON.parse(raw) as Banner[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedBanners;
  } catch (error) {
    console.warn("Failed to parse banners from storage", error);
    return seedBanners;
  }
};

class BannerService {
  private read(): Banner[] {
    if (!hasWindow) {
      return seedBanners;
    }
    return parseBanners(window.localStorage.getItem(STORAGE_KEY));
  }

  private persist(banners: Banner[]): void {
    if (!hasWindow) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(banners));
  }

  private simulateLatency<T>(value: T, delay = 250): Promise<T> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(value), delay);
    });
  }

  async getBanners(): Promise<Banner[]> {
    const banners = this.read().sort((a, b) => a.priority - b.priority);
    return this.simulateLatency(banners);
  }

  async upsertBanner(payload: BannerPayload): Promise<Banner> {
    let banners = this.read();
    const timestamp = nowIso();

    if (payload.isHomeFeatured) {
      banners = banners.map((banner) => ({
        ...banner,
        isHomeFeatured: false,
      }));
    }

    if (payload.id) {
      const next = banners.map((banner) =>
        banner.id === payload.id
          ? {
              ...banner,
              ...payload,
              status: payload.status ?? banner.status ?? FALLBACK_STATUS,
              isHomeFeatured:
                payload.isHomeFeatured ?? banner.isHomeFeatured ?? false,
              notes: payload.notes ?? banner.notes,
              updatedAt: timestamp,
            }
          : banner,
      );
      this.persist(next);
      const updated = next.find((item) => item.id === payload.id)!;
      return this.simulateLatency(updated);
    }

    const banner: Banner = {
      id: createBannerId(),
      name: payload.name,
      tagline: payload.tagline,
      description: payload.description,
      heroImageUrl: payload.heroImageUrl,
      mobileImageUrl: payload.mobileImageUrl,
      ctaLabel: payload.ctaLabel,
      ctaHref: payload.ctaHref,
      notes: payload.notes,
      productId: payload.productId,
      isHomeFeatured: payload.isHomeFeatured ?? false,
      priority: payload.priority ?? banners.length + 1,
      status: payload.status ?? FALLBACK_STATUS,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const next = [...banners, banner];
    this.persist(next);
    return this.simulateLatency(banner);
  }

  async deleteBanner(id: string): Promise<void> {
    const next = this.read().filter((banner) => banner.id !== id);
    this.persist(next);
    await this.simulateLatency(undefined);
  }

  async reorder(bannerIdsInOrder: string[]): Promise<Banner[]> {
    const dictionary = new Map(this.read().map((banner) => [banner.id, banner] as const));
    const ordered: Banner[] = bannerIdsInOrder
      .map((id, index) => {
        const banner = dictionary.get(id);
        if (!banner) {
          return undefined;
        }
        return { ...banner, priority: index + 1, updatedAt: nowIso() };
      })
      .filter(Boolean) as Banner[];
    const leftover = this.read().filter((banner) => !dictionary.has(banner.id));
    const result = [...ordered, ...leftover];
    this.persist(result);
    return this.simulateLatency(result);
  }
}

export const bannerService = new BannerService();
