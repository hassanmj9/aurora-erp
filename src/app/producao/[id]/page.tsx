"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, AlertCircle, Clock, DollarSign } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate, cn } from "@/lib/utils-client";

interface ProductionItem {
  id: string;
  modelType: string;
  color: string;
  strings: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface ProductionPayment {
  id: string;
  installment: number;
  description: string;
  amountBRL: number;
  dueDate: string;
  status: string;
  paidDate?: string;
}

interface ProductionOrder {
  id: string;
  code: string;
  description: string;
  status: string;
  totalCostBRL: number;
  items: ProductionItem[];
  payments: ProductionPayment[];
  notes?: string;
  createdAt: string;
}

export default function ProductionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/production/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Pedido de produção não encontrado");
          } else {
            setError("Erro ao carregar pedido");
          }
          return;
        }
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        console.error("Erro ao buscar pedido:", err);
        setError("Erro ao carregar pedido");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id]);

  const statusLabels: Record<string, string> = {
    ORCAMENTO: "Orçamento",
    PEDIDO_FEITO: "Pedido Feito",
    EM_PRODUCAO: "Em Produção",
    PARCIAL_PRONTO: "Parcial Pronto",
    PRONTO: "Pronto",
    DESPACHADO: "Despachado",
    RECEBIDO: "Recebido",
  };

  const statusVariants: Record<
    string,
    "success" | "warning" | "danger" | "info" | "secondary" | "default"
  > = {
    ORCAMENTO: "default",
    PEDIDO_FEITO: "info",
    EM_PRODUCAO: "info",
    PARCIAL_PRONTO: "warning",
    PRONTO: "warning",
    DESPACHADO: "info",
    RECEBIDO: "success",
  };

  const paymentStatusVariants: Record<
    string,
    "success" | "warning" | "danger" | "info" | "secondary" | "default"
  > = {
    PENDENTE: "warning",
    PAGO: "success",
    VENCIDO: "danger",
    CANCELADO: "default",
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Carregando..."
          subtitle="Aguarde"
        />
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600">Carregando detalhes do pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/producao"
            className="inline-flex items-center gap-2 text-[#e94560] hover:text-[#d73a4f] font-medium"
          >
            <ArrowLeft size={18} />
            Voltar para Produção
          </Link>
        </div>
        <PageHeader
          title="Erro"
          subtitle={error || "Pedido não encontrado"}
        />
        <div className="bg-white rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-900 font-medium">
            {error || "Não conseguimos carregar este pedido."}
          </p>
        </div>
      </div>
    );
  }

  // Calculate payment stats
  const totalPaid = order.payments
    .filter((p) => p.status === "PAGO")
    .reduce((sum, p) => sum + p.amountBRL, 0);
  const remainingBalance = order.totalCostBRL - totalPaid;
  const paidPercentage = Math.round((totalPaid / order.totalCostBRL) * 100);
  const overdueCount = order.payments.filter((p) => p.status === "VENCIDO").length;

  return (
    <div>
      {/* Header with back button */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          href="/producao"
          className="inline-flex items-center gap-2 text-[#e94560] hover:text-[#d73a4f] font-medium"
        >
          <ArrowLeft size={18} />
          Voltar para Produção
        </Link>
      </div>

      {/* Title and status */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pedido {order.code}
            </h1>
            <p className="text-gray-600 mt-2">{order.description}</p>
            {order.notes && (
              <p className="text-sm text-gray-500 mt-2 italic">Notas: {order.notes}</p>
            )}
          </div>
          <StatusBadge
            label={statusLabels[order.status]}
            variant={statusVariants[order.status]}
          />
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">
              Custo Total
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {formatCurrency(order.totalCostBRL, "USD")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">
              Pago
            </p>
            <p className="text-lg font-bold text-green-600 mt-1">
              {formatCurrency(totalPaid, "USD")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">
              Saldo
            </p>
            <p
              className={cn(
                "text-lg font-bold mt-1",
                remainingBalance > 0 ? "text-red-600" : "text-green-600"
              )}
            >
              {formatCurrency(remainingBalance, "USD")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">
              Progresso
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {paidPercentage}%
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[#e94560] to-[#ff6b7a] h-2 rounded-full transition-all"
              style={{ width: `${paidPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overdueCount > 0 && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">
              {overdueCount} parcela{overdueCount !== 1 ? "s" : ""} vencida{overdueCount !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-red-700">
              Pagamento imediato necessário
            </p>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Itens</h2>
        </div>
        {order.items.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Nenhum item" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Modelo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Cor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Cordas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                    Qtd
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                    Custo Unit.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.modelType}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.color}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.strings}-str
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {formatCurrency(item.unitCost, "USD")}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(item.totalCost, "USD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={20} />
            Parcelas de Pagamento
          </h2>
        </div>
        {order.payments.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Nenhuma parcela" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Parcela
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Data do Pagamento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className={cn(
                      payment.status === "VENCIDO" ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
                    )}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {payment.installment}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payment.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(payment.amountBRL, "USD")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(payment.dueDate)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          label={payment.status}
                          variant={paymentStatusVariants[payment.status] || "default"}
                        />
                        {payment.status === "VENCIDO" && (
                          <AlertCircle size={16} className="text-red-600" />
                        )}
                        {payment.status === "PAGO" && (
                          <CheckCircle size={16} className="text-green-600" />
                        )}
                        {payment.status === "PENDENTE" && (
                          <Clock size={16} className="text-yellow-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payment.paidDate ? formatDate(payment.paidDate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
