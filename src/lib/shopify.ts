/**
 * Shopify Admin API Client for Aurora Violins ERP
 * Uses REST Admin API (2025-01 version)
 */

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || "";
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || "";
const API_VERSION = "2025-01";

function getBaseUrl() {
  return `https://${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}`;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
  };
}

// =============================================================================
// TYPES
// =============================================================================

export interface ShopifyOrder {
  id: number;
  name: string; // "#1042"
  order_number: number;
  email: string;
  created_at: string;
  updated_at: string;
  financial_status: string; // "paid", "pending", "refunded"
  fulfillment_status: string | null; // null, "fulfilled", "partial"
  total_price: string;
  subtotal_price: string;
  total_shipping_price_set: {
    shop_money: { amount: string; currency_code: string };
  };
  total_discounts: string;
  currency: string;
  customer: ShopifyCustomer | null;
  line_items: ShopifyLineItem[];
  shipping_address: ShopifyAddress | null;
  billing_address: ShopifyAddress | null;
  note: string | null;
  tags: string;
  cancelled_at: string | null;
  refunds: ShopifyRefund[];
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  default_address?: ShopifyAddress;
}

export interface ShopifyAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone: string | null;
  country_code: string;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  variant_title: string;
  quantity: number;
  price: string;
  sku: string;
  product_id: number | null;
  variant_id: number | null;
}

export interface ShopifyRefund {
  id: number;
  created_at: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  variants: ShopifyVariant[];
  status: string;
}

export interface ShopifyVariant {
  id: number;
  title: string;
  sku: string;
  price: string;
  inventory_item_id: number;
  inventory_quantity: number;
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number;
}

// =============================================================================
// API CALLS
// =============================================================================

async function shopifyFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${text}`);
  }

  return res.json();
}

// --- Orders ---

export async function fetchShopifyOrders(params?: {
  status?: string;
  since_id?: number;
  created_at_min?: string;
  created_at_max?: string;
  limit?: number;
}): Promise<ShopifyOrder[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.since_id) searchParams.set("since_id", String(params.since_id));
  if (params?.created_at_min) searchParams.set("created_at_min", params.created_at_min);
  if (params?.created_at_max) searchParams.set("created_at_max", params.created_at_max);
  searchParams.set("limit", String(params?.limit || 50));

  const qs = searchParams.toString();
  const data = await shopifyFetch<{ orders: ShopifyOrder[] }>(
    `/orders.json${qs ? `?${qs}` : ""}`
  );
  return data.orders;
}

export async function fetchShopifyOrder(orderId: number): Promise<ShopifyOrder> {
  const data = await shopifyFetch<{ order: ShopifyOrder }>(`/orders/${orderId}.json`);
  return data.order;
}

export async function countShopifyOrders(): Promise<number> {
  const data = await shopifyFetch<{ count: number }>(`/orders/count.json?status=any`);
  return data.count;
}

// --- Products ---

export async function fetchShopifyProducts(limit = 50): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{ products: ShopifyProduct[] }>(
    `/products.json?limit=${limit}`
  );
  return data.products;
}

// --- Inventory ---

export async function fetchInventoryLevels(
  inventoryItemIds: number[]
): Promise<ShopifyInventoryLevel[]> {
  const ids = inventoryItemIds.join(",");
  const data = await shopifyFetch<{ inventory_levels: ShopifyInventoryLevel[] }>(
    `/inventory_levels.json?inventory_item_ids=${ids}`
  );
  return data.inventory_levels;
}

export async function setInventoryLevel(
  inventoryItemId: number,
  locationId: number,
  available: number
): Promise<void> {
  await shopifyFetch(`/inventory_levels/set.json`, {
    method: "POST",
    body: JSON.stringify({
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available,
    }),
  });
}

// --- Locations ---

export async function fetchLocations(): Promise<{ id: number; name: string }[]> {
  const data = await shopifyFetch<{ locations: { id: number; name: string }[] }>(
    `/locations.json`
  );
  return data.locations;
}

// --- Fulfillments ---

export async function createFulfillment(
  orderId: number,
  trackingNumber: string,
  trackingCompany: string,
  lineItemIds?: number[]
): Promise<void> {
  const fulfillment: Record<string, unknown> = {
    tracking_number: trackingNumber,
    tracking_company: trackingCompany,
    notify_customer: true,
  };

  if (lineItemIds && lineItemIds.length > 0) {
    fulfillment.line_items = lineItemIds.map((id) => ({ id }));
  }

  await shopifyFetch(`/orders/${orderId}/fulfillments.json`, {
    method: "POST",
    body: JSON.stringify({ fulfillment }),
  });
}

// =============================================================================
// HELPERS — Mapping Shopify → Aurora
// =============================================================================

export function mapShopifyFinancialStatus(
  status: string,
  cancelledAt: string | null
): "RASCUNHO" | "AGUARDANDO_PAGTO" | "PAGO" | "CANCELADO" | "REEMBOLSADO" {
  if (cancelledAt) return "CANCELADO";
  switch (status) {
    case "paid":
      return "PAGO";
    case "pending":
    case "authorized":
      return "AGUARDANDO_PAGTO";
    case "refunded":
      return "REEMBOLSADO";
    case "partially_refunded":
      return "PAGO";
    case "voided":
      return "CANCELADO";
    default:
      return "RASCUNHO";
  }
}

export function mapShopifyFulfillmentStatus(
  fulfillmentStatus: string | null,
  financialStatus: string
): "RASCUNHO" | "AGUARDANDO_PAGTO" | "PAGO" | "PREPARANDO" | "ENVIADO" | "ENTREGUE" | "CANCELADO" | "REEMBOLSADO" {
  const baseStatus = mapShopifyFinancialStatus(financialStatus, null);
  if (baseStatus !== "PAGO") return baseStatus;

  switch (fulfillmentStatus) {
    case "fulfilled":
      return "ENTREGUE";
    case "partial":
      return "ENVIADO";
    default:
      return "PAGO";
  }
}

/**
 * Generate Aurora order number from Shopify order
 */
export function generateOrderNumber(shopifyOrderNumber: string, date: Date): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const num = shopifyOrderNumber.replace("#", "").padStart(3, "0");
  return `AV-${yy}${mm}-${num}`;
}

/**
 * Check if Shopify is configured
 */
export function isShopifyConfigured(): boolean {
  return Boolean(SHOPIFY_STORE_URL && SHOPIFY_ACCESS_TOKEN);
}
