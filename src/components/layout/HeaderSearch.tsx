import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Box,
    TextField,
    InputAdornment,
    CircularProgress,
    Paper,
    Typography,
    ClickAwayListener,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Divider,
} from "@mui/material";
import {
    Search as SearchIcon,
    Bolt as VectorIcon,
    AutoGraph as HybridIcon,
} from "@mui/icons-material";
import {
    useNavigate,
    useSearchParams as useReactRouterSearchParams
} from "react-router-dom";
import debounce from "lodash/debounce";
import { productActivityLogService } from "@/services/ai/productActivityLogService";
import { aiProductSearchService } from "@/services/ai/productSearchService";
import type { ProductListItemWithVariants } from "../../types/product";
import {
    extractSuggestionGender,
    extractSuggestionPriceRange,
    formatSuggestionPriceRange,
} from "@/utils/searchSuggestionDisplay";

export const HeaderSearch = () => {
    const navigate = useNavigate();
    const [searchParams] = useReactRouterSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<ProductListItemWithVariants[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const [searchVersion, setSearchVersion] = useState<"v2" | "v3">(() => {
        return (localStorage.getItem("ai_search_version") as "v2" | "v3") || "v2";
    });

    const searchContainerRef = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(
        debounce(async (term: string, version: "v2" | "v3") => {
            if (!term.trim()) {
                setSuggestions([]);
                return;
            }

            setIsSearching(true);
            try {
                const response = await aiProductSearchService.getSearchSuggestions(term, version);
                setSuggestions(response.items || []);
            } catch (error) {
                console.error("Failed to fetch search suggestions", error);
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, searchVersion === "v3" ? 2000 : 500),
        [searchVersion]
    );

    useEffect(() => {
        debouncedSearch(searchTerm, searchVersion);
        return () => {
            debouncedSearch.cancel();
        };
    }, [searchTerm, searchVersion, debouncedSearch]);

    const handleVersionToggle = (version: "v2" | "v3") => {
        setSearchVersion(version);
        localStorage.setItem("ai_search_version", version);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setShowDropdown(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && searchTerm.trim()) {
            void productActivityLogService.logSearch(searchTerm).catch((error) => {
                console.error("Failed to log search text", error);
            });
            setShowDropdown(false);
            const params = new URLSearchParams();
            params.set("search", searchTerm.trim());
            params.set("searchVersion", searchVersion);
            navigate(`/products?${params.toString()}`);
        }
    };

    const handleSuggestionClick = (product?: ProductListItemWithVariants) => {
        const productId = product?.id;
        if (productId) {
            const variantId = product?.variants?.[0]?.id ?? null;
            void productActivityLogService.logProductView(productId, variantId).catch((error) => {
                console.error("Failed to log product click from search", error);
            });
            setShowDropdown(false);
            navigate(`/products/${productId}`);
        }
    };

    return (
        <ClickAwayListener onClickAway={() => setShowDropdown(false)}>
            <Box
                ref={searchContainerRef}
                sx={{
                    flex: 1,
                    maxWidth: 640,
                    mx: 4,
                    display: "flex",
                    justifyContent: "center",
                    position: "relative",
                    zIndex: 1400, // Make sure it's above other elements
                }}
            >
                <TextField
                    fullWidth
                    size="small"
                    placeholder={searchVersion === "v3" ? "Tìm kiếm Hybrid (Debounce 2s)..." : "Tìm kiếm sản phẩm..."}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (searchTerm.trim()) {
                            setShowDropdown(true);
                        }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Box sx={{ display: "flex", gap: 0.5, mr: 1 }}>
                                    <Box
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleVersionToggle("v2");
                                        }}
                                        sx={{
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 1,
                                            bgcolor: searchVersion === "v2" ? "primary.main" : "transparent",
                                            color: searchVersion === "v2" ? "primary.contrastText" : "text.secondary",
                                            transition: "all 0.2s",
                                            border: "1px solid",
                                            borderColor: searchVersion === "v2" ? "primary.main" : "divider",
                                            "&:hover": {
                                                bgcolor: searchVersion === "v2" ? "primary.dark" : "grey.100",
                                            }
                                        }}
                                    >
                                        <VectorIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                        <Typography variant="caption" fontWeight={700}>V2</Typography>
                                    </Box>
                                    <Box
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleVersionToggle("v3");
                                        }}
                                        sx={{
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 1,
                                            bgcolor: searchVersion === "v3" ? "secondary.main" : "transparent",
                                            color: searchVersion === "v3" ? "secondary.contrastText" : "text.secondary",
                                            transition: "all 0.2s",
                                            border: "1px solid",
                                            borderColor: searchVersion === "v3" ? "secondary.main" : "divider",
                                            "&:hover": {
                                                bgcolor: searchVersion === "v3" ? "secondary.dark" : "grey.100",
                                            }
                                        }}
                                    >
                                        <HybridIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                        <Typography variant="caption" fontWeight={700}>V3</Typography>
                                    </Box>
                                </Box>
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                {isSearching ? <CircularProgress size={20} /> : <SearchIcon color="action" />}
                            </InputAdornment>
                        ),
                    }}
                />

                {/* Dropdown Suggestions */}
                {showDropdown && searchTerm.trim().length > 0 && (
                    <Paper
                        elevation={8}
                        sx={{
                            position: "absolute",
                            top: "100%",
                            left: 4,
                            right: 4,
                            mt: 1,
                            maxHeight: 400,
                            overflowY: "auto",
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            overflow: "hidden"
                        }}
                    >
                        <Box sx={{ p: 1.5, bgcolor: "grey.50" }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                Sản phẩm gợi ý
                            </Typography>
                        </Box>
                        <Divider />

                        {isSearching && suggestions.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: "center" }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : suggestions.length > 0 ? (
                            <List sx={{ p: 0 }}>
                                {suggestions.map((product) => {
                                    const imageUrl = typeof product.primaryImage === "string"
                                        ? product.primaryImage
                                        : product.primaryImage?.url || "https://placehold.co/400x400?text=No+Image";
                                    const displayGender = extractSuggestionGender(product);
                                    const displayPriceRange = extractSuggestionPriceRange(product);
                                    const brandName = product.brandName || "Đang cập nhật";
                                    const categoryName = product.categoryName;

                                    return (
                                        <ListItem
                                            key={product.id}
                                            onClick={() => handleSuggestionClick(product)}
                                            sx={{
                                                cursor: "pointer",
                                                "&:hover": {
                                                    bgcolor: "action.hover",
                                                },
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Avatar
                                                    variant="rounded"
                                                    src={imageUrl}
                                                    alt={product.name || ""}
                                                    sx={{ width: 48, height: 48, bgcolor: "transparent" }}
                                                />
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body2" fontWeight={500} noWrap>
                                                        {product.name}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Box sx={{ mt: 0.5 }}>
                                                        {brandName && (
                                                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                                                Thương hiệu: {brandName} {categoryName ? `- ${categoryName}` : ""}
                                                            </Typography>
                                                        )}
                                                        {displayGender && (
                                                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                                                Giới tính: {displayGender}
                                                            </Typography>
                                                        )}
                                                        <Typography variant="body2" color="error.main" fontWeight={600} sx={{ mt: 0.5 }}>
                                                            {formatSuggestionPriceRange(displayPriceRange)}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                    );
                                })}
                            </List>
                        ) : (
                            <Box sx={{ p: 2, textAlign: "center" }}>
                                <Typography variant="body2" color="text.secondary">
                                    Không tìm thấy sản phẩm nào
                                </Typography>
                            </Box>
                        )}

                        <Divider />
                        <Box
                            onClick={() => {
                                void productActivityLogService.logSearch(searchTerm).catch((error) => {
                                    console.error("Failed to log search text", error);
                                });
                                setShowDropdown(false);
                                const params = new URLSearchParams();
                                params.set("search", searchTerm.trim());
                                params.set("searchVersion", searchVersion);
                                navigate(`/products?${params.toString()}`);
                            }}
                            sx={{
                                p: 1.5,
                                textAlign: "center",
                                bgcolor: "primary.50",
                                cursor: "pointer",
                                "&:hover": {
                                    bgcolor: "primary.100",
                                },
                            }}
                        >
                            <Typography variant="body2" color="primary.main" fontWeight={600}>
                                {searchVersion === "v3" ? "Xem tất cả kết quả Hybrid" : "Xem tất cả kết quả cho"} "{searchTerm}"
                            </Typography>
                        </Box>
                    </Paper>
                )}
            </Box>
        </ClickAwayListener>
    );
};
