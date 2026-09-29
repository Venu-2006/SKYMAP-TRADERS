/** Shapes returned by the SKYMAP API. Decimals arrive as strings. */

export type Role = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  provider: 'LOCAL' | 'GOOGLE';
  emailVerified: boolean;
  locale: string;
  referralCode: string;
  walletBalance: string;
  createdAt: string;
}

export interface Session {
  user: User;
  accessToken: string;
  csrfToken: string;
}

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  mrp: string;
  price: string;
  flashSalePrice: string | null;
  flashSaleEndsAt: string | null;
  ratingAvg: number;
  ratingCount: number;
  stock: number;
  isFeatured: boolean;
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string };
  images: { url: string; alt: string | null }[];
}

export interface SpecGroup {
  group: string;
  items: { label: string; value: string }[];
}

export interface ProductDetail extends Omit<ProductCard, 'images' | 'category' | 'brand'> {
  sku: string;
  description: string;
  shortDescription: string | null;
  gstRate: string;
  hsnCode: string | null;
  minOrderQty: number;
  specifications: SpecGroup[];
  tags: string[];
  soldCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  images: { id: string; url: string; alt: string | null }[];
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string; parent: { name: string; slug: string } | null };
  seller: { businessName: string; slug: string; rating: number } | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  icon: string | null;
  parentId: string | null;
  children: Category[];
  _count?: { products: number };
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
  product?: { name: string; slug: string };
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListingMeta extends PageMeta {
  facets: {
    brands: { id: string; name: string; slug: string; count: number }[];
    price: { min: number; max: number };
  };
}

export interface HomeSections {
  featured: ProductCard[];
  trending: ProductCard[];
  flashSale: ProductCard[];
  bestSellers: ProductCard[];
  newArrivals: ProductCard[];
  forYou: ProductCard[];
}

export interface Suggestions {
  products: { id: string; name: string; slug: string; price: string; images: { url: string }[] }[];
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
  queries: string[];
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export interface Address {
  id: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  gstin?: string | null;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  gstRate: string;
  lineTotal: string;
  status: OrderStatus;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  shippingAddress: Omit<Address, 'id' | 'type' | 'isDefault'>;
  shippingMethod: string;
  subtotal: string;
  discount: string;
  shippingFee: string;
  taxAmount: string;
  total: string;
  paymentMethod: 'RAZORPAY' | 'COD';
  trackingNumber: string | null;
  courier: string | null;
  invoiceNumber: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: OrderItem[];
  coupon?: { code: string } | null;
  user?: { name: string; email: string; phone: string | null };
  payments?: { id: string; provider: string; status: string; amount: string; razorpayPaymentId: string | null; createdAt: string }[];
  statusHistory?: { id: string; status: OrderStatus; note: string | null; createdAt: string }[];
  returnRequests?: { id: string; type: string; reason: string; status: string; createdAt: string }[];
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Awaiting payment',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};
