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
import { Search as SearchIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
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
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<ProductListItemWithVariants[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const searchContainerRef = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(
        debounce(async (term: string) => {
            if (!term.trim()) {
                setSuggestions([]);
                return;
            }

            setIsSearching(true);
            try {
                const response = await aiProductSearchService.getSearchSuggestions(term);
                setSuggestions(response.items || []);
            } catch (error) {
                console.error("Failed to fetch search suggestions", error);
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, 800),
        []
    );

    useEffect(() => {
        debouncedSearch(searchTerm);
        return () => {
            debouncedSearch.cancel();
        };
    }, [searchTerm, debouncedSearch]);


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
            navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
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
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (searchTerm.trim()) {
                            setShowDropdown(true);
                        }
                    }}
                    InputProps={{
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
                                navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
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
                                Xem tất cả kết quả cho "{searchTerm}"
                            </Typography>
                        </Box>
                    </Paper>
                )}
            </Box>
        </ClickAwayListener>
    );
};
