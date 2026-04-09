"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SerialTag } from "@/components/ui/serial-tag";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils-client";

interface DashboardData {
  instrumentosEmEstoque: number;
  pedidosMes: number;
  faturamentoMes: number;
  enviosPendentes: number;
  acaoNecessaria: Array<{
    id: string;
    tipo: string;
    titulo: string;
    descricao: string;
    urgencia: "alta" | "media" | "baixa";
  }>;
  ultimosPedidos: Array<{
    numero: string;
    cliente: string;
    seriais: string[];
    valor: number;
    status: string;
  }>;
  instrumentosRecentes: Array<{
    serial: string;
    status: string;
    data: string;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
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
        setData(result);
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

  // Dados placeholder para quando API não está conectada
  const placeholderData: DashboardData = {
    instrumentosEmEstoque: 47,
    pedidosMes: 12,
    faturamentoMes: 45680,
    enviosPendentes: 8,
    acaoNecessaria: [
      {
        id: "1",
        tipo: "parcela",
        titulo: "Parcela vencendo em 2 dias",
        descricao: "Prod. Order A7 - R$ 8.500",
        urgencia: "alta",
      },
      {
        id: "2",
        tipo: "pagamento",
        titulo: "Pedido AV-202604-001 aguardando pagamento",
        descricao: "Cliente: John Smith - $2,850",
        urgencia: "media",
      },
      {
        id: "3",
        tipo: "estoque",
        titulo: "Estoque baixo",
        descricao: "Strings para Classic 4-str (apenas 3)",
        urgencia: "baixa",
      },
    ],
    ultimosPedidos: [
      {
        numero: "AV-202604-042",
        cliente: "Sarah Johnson",
        seriais: ["A7VNA00114010216090"],
        valor: 3200,
        status: "PAGO",
      },
      {
        numero: "AV-202604-041",
        cliente: "Michael Chen",
        seriais: ["A8SIL00205020316089", "A8SIL00205020316090"],
        valor: 6400,
        status: "PREPARANDO",
      },
      {
        numero: "AV-202604-040",
        cliente: "Emma Wilson",
        seriais: ["A7CLA00404010216088"],
        valor: 2850,
        status: "AGUARDANDO_PAGTO",
      },
      {
        numero: "AV-202604-039",
        cliente: "David Martinez",
        seriais: ["A8BOR00103030216087"],
        valor: 4200,
        status: "ENVIADO",
      },
      {
        numero: "AV-202604-038",
        cliente: "Lisa Anderson",
        seriais: ["A7WOO00502010216086"],
        valor: 3150,
        status: "ENTREGUE",
      },
    ],
    instrumentosRecentes: [
      { serial: "A8VNA00115010216091", status: "PRODUZIDO", data: "2024-04-08" },
      { serial: "A8SIL00206020316092", status: "EM_ESTOQUE", data: "2024-04-07" },
      { serial: "A7CLA00405010216093", status: "RESERVADO", data: "2024-04-06" },
      { serial: "A8BOR00104030216094", status: "EM_TRANSITO_CLIENTE", data: "2024-04-05" },
      { serial: "A7WOO00503010216095", status: "EM_PRODUCAO", data: "2024-04-04" },
    ],
  };

  const displayData = hasError ? placeholderData : data || placeholderData;

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
              Os dados abaixo são exemplos. Conecte o banco de dados para ver dados reais.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Package />}
          label="Instrumentos em Estoque"
          value={displayData.instrumentosEmEstoque}
          variant="default"
        />
        <StatCard
          icon={<ShoppingCart />}
          label="Pedidos do Mês"
          value={displayData.pedidosMes}
          variant="accent"
        />
        <StatCard
          icon={<TrendingUp />}
          label="Faturamento do Mês"
          value={formatCurrency(displayData.faturamentoMes, "USD")}
          variant="accent"
        />
        <StatCard
          icon={<Clock />}
          label="Envios Pendentes"
          value={displayData.enviosPendentes}
          variant="warning"
        />
      </div>

      {/* Ação Necessária */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ação Necessária</h2>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {displayData.acaoNecessaria.length === 0 ? (
            <EmptyState
              title="Nenhuma ação necessária"
              description="Tudo está em dia"
            />
          ) : (
            <div className="divide-y">
              {displayData.acaoNecessaria.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-4 justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {item.titulo}
                      </h3>
                      <p className="text-sm text-gray-600">{item.descricao}</p>
                    </div>
                    <StatusBadge
                      label={
                        item.urgencia === "alta"
                          ? "Alta"
                          : item.urgencia === "media"
                            ? "Média"
                            : "Baixa"
                      }
                      variant={
                        item.urgencia === "alta"
                          ? "danger"
                          : item.urgencia === "media"
                            ? "warning"
                            : "default"
                      }
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
          {displayData.ultimosPedidos.length === 0 ? (
            <EmptyState title="Nenhum pedido" description="Comece criando um novo pedido" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Seriais
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayData.ultimosPedidos.map((pedido) => (
                    <tr key={pedido.numero} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono font-bold text-[#1a1a2e]">
                        {pedido.numero}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {pedido.cliente}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {pedido.seriais.map((serial) => (
                            <SerialTag key={serial} serial={serial} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(pedido.valor, "USD")}
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Instrumentos Recentes</h2>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {displayData.instrumentosRecentes.length === 0 ? (
            <EmptyState
              title="Nenhum instrumento"
              description="Comece criando um novo instrumento"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Serial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayData.instrumentosRecentes.map((instrumento) => (
                    <tr key={instrumento.serial} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        <SerialTag serial={instrumento.serial} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge
                          label={instrumento.status}
                          variant={statusMap[instrumento.status] || "default"}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(instrumento.data)}
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
