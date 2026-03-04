import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard, type ProductCardProps } from "../product/ProductCard";

interface ProductSectionProps {
  title: string;
  products: ProductCardProps[];
  isLoading?: boolean;
  emptyMessage?: string;
}

const SKELETON_ITEMS = 6;
const ITEMS_PER_PAGE = 6;

const renderSkeletonItems = () =>
  Array.from({ length: SKELETON_ITEMS }).map((_, index) => (
    <div
      key={`skeleton-${index}`}
      className="h-full rounded-lg border border-gray-100 bg-white p-4 animate-pulse"
    >
      <div className="aspect-square w-full rounded-md bg-gray-100" />
      <div className="mt-4 h-4 rounded bg-gray-100" />
      <div className="mt-2 h-4 rounded bg-gray-100" />
      <div className="mt-4 h-5 w-1/2 rounded bg-gray-100" />
    </div>
  ));

export const ProductSection = ({
  title,
  products,
  isLoading = false,
  emptyMessage = "Hiện chưa có sản phẩm để hiển thị.",
}: ProductSectionProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const momentumRef = useRef<number | null>(null);

  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = scrollContainerRef.current.clientWidth;
    const targetScroll =
      direction === "left"
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;

    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });

    setTimeout(updateScrollButtons, 300);
  };

  // Apply momentum scrolling
  const applyMomentum = () => {
    if (!scrollContainerRef.current || Math.abs(velocityRef.current) < 0.5) {
      momentumRef.current = null;
      return;
    }

    scrollContainerRef.current.scrollLeft -= velocityRef.current;
    velocityRef.current *= 0.95; // Friction factor

    momentumRef.current = requestAnimationFrame(applyMomentum);
    updateScrollButtons();
  };

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;

    // Cancel any ongoing momentum
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }

    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    lastXRef.current = e.pageX;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();

    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.2; // Reduced multiplier for smoother feel
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;

    // Calculate velocity for momentum
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velocityRef.current = ((e.pageX - lastXRef.current) / dt) * 10;
    }
    lastXRef.current = e.pageX;
    lastTimeRef.current = now;

    updateScrollButtons();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Start momentum scrolling if velocity is significant
    if (Math.abs(velocityRef.current) > 0.5) {
      momentumRef.current = requestAnimationFrame(applyMomentum);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      velocityRef.current = 0; // No momentum on mouse leave
    }
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;

    // Cancel any ongoing momentum
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }

    setIsDragging(true);
    const touch = e.touches[0]!;
    setStartX(touch.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    lastXRef.current = touch.pageX;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();

    const touch = e.touches[0]!;
    const x = touch.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;

    // Calculate velocity for momentum
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velocityRef.current = ((touch.pageX - lastXRef.current) / dt) * 10;
    }
    lastXRef.current = touch.pageX;
    lastTimeRef.current = now;

    updateScrollButtons();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Start momentum scrolling if velocity is significant
    if (Math.abs(velocityRef.current) > 0.5) {
      momentumRef.current = requestAnimationFrame(applyMomentum);
    }
  };

  useEffect(() => {
    if (!isLoading && products.length > 0) {
      setTimeout(updateScrollButtons, 100);
    }

    const handleResize = () => updateScrollButtons();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // Clean up momentum animation
      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current);
      }
    };
  }, [isLoading, products.length]);
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">{title}</h2>
          <a
            href="#"
            className="flex items-center gap-1 text-gray-600 hover:text-red-600 font-medium"
          >
            Xem thêm
            <ChevronRight size={18} />
          </a>
        </div>

        {/* Products Carousel */}
        <div className="relative px-16">
          {/* Navigation Buttons */}
          {!isLoading && products.length > ITEMS_PER_PAGE && canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {!isLoading && products.length > ITEMS_PER_PAGE && canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* Products Container */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {renderSkeletonItems()}
            </div>
          ) : products.length > 0 ? (
            <div
              ref={scrollContainerRef}
              onScroll={updateScrollButtons}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="flex gap-4 overflow-x-auto scrollbar-hide"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none",
                scrollBehavior: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className="shrink-0"
                  style={{
                    width: "calc((100% - 5 * 1rem) / 6)",
                    minWidth: "150px",
                    pointerEvents: isDragging ? "none" : "auto",
                  }}
                >
                  <ProductCard {...product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-gray-500">
              {emptyMessage}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
