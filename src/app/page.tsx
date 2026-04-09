"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Clock,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SerialTag } from "@/components/ui/serial-tag";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils-client";

interface DashboardData {
  instrumentsInStock: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  pendingShipments: number;
  actionItems: Array<{
    type: string;
    severity: string;
    message: string;
    dueDate?: string;
    date?: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total?: number;
    customer: { id: string; name: string } | null;
    instruments: Array<{ serial: string; modelType: string; color: string }>;
  }>;
  recentEvents: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    createdAt: string;
    instrument: { serial: string };
  }>;
}

const placeholderData: DashboardData = {
  instrumentsInStock: 0,
  ordersThisMonth: 0,
  revenueThisMonth: 0,
  pendingShipments: 0,
  actionItems: [],
  recentOrders: [],
  recentEvents: [],
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(placeholderData);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          setHasError(true);
          setLoading(false);
          return;
        }
        const result = await response.json();
        setData({
          instrumentsInStock: result.instrumentsInStock ?? 0,
          ordersThisMonth: result.ordersThisMonth ?? 0,
          revenueThisMonth: result.revenueThisMonth ?? 0,
          pendingShipments: result.pendingShipments ?? 0,
          actionItems: result.actionItems ?? [],
          recentOrders: result.recentOrders ?? [],
          recentEvents: result.recentEvents ?? [],
        });
        setHasError(false);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statusMap: Record<string, "success" | "warning" | "danger" | "info" | "secondary"> = {
    PAGO: "success",
    PREPARANDO: "info",
    AGUARDANDO_PAGTO: "warning",
    ENVIADO: "info",
    ENTREGUE: "success",
    PRODUZIDO: "success",
    EM_ESTOQUE: "secondary",
    RESERVADO: "warning",
    EM_TRANSITO_CLIENTE: "info",
    EM_PRODUCAO: "warning",
  };

  const severityMap: Record<string, "danger" | "warning" | "default"> = {
    high: "danger",
    medium: "warning",
    low: "default",
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Bem-vindo ao Aurora ERP - Centro de Controle"
      />

      {hasError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Banco de dados não conectado</p>
            <p className="text-sm text-amber-700">
              Verifique a conexão com o banco de dados. Os dados podem estar indisponíveis.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-sm text-blue-700">Carregando dados...</p>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Package />}
          label="Instrumentos em Estoque"
          value={data.instrumentsInStock}
          variant="default"
        />
        <StatCard
          icon={<ShoppingCart />}
          label="Pedidos do Mês"
          value={data.ordersThisMonth}
          variant="accent"
        />
        <StatCard
          icon={<TrendingUp />}
          label="Faturamento do Mês"
          value={formatCurrency(data.revenueThisMonth, "USD")}
          variant="accent"
        />
        <StatCard
          icon={<Clock />}
          label="Envios Pendentes"
          value={data.pendingShipments}
          variant="warning"
        />
      </div>

      {/* Ação Necessária */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ação Necessária</h2>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {(data.actionItems || []).length === 0 ? (
            <EmptyState
              title="Nenhuma ação necessária"
              description="Tudo está em dia"
            />
          ) : (
            <div className="divide-y">
              {(data.actionItems || []).map((item, index) => (
                <div
                  key={`action-${index}`}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-4 justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {item.message}
                      </h3>
                      <p className="text-sm text-gray-600">{item.type}</p>
                    </div>
                    <StatusBadge
                      label={item.severity === "high" ? "Alta" : item.severity === "medium" ? "Média" : "Baixa"}
                      variant={severityMap[item.severity] || "default"}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimos Pedidos */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Últimos Pedidos</h2>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {(data.recentOrders || []).length === 0 ? (
            <EmptyState title="Nenhum pedido" description="Comece criando um novo pedido" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Número</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Seriais</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.recentOrders || []).map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono font-bold text-[#1a1a2e]">
                        {pedido.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {pedido.customer?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {(pedido.instruments || []).map((inst) => (
                            <SerialTag key={inst.serial} serial={inst.serial} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(pedido.total || 0, "USD")}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge
                          label={pedido.status}
                          variant={statusMap[pedido.status] || "default"}
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

      {/* Instrumentos Recentes */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Atividade Recente</h2>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {(data.recentEvents || []).length === 0 ? (
            <EmptyState
              title="Nenhuma atividade"
              description="Eventos de instrumentos aparecerão aqui"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Serial</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.recentEvents || []).map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        <SerialTag serial={event.instrument?.serial || "—"} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge
                          label={event.toStatus}
                          variant={statusMap[event.toStatus] || "default"}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(event.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
