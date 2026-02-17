export interface CheckoutStep {
  id: number;
  label: string;
  description: string;
}

export interface OrderSummaryItem {
  id: string;
  brand: string;
  name: string;
  variant?: string;
  volume?: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  packaging?: number;
  tax: number;
  total: number;
  loyaltyPoints?: number;
}

export interface CartItem extends OrderSummaryItem {
  sku?: string;
  notes?: string;
}

export const checkoutSteps: CheckoutStep[] = [
  {
    id: 1,
    label: "Delivery Method",
    description: "Select your preferred fulfillment option",
  },
  {
    id: 2,
    label: "Packaging & Gifting",
    description: "Choose presentation and gifting extras",
  },
  {
    id: 3,
    label: "Payment",
    description: "Secure your preferred payment method",
  },
];

export const demoCartItems: CartItem[] = [
  {
    id: "cart-ralph",
    brand: "RALPH LAUREN",
    name: "Ralph Lauren Polo Blue",
    variant: "Eau de Toilette",
    volume: "125 ml",
    sku: "110100201185",
    price: 2350000,
    quantity: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1527799344724-4a5805b7c4b1?auto=format&fit=crop&w=400&q=80",
    notes: "Fresh aquatic accord with vibrant citrus opening",
  },
];

export const sampleOrderItems: OrderSummaryItem[] = [
  {
    id: "order-oud",
    brand: "Maison Francis Kurkdjian",
    name: "Oud Satin Mood Extrait de Parfum",
    variant: "Extrait de Parfum",
    volume: "6.8 fl oz",
    price: 7800000,
    quantity: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "order-baccarat",
    brand: "Maison Francis Kurkdjian",
    name: "Baccarat Rouge 540",
    variant: "Eau de Parfum",
    volume: "3.4 fl oz",
    price: 6500000,
    quantity: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  },
];

export const sampleOrderTotals: OrderTotals = {
  subtotal: 14300000,
  shipping: 0,
  packaging: 0,
  tax: 1144000,
  total: 15444000,
  loyaltyPoints: 10500,
};
