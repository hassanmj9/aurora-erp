"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  RefreshCw,
  ShoppingCart,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface SyncStatus {
  shopifyTotal: number;
  auroraSynced: number;
  pending: number;
  lastSynced: {
    orderNumber: string;
    shopifyNumber: string;
    syncedAt: string;
  } | null;
}

interface SyncResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

interface ShopifyProduct {
  id: number;
  title: string;
  status: string;
  variants: {
    id: number;
    title: string;
    sku: string;
    price: string;
    inventoryItemId: number;
    inventoryQuantity: number;
  }[];
}

export default function ShopifyPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [inventoryResult, setInventoryResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, productsRes] = await Promise.all([
        fetch("/api/shopify/sync"),
        fetch("/api/shopify/products"),
      ]);

      if (statusRes.ok) {
        setSyncStatus(await statusRes.json());
      } else {
        const data = await statusRes.json();
        setError(data.error || "Erro ao carregar status");
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch("/api/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data);
        // Refresh status
        fetchData();
      } else {
        setError(data.error || "Erro na sincronização");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão");
    } finally {
      setSyncing(false);
    }
  }

  async function handleInventorySync() {
    setSyncingInventory(true);
    setInventoryResult(null);
    try {
      const res = await fetch("/api/shopify/inventory", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setInventoryResult(
          `Estoque atualizado: ${data.updated}/${data.total} modelos${
            data.errors?.length ? ` (${data.errors.length} erros)` : ""
          }`
        );
      } else {
        setError(data.error || "Erro ao sincronizar estoque");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão");
    } finally {
      setSyncingInventory(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Shopify"
        subtitle="Integração com a loja Aurora Violins"
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {/* Sync Result */}
        {syncResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-2">
            <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Sincronização concluída</p>
              <p className="text-sm mt-1">
                {syncResult.total} pedidos processados: {syncResult.created} criados,{" "}
                {syncResult.updated} atualizados, {syncResult.skipped} ignorados
              </p>
              {syncResult.errors && syncResult.errors.length > 0 && (
                <div className="mt-2 text-sm text-yellow-700">
                  <p className="font-medium">Avisos:</p>
                  {syncResult.errors.map((e, i) => (
                    <p key={i}>- {e}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Result */}
        {inventoryResult && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
            {inventoryResult}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <ShoppingCart size={16} />
                  <span className="text-xs font-semibold">Shopify</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {syncStatus?.shopifyTotal ?? "—"}
                </p>
                <p className="text-xs text-gray-500">pedidos totais</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <ArrowDownCircle size={16} />
                  <span className="text-xs font-semibold">Sincronizados</span>
                </div>
                <p className="text-2xl font-bold text-[#e94560]">
                  {syncStatus?.auroraSynced ?? "—"}
                </p>
                <p className="text-xs text-gray-500">no Aurora ERP</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <AlertCircle size={16} />
                  <span className="text-xs font-semibold">Pendentes</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {syncStatus?.pending ?? "—"}
                </p>
                <p className="text-xs text-gray-500">para importar</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Package size={16} />
                  <span className="text-xs font-semibold">Produtos</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {products.length}
                </p>
                <p className="text-xs text-gray-500">na loja Shopify</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-[#e94560] text-white rounded-lg font-medium hover:bg-[#d73a4f] transition-colors disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowDownCircle size={18} />
                )}
                {syncing ? "Sincronizando..." : "Importar Pedidos do Shopify"}
              </button>

              <button
                onClick={handleInventorySync}
                disabled={syncingInventory}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f3460] text-white rounded-lg font-medium hover:bg-[#0d2d54] transition-colors disabled:opacity-50"
              >
                {syncingInventory ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowUpCircle size={18} />
                )}
                {syncingInventory
                  ? "Atualizando..."
                  : "Enviar Estoque para Shopify"}
              </button>

              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={18} />
                Atualizar
              </button>

              <a
                href="https://admin.shopify.com/store/aurora-musical"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink size={18} />
                Abrir Shopify Admin
              </a>
            </div>

            {/* Last Sync Info */}
            {syncStatus?.lastSynced && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <p className="text-sm text-gray-600">
                  Último pedido sincronizado:{" "}
                  <span className="font-semibold text-gray-900">
                    {syncStatus.lastSynced.shopifyNumber}
                  </span>{" "}
                  → {syncStatus.lastSynced.orderNumber} em{" "}
                  {new Date(syncStatus.lastSynced.syncedAt).toLocaleDateString(
                    "pt-BR",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>
            )}

            {/* Products Table */}
            {products.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Produtos na Loja
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">
                          Produto
                        </th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">
                          Variante
                        </th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">
                          SKU
                        </th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-700">
                          Preço
                        </th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-700">
                          Estoque
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) =>
                        product.variants.map((variant, vi) => (
                          <tr
                            key={`${product.id}-${variant.id}`}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-2">
                              {vi === 0 ? (
                                <span className="font-medium text-gray-900">
                                  {product.title}
                                </span>
                              ) : (
                                ""
                              )}
                            </td>
                            <td className="py-3 px-2 text-gray-600">
                              {variant.title !== "Default Title"
                                ? variant.title
                                : "—"}
                            </td>
                            <td className="py-3 px-2 text-gray-500 font-mono text-xs">
                              {variant.sku || "—"}
                            </td>
                            <td className="py-3 px-2 text-right font-semibold text-gray-900">
                              ${parseFloat(variant.price).toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                  variant.inventoryQuantity > 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {variant.inventoryQuantity}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Webhook Info */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Webhook (tempo real)
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Configure o webhook no Shopify Admin para receber pedidos automaticamente:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 break-all">
                <p>
                  <span className="text-gray-500">URL:</span>{" "}
                  https://aurora-system-eight.vercel.app/api/shopify/webhook
                </p>
                <p className="mt-1">
                  <span className="text-gray-500">Eventos:</span>{" "}
                  orders/create, orders/updated, orders/paid, orders/cancelled
                </p>
                <p className="mt-1">
                  <span className="text-gray-500">Formato:</span> JSON
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
