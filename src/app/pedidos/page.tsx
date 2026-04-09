"use client";

import { useState, useEffect } from "react";
import { Plus, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SerialTag } from "@/components/ui/serial-tag";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate, cn } from "@/lib/utils-client";

interface Pedido {
  numero: string;
  data: string;
  cliente: string;
  source: string;
  seriais: string[];
  total: number;
  status: string;
}

interface PedidosData {
  pedidos: Pedido[];
  total: number;
  faturamento: number;
  ticketMedio: number;
}

export default function PedidosPage() {
  const [data, setData] = useState<PedidosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const statusOptions = [
    "RASCUNHO",
    "AGUARDANDO_PAGTO",
    "PAGO",
    "PREPARANDO",
    "ENVIADO",
    "ENTREGUE",
    "CANCELADO",
    "REEMBOLSADO",
  ];

  const statusLabels: Record<string, string> = {
    RASCUNHO: "Rascunho",
    AGUARDANDO_PAGTO: "Aguardando Pagto",
    PAGO: "Pago",
    PREPARANDO: "Preparando",
    ENVIADO: "Enviado",
    ENTREGUE: "Entregue",
    CANCELADO: "Cancelado",
    REEMBOLSADO: "Reembolsado",
  };

  const statusVariants: Record<string, "success" | "warning" | "danger" | "info" | "secondary" | "default"> = {
    RASCUNHO: "default",
    AGUARDANDO_PAGTO: "warning",
    PAGO: "success",
    PREPARANDO: "info",
    ENVIADO: "info",
    ENTREGUE: "success",
    CANCELADO: "danger",
    REEMBOLSADO: "danger",
  };

  const sourceLabels: Record<string, string> = {
    SHOPIFY: "Shopify",
    INVOICE_PAYPAL: "PayPal",
    INVOICE_STRIPE: "Stripe",
    INVOICE_AFFIRM: "Affirm",
    WIRE_TRANSFER: "Transferência",
    OUTRO: "Outro",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.append("status", statusFilter);
        const response = await fetch(`/api/orders?${params}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [statusFilter]);

  // Placeholder data
  const placeholderData: PedidosData = {
    total: 42,
    faturamento: 135600,
    ticketMedio: 3228,
    pedidos: [
      {
        numero: "AV-202604-042",
        data: "2024-04-08",
        cliente: "Sarah Johnson",
        source: "SHOPIFY",
        seriais: ["A7VNA00114010216090"],
        total: 3200,
        status: "PAGO",
      },
      {
        numero: "AV-202604-041",
        data: "2024-04-07",
        cliente: "Michael Chen",
        source: "INVOICE_PAYPAL",
        seriais: ["A8SIL00205020316089", "A8SIL00205020316090"],
        total: 6400,
        status: "PREPARANDO",
      },
      {
        numero: "AV-202604-040",
        data: "2024-04-06",
        cliente: "Emma Wilson",
        source: "SHOPIFY",
        seriais: ["A7CLA00404010216088"],
        total: 2850,
        status: "AGUARDANDO_PAGTO",
      },
      {
        numero: "AV-202604-039",
        data: "2024-04-05",
        cliente: "David Martinez",
        source: "WIRE_TRANSFER",
        seriais: ["A8BOR00103030216087"],
        total: 4200,
        status: "ENVIADO",
      },
      {
        numero: "AV-202604-038",
        data: "2024-04-04",
        cliente: "Lisa Anderson",
        source: "SHOPIFY",
        seriais: ["A7WOO00502010216086"],
        total: 3150,
        status: "ENTREGUE",
      },
    ],
  };

  const displayData = data || placeholderData;

  const filteredPedidos = displayData.pedidos.filter((pedido) =>
    statusFilter ? pedido.status === statusFilter : true
  );

  return (
    <div>
      <PageHeader
        title="Pedidos"
        subtitle={`${displayData.total} pedidos no sistema`}
        action={{
          label: "Novo Pedido",
          href: "/pedidos/novo",
          icon: <Plus />,
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<Filter />}
          label="Pedidos do Mês"
          value={displayData.total}
          variant="default"
        />
        <StatCard
          icon={<Plus />}
          label="Faturamento"
          value={formatCurrency(displayData.faturamento, "USD")}
          variant="accent"
        />
        <StatCard
          icon={<Filter />}
          label="Ticket Médio"
          value={formatCurrency(displayData.ticketMedio, "USD")}
          variant="accent"
        />
      </div>

      {/* Status Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter(null)}
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium border transition-colors",
            statusFilter === null
              ? "bg-[#e94560] text-white border-[#e94560]"
              : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
          )}
        >
          Todos
        </button>
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() =>
              setStatusFilter(statusFilter === status ? null : status)
            }
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium border transition-colors",
              statusFilter === status
                ? "bg-[#e94560] text-white border-[#e94560]"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
            )}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredPedidos.length === 0 ? (
          <EmptyState
            title="Nenhum pedido encontrado"
            description={
              statusFilter
                ? "Tente ajustar seus filtros"
                : "Comece criando um novo pedido"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Origem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Instrumentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPedidos.map((pedido) => (
                  <tr key={pedido.numero} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <a
                        href={`/pedidos/${pedido.numero}`}
                        className="font-mono font-bold text-[#e94560] hover:text-[#d73a4f]"
                      >
                        {pedido.numero}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(pedido.data)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {pedido.cliente}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge
                        label={sourceLabels[pedido.source]}
                        variant="secondary"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {pedido.seriais.map((serial) => (
                          <SerialTag key={serial} serial={serial} size="sm" />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(pedido.total, "USD")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge
                        label={statusLabels[pedido.status]}
                        variant={statusVariants[pedido.status]}
                      />
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
