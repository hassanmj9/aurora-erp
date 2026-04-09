"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils-client";

interface FinancialEntry {
  id: string;
  data: string;
  descricao: string;
  categoria: string;
  tipo: "ENTRADA" | "SAIDA";
  valor: number;
  origem?: string;
}

interface FinanceiroData {
  periodo: string;
  faturamento: number;
  custos: number;
  lucroLiquido: number;
  cambioAtual: number;
  entradas: FinancialEntry[];
  saidas: FinancialEntry[];
  parcelasPendentes: Array<{
    id: string;
    descricao: string;
    valor: number;
    vencimento: string;
    status: string;
  }>;
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("2026-04");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        params.append("period", period);
        const response = await fetch(`/api/financial?${params}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Erro ao buscar dados financeiros:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  // Placeholder data for development
  const placeholderData: FinanceiroData = {
    periodo: "2026-04",
    faturamento: 135600,
    custos: 52400,
    lucroLiquido: 83200,
    cambioAtual: 5.12,
    entradas: [
      {
        id: "1",
        data: "2024-04-08",
        descricao: "Pedido AV-202604-042 - Sarah Johnson",
        categoria: "VENDA",
        tipo: "ENTRADA",
        valor: 3200,
        origem: "Shopify",
      },
      {
        id: "2",
        data: "2024-04-07",
        descricao: "Pedido AV-202604-041 - Michael Chen",
        categoria: "VENDA",
        tipo: "ENTRADA",
        valor: 6400,
        origem: "PayPal",
      },
      {
        id: "3",
        data: "2024-04-06",
        descricao: "Pedido AV-202604-040 - Emma Wilson",
        categoria: "VENDA",
        tipo: "ENTRADA",
        valor: 2850,
        origem: "Shopify",
      },
      {
        id: "4",
        data: "2024-04-05",
        descricao: "Pedido AV-202604-039 - David Martinez",
        categoria: "VENDA",
        tipo: "ENTRADA",
        valor: 4200,
        origem: "Transferência",
      },
      {
        id: "5",
        data: "2024-04-04",
        descricao: "Pedido AV-202604-038 - Lisa Anderson",
        categoria: "VENDA",
        tipo: "ENTRADA",
        valor: 3150,
        origem: "Shopify",
      },
    ],
    saidas: [
      {
        id: "s1",
        data: "2024-04-07",
        descricao: "Frete Pedido A7 - DHL",
        categoria: "FRETE_ENVIO",
        tipo: "SAIDA",
        valor: 245,
      },
      {
        id: "s2",
        data: "2024-04-05",
        descricao: "Comissão Shopify (3% de R$ 17.350)",
        categoria: "TAXA_SHOPIFY",
        tipo: "SAIDA",
        valor: 520,
      },
      {
        id: "s3",
        data: "2024-04-03",
        descricao: "Custo Produção A7 (Pedido Fábrica)",
        categoria: "CUSTO_PRODUCAO",
        tipo: "SAIDA",
        valor: 14400,
      },
      {
        id: "s4",
        data: "2024-04-02",
        descricao: "Taxa Stripe - Invoice",
        categoria: "TAXA_STRIPE",
        tipo: "SAIDA",
        valor: 180,
      },
      {
        id: "s5",
        data: "2024-04-01",
        descricao: "Renovação Domínio + Email",
        categoria: "ASSINATURA",
        tipo: "SAIDA",
        valor: 50,
      },
    ],
    parcelasPendentes: [
      {
        id: "p1",
        descricao: "Prod. Order A8 - Parcela 2",
        valor: 19200,
        vencimento: "2024-04-10",
        status: "VENCIDO",
      },
      {
        id: "p2",
        descricao: "Prod. Order A9 - Parcela 1",
        valor: 6960,
        vencimento: "2024-04-20",
        status: "PENDENTE",
      },
      {
        id: "p3",
        descricao: "Prod. Order A9 - Parcela 2",
        valor: 27840,
        vencimento: "2024-05-20",
        status: "PENDENTE",
      },
    ],
  };

  const displayData = data || placeholderData;

  const monthlyData = [
    { mes: "out/25", valor: 28500 },
    { mes: "nov/25", valor: 42300 },
    { mes: "dez/25", valor: 89200 },
    { mes: "jan/26", valor: 64100 },
    { mes: "fev/26", valor: 76800 },
    { mes: "mar/26", valor: 98500 },
  ];

  const maxValue = Math.max(...monthlyData.map((d) => d.valor));

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Análise de receitas e despesas"
      />

      {/* Period Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Período
        </label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e94560]"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<TrendingUp />}
          label="Faturamento"
          value={formatCurrency(displayData.faturamento, "USD")}
          variant="accent"
        />
        <StatCard
          icon={<TrendingDown />}
          label="Custos"
          value={formatCurrency(displayData.custos, "USD")}
          variant="danger"
        />
        <StatCard
          icon={<DollarSign />}
          label="Lucro Líquido"
          value={formatCurrency(displayData.lucroLiquido, "USD")}
          variant="accent"
          trend={{
            direction: "up",
            percentage: 12,
          }}
        />
        <StatCard
          icon={<DollarSign />}
          label="Câmbio (USD→BRL)"
          value={`R$ ${displayData.cambioAtual.toFixed(2)}`}
          variant="default"
        />
      </div>

      {/* Chart - Monthly Revenue */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          Faturamento Últimos 6 Meses
        </h2>
        <div className="flex items-end gap-4 h-64">
          {monthlyData.map((data) => (
            <div key={data.mes} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gray-200 rounded-t relative flex items-end justify-center">
                <div
                  className="w-full bg-gradient-to-t from-[#e94560] to-[#ff6b7a] rounded-t transition-all hover:from-[#d73a4f] hover:to-[#ff5269]"
                  style={{
                    height: `${(data.valor / maxValue) * 240}px`,
                  }}
                >
                  <span className="text-xs font-bold text-white block text-center pb-1">
                    {formatCurrency(data.valor, "USD")}
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-600 mt-2 font-medium">
                {data.mes}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Entradas and Saidas */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Entradas */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-green-600" />
              Entradas
            </h2>
          </div>
          {displayData.entradas.length === 0 ? (
            <EmptyState title="Nenhuma entrada" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayData.entradas.map((entrada) => (
                    <tr key={entrada.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDate(entrada.data)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {entrada.descricao}
                      </td>
                      <td className="px-6 py-3 text-sm text-right font-semibold text-green-600">
                        +{formatCurrency(entrada.valor, "USD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Saidas */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingDown size={20} className="text-red-600" />
              Saídas
            </h2>
          </div>
          {displayData.saidas.length === 0 ? (
            <EmptyState title="Nenhuma saída" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayData.saidas.map((saida) => (
                    <tr key={saida.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDate(saida.data)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {saida.descricao}
                      </td>
                      <td className="px-6 py-3 text-sm text-right font-semibold text-red-600">
                        -{formatCurrency(saida.valor, "USD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Parcelas Pendentes */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            Próximas Parcelas Pendentes
          </h2>
        </div>
        <div className="divide-y">
          {displayData.parcelasPendentes.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Nenhuma parcela pendente" />
            </div>
          ) : (
            displayData.parcelasPendentes.map((parcela) => (
              <div
                key={parcela.id}
                className="p-6 flex items-start justify-between hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {parcela.descricao}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Vencimento: {formatDate(parcela.vencimento)}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(parcela.valor, "USD")}
                  </p>
                  <StatusBadge
                    label={parcela.status}
                    variant={
                      parcela.status === "VENCIDO"
                        ? "danger"
                        : "warning"
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
