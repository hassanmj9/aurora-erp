/**
 * Client-safe utility functions — NO Prisma imports
 * These can be safely imported in "use client" components
 */

import {
  formatDistanceToNow,
  format,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Status types (mirrored from Prisma enums for client use) ───

export type InstrumentStatus =
  | "EM_PRODUCAO"
  | "PRODUZIDO"
  | "EM_TRANSITO_ESTOQUE"
  | "EM_ESTOQUE"
  | "RESERVADO"
  | "EM_TRANSITO_CLIENTE"
  | "ENTREGUE"
  | "EM_GARANTIA"
  | "DEVOLVIDO"
  | "PERDIDO";

export type OrderStatus =
  | "RASCUNHO"
  | "AGUARDANDO_PAGTO"
  | "PAGO"
  | "PREPARANDO"
  | "ENVIADO"
  | "ENTREGUE"
  | "CANCELADO"
  | "REEMBOLSADO";

export type ShipmentStatus =
  | "ETIQUETA_CRIADA"
  | "COLETADO"
  | "EM_TRANSITO"
  | "SAIU_PARA_ENTREGA"
  | "ENTREGUE"
  | "EXCECAO"
  | "DEVOLVIDO";

export type ProductionStatus =
  | "ORCAMENTO"
  | "PEDIDO_FEITO"
  | "EM_PRODUCAO"
  | "PARCIAL_PRONTO"
  | "PRONTO"
  | "DESPACHADO"
  | "RECEBIDO";

export type ModelType =
  | "CLASSIC"
  | "SILHOUETTE"
  | "WOOD_SERIES"
  | "BOREALIS"
  | "CELLO"
  | "GHOST"
  | "AURO";

// ─── Formatting ───

/**
 * Format currency (USD or BRL)
 */
export function formatCurrency(
  value: number | string,
  currency: "USD" | "BRL" = "USD"
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return currency === "USD" ? "$0.00" : "R$ 0,00";

  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  }

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
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Status Labels (pt-BR) ───

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

export function getShipmentStatusColor(
  status: ShipmentStatus
): { bg: string; text: string } {
  const colors: Record<ShipmentStatus, { bg: string; text: string }> = {
    ETIQUETA_CRIADA: { bg: "bg-slate-100", text: "text-slate-800" },
    COLETADO: { bg: "bg-blue-100", text: "text-blue-800" },
    EM_TRANSITO: { bg: "bg-cyan-100", text: "text-cyan-800" },
    SAIU_PARA_ENTREGA: { bg: "bg-yellow-100", text: "text-yellow-800" },
    ENTREGUE: { bg: "bg-emerald-100", text: "text-emerald-800" },
    EXCECAO: { bg: "bg-red-100", text: "text-red-800" },
    DEVOLVIDO: { bg: "bg-gray-100", text: "text-gray-800" },
  };
  return colors[status] || { bg: "bg-gray-100", text: "text-gray-800" };
}

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

export function getProductionStatusColor(
  status: ProductionStatus
): { bg: string; text: string } {
  const colors: Record<ProductionStatus, { bg: string; text: string }> = {
    ORCAMENTO: { bg: "bg-slate-100", text: "text-slate-800" },
    PEDIDO_FEITO: { bg: "bg-blue-100", text: "text-blue-800" },
    EM_PRODUCAO: { bg: "bg-yellow-100", text: "text-yellow-800" },
    PARCIAL_PRONTO: { bg: "bg-orange-100", text: "text-orange-800" },
    PRONTO: { bg: "bg-green-100", text: "text-green-800" },
    DESPACHADO: { bg: "bg-cyan-100", text: "text-cyan-800" },
    RECEBIDO: { bg: "bg-emerald-100", text: "text-emerald-800" },
  };
  return colors[status] || { bg: "bg-gray-100", text: "text-gray-800" };
}

export function getModelTypeLabel(type: ModelType): string {
  const labels: Record<ModelType, string> = {
    CLASSIC: "Classic",
    SILHOUETTE: "Silhouette",
    WOOD_SERIES: "Wood Series",
    BOREALIS: "Borealis",
    CELLO: "Cello",
    GHOST: "Ghost",
    AURO: "Auro",
  };
  return labels[type] || type;
}

/**
 * Convert text to URL slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
