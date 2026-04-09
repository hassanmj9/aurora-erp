"use client";

import { useState } from "react";
import { Plus, Trash2, Calendar } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, formatDate } from "@/lib/utils-client";

interface ProductionItem {
  id: string;
  modelType: string;
  strings: number;
  color: string;
  quantity: number;
  unitCost: number;
}

interface PaymentSchedule {
  installment: number;
  description: string;
  percentage: number;
  amount: number;
  dueDate: string;
}

const MODEL_TYPES = ["CLASSIC", "SILHOUETTE", "WOOD_SERIES", "BOREALIS", "CELLO", "GHOST", "AURO"];
const STRINGS_OPTIONS = [4, 5];
const COLORS = [
  "White",
  "Black",
  "Gold",
  "Silver",
  "Red",
  "Ruby",
  "Acqua",
  "Natural",
  "Sunburst",
  "Carbon",
  "Red Bordeaux",
  "Blue",
  "Sapphire",
];

function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function buildPaymentSchedule(total: number, deliveryDate: Date): PaymentSchedule[] {
  const today = new Date();
  const schedule: PaymentSchedule[] = [];

  schedule.push({
    installment: 1,
    description: "20% Pedido",
    percentage: 20,
    amount: total * 0.2,
    dueDate: formatDateISO(today),
  });

  schedule.push({
    installment: 2,
    description: "20% Entrega",
    percentage: 20,
    amount: total * 0.2,
    dueDate: formatDateISO(deliveryDate),
  });

  const firstParcelaDate = new Date(deliveryDate);
  if (deliveryDate.getDate() >= 10) {
    firstParcelaDate.setMonth(firstParcelaDate.getMonth() + 1);
  }
  firstParcelaDate.setDate(10);

  for (let i = 0; i < 4; i++) {
    const parcelaDate = new Date(firstParcelaDate);
    parcelaDate.setMonth(parcelaDate.getMonth() + i);
    schedule.push({
      installment: 3 + i,
      description: `Parcela ${i + 1}/4`,
      percentage: 15,
      amount: total * 0.15,
      dueDate: formatDateISO(parcelaDate),
    });
  }

  return schedule;
}

export default function NovoProducaoPage() {
  const [items, setItems] = useState<ProductionItem[]>([
    {
      id: "1",
      modelType: "CLASSIC",
      strings: 4,
      color: "White",
      quantity: 1,
      unitCost: 1800,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const hasCello = items.some((item) => item.modelType === "CELLO");
  const estimatedDeliveryDays = hasCello ? 90 : 60;
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDeliveryDays);

  const paymentSchedule = buildPaymentSchedule(totalCost, estimatedDelivery);

  function addItem() {
    const newItem: ProductionItem = {
      id: String(Date.now()),
      modelType: "CLASSIC",
      strings: 4,
      color: "White",
      quantity: 1,
      unitCost: 1800,
    };
    setItems([...items, newItem]);
  }

  function removeItem(id: string) {
    setItems(items.filter((item) => item.id !== id));
  }

  function updateItem(id: string, field: string, value: any) {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (items.length === 0) {
        throw new Error("Adicione pelo menos um item");
      }

      // Generate production order code (A1, A2, etc. - will be unique in DB)
      const timestamp = Date.now().toString().slice(-3);
      const code = `A${timestamp}`;

      const payload = {
        code,
        description: `Pedido de Produção - ${new Date().toLocaleDateString("pt-BR")}`,
        items: items.map((item) => ({
          modelType: item.modelType,
          strings: item.strings,
          color: item.color,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
        totalCostBRL: totalCost,
        estimatedDelivery: formatDateISO(estimatedDelivery),
        paymentSchedule,
      };

      const response = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao criar pedido");
      }

      const data = await response.json();
      setSuccessMessage(`Pedido criado com sucesso: ${data.code}`);

      // Redirect to production order detail page
      setTimeout(() => {
        window.location.href = `/producao/${data.id}`;
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Novo Pedido de Produção"
        subtitle="Crie um novo pedido de produção para a fábrica"
      />

      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {successMessage}
            </div>
          )}

          {/* Items Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Itens do Pedido</h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-2 bg-[#e94560] text-white rounded-lg font-medium hover:bg-[#d73a4f] transition-colors"
              >
                <Plus size={18} />
                Adicionar Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-end pb-4 border-b border-gray-200 last:border-b-0"
                >
                  {/* Model Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Modelo
                    </label>
                    <select
                      value={item.modelType}
                      onChange={(e) =>
                        updateItem(item.id, "modelType", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    >
                      {MODEL_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Strings */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Cordas
                    </label>
                    <select
                      value={item.strings}
                      onChange={(e) =>
                        updateItem(item.id, "strings", parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    >
                      {STRINGS_OPTIONS.map((str) => (
                        <option key={str} value={str}>
                          {str}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Cor
                    </label>
                    <select
                      value={item.color}
                      onChange={(e) =>
                        updateItem(item.id, "color", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    >
                      {COLORS.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Qtd
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    />
                  </div>

                  {/* Unit Cost */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Custo Unit. (BRL)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) =>
                        updateItem(item.id, "unitCost", parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    />
                  </div>

                  {/* Line Total */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Total
                    </label>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm font-semibold text-gray-900">
                      {formatCurrency(item.quantity * item.unitCost, "BRL")}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div className="flex justify-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary & Calculated Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Cost */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <p className="text-xs text-gray-600 mb-1">Custo Total</p>
              <p className="text-2xl font-bold text-[#e94560]">
                {formatCurrency(totalCost, "BRL")}
              </p>
            </div>

            {/* Estimated Delivery */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Calendar size={14} />
                Entrega Estimada
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(estimatedDelivery.toISOString())}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {estimatedDeliveryDays} dias {hasCello ? "(Cello)" : "(Violino)"}
              </p>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <p className="text-xs text-gray-600 mb-1">Esquema de Pagamento</p>
              <p className="text-lg font-semibold text-gray-900">6 Parcelas</p>
              <p className="text-xs text-gray-500 mt-1">
                20% + 20% + 4×15%
              </p>
            </div>
          </div>

          {/* Payment Schedule Preview */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Cronograma de Pagamentos
            </h2>
            <div className="space-y-3">
              {paymentSchedule.map((payment) => (
                <div
                  key={payment.installment}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {payment.description}
                    </p>
                    <p className="text-sm text-gray-600">
                      Vencimento: {formatDate(payment.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {formatCurrency(payment.amount, "BRL")}
                    </p>
                    <p className="text-sm text-gray-600">{payment.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pb-8">
            <Link
              href="/producao"
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#e94560] text-white rounded-lg font-medium hover:bg-[#d73a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Criando..." : "Criar Pedido de Produção"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
