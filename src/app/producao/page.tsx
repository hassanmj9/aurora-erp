"use client";

import { useState, useEffect } from "react";
import { Plus, Factory, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate, cn } from "@/lib/utils-client";

interface ProductionPayment {
  id: string;
  parcela: number;
  descricao: string;
  valor: number;
  dataPagamento: string;
  status: string;
}

interface ProductionOrder {
  id: string;
  code: string;
  descricao: string;
  status: string;
  itens: string;
  custTotal: number;
  pago: number;
  faltaPagar: number;
  pagamentos: ProductionPayment[];
}

interface ProducaoData {
  pedidos: ProductionOrder[];
}

export default function ProducaoPage() {
  const [data, setData] = useState<ProducaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/production");
        if (response.ok) {
          const result = await response.json();
          // Map API response (orders) to page expectations (pedidos)
          setData({
            pedidos: result.orders.map((order: any) => ({
              id: order.id,
              code: order.code,
              descricao: order.description,
              status: order.status,
              itens: order.items?.map((item: any) => `${item.quantity}x ${item.modelType} ${item.color}`).join(', ') || '',
              custTotal: parseFloat(order.totalCostBRL),
              pago: order.payments
                ?.filter((p: any) => p.status === 'PAGO')
                .reduce((sum: number, p: any) => sum + parseFloat(p.amountBRL || 0), 0) || 0,
              faltaPagar: parseFloat(order.totalCostBRL) - (order.payments
                ?.filter((p: any) => p.status === 'PAGO')
                .reduce((sum: number, p: any) => sum + parseFloat(p.amountBRL || 0), 0) || 0),
              pagamentos: order.payments?.map((payment: any) => ({
                id: payment.id,
                parcela: payment.installment,
                descricao: payment.description,
                valor: payment.amountBRL,
                dataPagamento: payment.dueDate,
                status: payment.status,
              })) || [],
            })),
          });
        }
      } catch (error) {
        console.error("Erro ao buscar pedidos de produção:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statusLabels: Record<string, string> = {
    ORCAMENTO: "Orçamento",
    PEDIDO_FEITO: "Pedido Feito",
    EM_PRODUCAO: "Em Produção",
    PARCIAL_PRONTO: "Parcial Pronto",
    PRONTO: "Pronto",
    DESPACHADO: "Despachado",
    RECEBIDO: "Recebido",
  };

  const statusVariants: Record<string, "success" | "warning" | "danger" | "info" | "secondary" | "default"> = {
    ORCAMENTO: "default",
    PEDIDO_FEITO: "info",
    EM_PRODUCAO: "info",
    PARCIAL_PRONTO: "warning",
    PRONTO: "warning",
    DESPACHADO: "info",
    RECEBIDO: "success",
  };

  const paymentStatusVariants: Record<string, "success" | "warning" | "danger" | "info" | "secondary" | "default"> = {
    PENDENTE: "warning",
    PAGO: "success",
    VENCIDO: "danger",
    CANCELADO: "default",
  };

  // Placeholder data for development
  const placeholderData: ProducaoData = {
    pedidos: [
      {
        id: "1",
        code: "A7",
        descricao: "Lote março 2026 — 8 violinos Classic",
        status: "RECEBIDO",
        itens: "8x Classic 4-str White",
        custTotal: 14400,
        pago: 14400,
        faltaPagar: 0,
        pagamentos: [
          {
            id: "p1",
            parcela: 1,
            descricao: "20% entrada",
            valor: 2880,
            dataPagamento: "2024-02-15",
            status: "PAGO",
          },
          {
            id: "p2",
            parcela: 2,
            descricao: "40% etapa",
            valor: 5760,
            dataPagamento: "2024-02-28",
            status: "PAGO",
          },
          {
            id: "p3",
            parcela: 3,
            descricao: "40% final",
            valor: 5760,
            dataPagamento: "2024-03-15",
            status: "PAGO",
          },
        ],
      },
      {
        id: "2",
        code: "A8",
        descricao: "Lote abril 2026 — 12 violinos variados",
        status: "EM_PRODUCAO",
        itens: "5x Silhouette, 4x Borealis, 3x Wood Series",
        custTotal: 48000,
        pago: 14400,
        faltaPagar: 33600,
        pagamentos: [
          {
            id: "p4",
            parcela: 1,
            descricao: "20% entrada",
            valor: 9600,
            dataPagamento: "2024-03-01",
            status: "PAGO",
          },
          {
            id: "p5",
            parcela: 2,
            descricao: "40% etapa",
            valor: 19200,
            dataPagamento: "2024-04-10",
            status: "VENCIDO",
          },
          {
            id: "p6",
            parcela: 3,
            descricao: "40% final",
            valor: 19200,
            dataPagamento: "2024-05-05",
            status: "PENDENTE",
          },
        ],
      },
      {
        id: "3",
        code: "A9",
        descricao: "Lote maio 2026 — Violinos Cello",
        status: "PEDIDO_FEITO",
        itens: "6x Cello",
        custTotal: 34800,
        pago: 0,
        faltaPagar: 34800,
        pagamentos: [
          {
            id: "p7",
            parcela: 1,
            descricao: "20% entrada",
            valor: 6960,
            dataPagamento: "2024-04-20",
            status: "PENDENTE",
          },
          {
            id: "p8",
            parcela: 2,
            descricao: "80% final",
            valor: 27840,
            dataPagamento: "2024-05-20",
            status: "PENDENTE",
          },
        ],
      },
    ],
  };

  const displayData = data || placeholderData;

  return (
    <div>
      <PageHeader
        title="Produção"
        subtitle={`${displayData.pedidos.length} pedidos de produção`}
        action={{
          label: "Novo Pedido de Produção",
          href: "/producao/novo",
          icon: <Plus />,
        }}
      />

      {/* Production Orders */}
      <div className="space-y-6 mb-8">
        {displayData.pedidos.length === 0 ? (
          <EmptyState
            title="Nenhum pedido de produção"
            description="Comece criando um novo pedido"
          />
        ) : (
          displayData.pedidos.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              {/* Header */}
              <div
                onClick={() =>
                  setExpandedId(expandedId === order.id ? null : order.id)
                }
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      Pedido {order.code}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.descricao}
                    </p>
                  </div>
                  <StatusBadge
                    label={statusLabels[order.status]}
                    variant={statusVariants[order.status]}
                  />
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Itens</p>
                    <p className="font-semibold text-gray-900">
                      {order.itens}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Custo Total</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(order.custTotal, "USD")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Pago</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(order.pago, "USD")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Falta Pagar</p>
                    <p
                      className={cn(
                        "font-semibold",
                        order.faltaPagar > 0
                          ? "text-red-600"
                          : "text-gray-600"
                      )}
                    >
                      {formatCurrency(order.faltaPagar, "USD")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === order.id && (
                <div className="border-t px-6 py-6 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-4">Parcelas</h4>
                  <div className="space-y-3">
                    {order.pagamentos.map((payment) => (
                      <div
                        key={payment.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          payment.status === "VENCIDO"
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200 bg-white"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">
                                Parcela {payment.parcela}: {payment.descricao}
                              </span>
                              {payment.status === "VENCIDO" && (
                                <AlertCircle
                                  size={16}
                                  className="text-red-600"
                                />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Vencimento: {formatDate(payment.dataPagamento)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {formatCurrency(payment.valor, "USD")}
                            </p>
                            <StatusBadge
                              label={payment.status}
                              variant={
                                paymentStatusVariants[payment.status] ||
                                "default"
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upcoming Payments Alert */}
      <div className="bg-white rounded-lg border border-amber-200 bg-amber-50 shadow-sm p-6">
        <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
          <AlertCircle size={20} />
          Próximas Parcelas Vencendo
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-amber-900">
            <span>Pedido A8 - Parcela 2 (Venceu em 10/04)</span>
            <span className="font-bold">{formatCurrency(19200, "USD")}</span>
          </div>
          <div className="flex justify-between text-amber-900">
            <span>Pedido A9 - Parcela 1 (Vence em 20/04)</span>
            <span className="font-bold">{formatCurrency(6960, "USD")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
