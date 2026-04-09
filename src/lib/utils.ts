import { Decimal } from "@prisma/client/runtime/library";
import {
  formatDistanceToNow,
  format,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { InstrumentStatus, OrderStatus, ShipmentStatus, ProductionStatus, ModelType } from "@prisma/client";

/**
 * Format currency (USD or BRL)
 * USD: $1,234.56
 * BRL: R$ 1.234,56
 */
export function formatCurrency(
  value: number | Decimal,
  currency: "USD" | "BRL" = "USD"
): string {
  const num = typeof value === "number" ? value : value.toNumber();

  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  }

  // BRL: R$ 1.234,56
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Format date as DD/MM/YY
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yy");
}

/**
 * Format relative time in Portuguese (pt-BR)
 * "há 2 dias", "hoje", "amanhã", etc.
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isToday(d)) return "hoje";
  if (isTomorrow(d)) return "amanhã";
  if (isYesterday(d)) return "ontem";

  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

/**
 * Join truthy class strings
 */
export function cn(
  ...classes: (string | undefined | false)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Generate order number: AV-YYYYMM-NNN
 * Example: AV-202604-342
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomSuffix = String(Math.floor(Math.random() * 1000)).padStart(
    3,
    "0"
  );
  return `AV-${year}${month}-${randomSuffix}`;
}

/**
 * Get Portuguese label for InstrumentStatus
 */
export function getInstrumentStatusLabel(status: InstrumentStatus): string {
  const labels: Record<InstrumentStatus, string> = {
    EM_PRODUCAO: "Em Produção",
    PRODUZIDO: "Produzido",
    EM_TRANSITO_ESTOQUE: "Em Trânsito (Estoque)",
    EM_ESTOQUE: "Em Estoque",
    RESERVADO: "Reservado",
    EM_TRANSITO_CLIENTE: "Em Trânsito (Cliente)",
    ENTREGUE: "Entregue",
    EM_GARANTIA: "Em Garantia",
    DEVOLVIDO: "Devolvido",
    PERDIDO: "Perdido",
  };
  return labels[status] || status;
}

/**
 * Get Tailwind colors for InstrumentStatus
 * Returns { bg, text }
 */
export function getInstrumentStatusColor(
  status: InstrumentStatus
): { bg: string; text: string } {
  const colors: Record<InstrumentStatus, { bg: string; text: string }> = {
    EM_PRODUCAO: { bg: "bg-blue-100", text: "text-blue-800" },
    PRODUZIDO: { bg: "bg-green-100", text: "text-green-800" },
    EM_TRANSITO_ESTOQUE: { bg: "bg-yellow-100", text: "text-yellow-800" },
    EM_ESTOQUE: { bg: "bg-purple-100", text: "text-purple-800" },
    RESERVADO: { bg: "bg-orange-100", text: "text-orange-800" },
    EM_TRANSITO_CLIENTE: { bg: "bg-cyan-100", text: "text-cyan-800" },
    ENTREGUE: { bg: "bg-emerald-100", text: "text-emerald-800" },
    EM_GARANTIA: { bg: "bg-red-100", text: "text-red-800" },
    DEVOLVIDO: { bg: "bg-gray-100", text: "text-gray-800" },
    PERDIDO: { bg: "bg-pink-100", text: "text-pink-800" },
  };
  return colors[status] || { bg: "bg-gray-100", text: "text-gray-800" };
}

/**
 * Get Portuguese label for OrderStatus
 */
export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    RASCUNHO: "Rascunho",
    AGUARDANDO_PAGTO: "Aguardando Pagamento",
    PAGO: "Pago",
    PREPARANDO: "Preparando",
    ENVIADO: "Enviado",
    ENTREGUE: "Entregue",
    CANCELADO: "Cancelado",
    REEMBOLSADO: "Reembolsado",
  };
  return labels[status] || status;
}

/**
 * Get Tailwind colors for OrderStatus
 */
export function getOrderStatusColor(
  status: OrderStatus
): { bg: string; text: string } {
  const colors: Record<OrderStatus, { bg: string; text: string }> = {
    RASCUNHO: { bg: "bg-slate-100", text: "text-slate-800" },
    AGUARDANDO_PAGTO: { bg: "bg-yellow-100", text: "text-yellow-800" },
    PAGO: { bg: "bg-green-100", text: "text-green-800" },
    PREPARANDO: { bg: "bg-blue-100", text: "text-blue-800" },
    ENVIADO: { bg: "bg-cyan-100", text: "text-cyan-800" },
    ENTREGUE: { bg: "bg-emerald-100", text: "text-emerald-800" },
    CANCELADO: { bg: "bg-red-100", text: "text-red-800" },
    REEMBOLSADO: { bg: "bg-orange-100", text: "text-orange-800" },
  };
  return colors[status] || { bg: "bg-gray-100", text: "text-gray-800" };
}

/**
 * Get Portuguese label for ShipmentStatus
 */
export function getShipmentStatusLabel(status: ShipmentStatus): string {
  const labels: Record<ShipmentStatus, string> = {
    ETIQUETA_CRIADA: "Etiqueta Criada",
    COLETADO: "Coletado",
    EM_TRANSITO: "Em Trânsito",
    SAIU_PARA_ENTREGA: "Saiu para Entrega",
    ENTREGUE: "Entregue",
    EXCECAO: "Exceção",
    DEVOLVIDO: "Devolvido",
  };
  return labels[status] || status;
}

/**
 * Get Portuguese label for ProductionStatus
 */
export function getProductionStatusLabel(status: ProductionStatus): string {
  const labels: Record<ProductionStatus, string> = {
    ORCAMENTO: "Orçamento",
    PEDIDO_FEITO: "Pedido Feito",
    EM_PRODUCAO: "Em Produção",
    PARCIAL_PRONTO: "Parcial Pronto",
    PRONTO: "Pronto",
    DESPACHADO: "Despachado",
    RECEBIDO: "Recebido",
  };
  return labels[status] || status;
}

/**
 * Get English label for ModelType
 */
export function getModelTypeLabel(type: ModelType): string {
  const labels: Record<ModelType, string> = {
    CLASSIC: "Classic",
    SILHOUETTE: "Silhouette",
    WOOD_SERIES: "Wood Series",
    BOREALIS: "Borealis",
    CELLO: "Cello",
  };
  return labels[type] || type;
}

export interface OrderFinancials {
  total: Decimal;
  totalFees: Decimal;
  income: Decimal;
  profit: Decimal;
  totalBRL?: Decimal;
  profitBRL?: Decimal;
}

/**
 * Calculate order financials
 * Returns total, totalFees, income, profit, and BRL conversions if exchangeRate is provided
 */
export function calculateOrderFinancials(params: {
  subtotal: number | Decimal;
  shipping: number | Decimal;
  discount: number | Decimal;
  feeShopify: number | Decimal;
  feePaypal: number | Decimal;
  feeStripe: number | Decimal;
  feeAffirm: number | Decimal;
  extraHandling: number | Decimal;
  shippingCost: number | Decimal;
  productionCost: number | Decimal;
  exchangeRate?: number | Decimal;
}): OrderFinancials {
  // Convert all to Decimal
  const subtotal = new Decimal(params.subtotal);
  const shipping = new Decimal(params.shipping);
  const discount = new Decimal(params.discount);
  const feeShopify = new Decimal(params.feeShopify);
  const feePaypal = new Decimal(params.feePaypal);
  const feeStripe = new Decimal(params.feeStripe);
  const feeAffirm = new Decimal(params.feeAffirm);
  const extraHandling = new Decimal(params.extraHandling);
  const shippingCost = new Decimal(params.shippingCost);
  const productionCost = new Decimal(params.productionCost);

  // Calculate totals
  const totalFees = feeShopify
    .plus(feePaypal)
    .plus(feeStripe)
    .plus(feeAffirm)
    .plus(extraHandling);
  const total = subtotal.plus(shipping).minus(discount);
  const income = total.minus(totalFees);
  const profit = income.minus(shippingCost).minus(productionCost);

  const result: OrderFinancials = {
    total,
    totalFees,
    income,
    profit,
  };

  // BRL conversion if exchange rate provided
  if (params.exchangeRate) {
    const rate = new Decimal(params.exchangeRate);
    result.totalBRL = total.times(rate).toDecimalPlaces(2);
    result.profitBRL = profit.times(rate).toDecimalPlaces(2);
  }

  return result;
}

/**
 * Convert text to URL slug
 * Example: "My Cool Model" -> "my-cool-model"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Collapse multiple hyphens
}
