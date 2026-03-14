import { useState, useRef, useEffect } from "react";
import { trendService } from "@/services/ai/trendService";
import type { ProductCardProps } from "@/components/product/ProductCard";
import { normalizeTrendProducts } from "@/utils/productCardMapper";
import { useToast } from "@/hooks/useToast";

export const useAdminTrend = () => {
    const { showToast } = useToast();
    const [trendingProducts, setTrendingProducts] = useState<ProductCardProps[]>([]);

    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchTrendingData = async (forceRefresh: boolean = false) => {
        try {
            if (forceRefresh) {
                setIsRefreshing(true);
            }

            setError(null);

            let products = await trendService.getCurrentOrPreviousWeeklyTrend(forceRefresh);

            if (products === null) {
                setIsPolling(true);
                pollTimerRef.current = setTimeout(() => {
                    void fetchTrendingData(false);
                }, 3000);
            } else {
                setTrendingProducts(normalizeTrendProducts(products));
                setIsPolling(false);
                setIsRefreshing(false);
                setIsInitialLoad(false);
                if (forceRefresh && products.length > 0) {
                    showToast("Đã cập nhật dữ liệu xu hướng mới nhất", "success");
                }
            }

        } catch (err: any) {
            console.error("Failed Admin trend fetch:", err);
            setError("Không thể lấy dữ liệu phân tích xu hướng. Xin thử lại.");
            setIsPolling(false);
            setIsRefreshing(false);
            setIsInitialLoad(false);
        }
    };

    useEffect(() => {
        void fetchTrendingData(false);
        return () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleForceRefresh = () => {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        setTrendingProducts([]);
        setIsPolling(true);
        void fetchTrendingData(true);
    };

    return {
        trendingProducts,
        isInitialLoad,
        isRefreshing,
        isPolling,
        error,
        handleForceRefresh
    };
};
