"use client";

import { useState, useEffect } from "react";
import { Plus, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SerialTag } from "@/components/ui/serial-tag";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, cn } from "@/lib/utils-client";

interface Envio {
  id: string;
  rastreamento: string;
  transportadora: string;
  origem: string;
  cliente: string;
  seriais: string[];
  status: string;
  dataDespachado: string;
}

interface EnviosData {
  envios: Envio[];
  pendentes: number;
  emTransito: number;
  entreguesMes: number;
}

export default function EnviosPage() {
  const [data, setData] = useState<EnviosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.append("status", statusFilter);
        const response = await fetch(`/api/shipments?${params}`);
        if (response.ok) {
          const result = await response.json();
          // Map API response (shipments) to page expectations (envios)
          const enviosMapped = result.shipments.map((shipment: any) => ({
            id: shipment.id,
            rastreamento: shipment.trackingNumber,
            transportadora: shipment.carrier,
            origem: shipment.origin,
            cliente: shipment.customer?.name,
            seriais: shipment.instruments?.map((inst: any) => inst.serial) || [],
            status: shipment.status,
            dataDespachado: shipment.createdAt,
          }));

          // Calculate stats
          const pendentes = enviosMapped.filter((e: any) => e.status === 'ETIQUETA_CRIADA').length;
          const emTransito = enviosMapped.filter((e: any) => e.status === 'EM_TRANSITO' || e.status === 'SAIU_PARA_ENTREGA').length;
          const entreguesMes = enviosMapped.filter((e: any) => e.status === 'ENTREGUE').length;

          setData({
            envios: enviosMapped,
            pendentes,
            emTransito,
            entreguesMes,
          });
        }
      } catch (error) {
        console.error("Erro ao buscar envios:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [statusFilter]);

  const statusOptions = [
    "ETIQUETA_CRIADA",
    "COLETADO",
    "EM_TRANSITO",
    "SAIU_PARA_ENTREGA",
    "ENTREGUE",
    "EXCECAO",
    "DEVOLVIDO",
  ];

  const statusLabels: Record<string, string> = {
    ETIQUETA_CRIADA: "Etiqueta Criada",
    COLETADO: "Coletado",
    EM_TRANSITO: "Em Trânsito",
    SAIU_PARA_ENTREGA: "Saiu para Entrega",
    ENTREGUE: "Entregue",
    EXCECAO: "Exceção",
    DEVOLVIDO: "Devolvido",
  };

  const statusVariants: Record<string, "success" | "warning" | "danger" | "info" | "secondary" | "default"> = {
    ETIQUETA_CRIADA: "default",
    COLETADO: "info",
    EM_TRANSITO: "info",
    SAIU_PARA_ENTREGA: "warning",
    ENTREGUE: "success",
    EXCECAO: "danger",
    DEVOLVIDO: "danger",
  };

  // Placeholder data for development
  const placeholderData: EnviosData = {
    pendentes: 3,
    emTransito: 5,
    entreguesMes: 24,
    envios: [
      {
        id: "1",
        rastreamento: "DHL7891234567",
        transportadora: "DHL",
        origem: "EUA",
        cliente: "John Smith",
        seriais: ["A7VNA00114010216090"],
        status: "EM_TRANSITO",
        dataDespachado: "2024-04-05",
      },
      {
        id: "2",
        rastreamento: "UPS0123456789",
        transportadora: "UPS",
        origem: "BRASIL",
        cliente: "Sarah Johnson",
        seriais: ["A8SIL00205020316089"],
        status: "SAIU_PARA_ENTREGA",
        dataDespachado: "2024-04-07",
      },
      {
        id: "3",
        rastreamento: "FEDEX9876543210",
        transportadora: "FEDEX",
        origem: "EUA",
        cliente: "Michael Chen",
        seriais: ["A7CLA00404010216088", "A8BOR00103030216087"],
        status: "ENTREGUE",
        dataDespachado: "2024-03-28",
      },
      {
        id: "4",
        rastreamento: "USPS1234567890",
        transportadora: "USPS",
        origem: "EUA",
        cliente: "Emma Wilson",
        seriais: ["A7WOO00502010216086"],
        status: "ETIQUETA_CRIADA",
        dataDespachado: "2024-04-08",
      },
      {
        id: "5",
        rastreamento: "CORREIOS123456",
        transportadora: "CORREIOS",
        origem: "BRASIL",
        cliente: "David Martinez",
        seriais: ["A8VNA00115010216091"],
        status: "EXCECAO",
        dataDespachado: "2024-03-30",
      },
    ],
  };

  const displayData = data || placeholderData;

  const filteredEnvios = displayData.envios.filter((envio) =>
    statusFilter ? envio.status === statusFilter : true
  );

  return (
    <div>
      <PageHeader
        title="Envios"
        subtitle={`${displayData.envios.length} envios no sistema`}
        action={{
          label: "Novo Envio",
          href: "/envios/novo",
          icon: <Plus />,
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<Truck />}
          label="Pendentes"
          value={displayData.pendentes}
          variant="warning"
        />
        <StatCard
          icon={<Truck />}
          label="Em Trânsito"
          value={displayData.emTransito}
          variant="info"
        />
        <StatCard
          icon={<Truck />}
          label="Entregues (Mês)"
          value={displayData.entreguesMes}
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
        {filteredEnvios.length === 0 ? (
          <EmptyState
            title="Nenhum envio encontrado"
            description={
              statusFilter
                ? "Tente ajustar seus filtros"
                : "Comece criando um novo envio"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Rastreamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Transportadora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Origem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Instrumentos
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
                {filteredEnvios.map((envio) => (
                  <tr key={envio.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <a
                        href={`#tracking/${envio.rastreamento}`}
                        className="font-mono font-bold text-[#e94560] hover:text-[#d73a4f]"
                      >
                        {envio.rastreamento}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <StatusBadge
                        label={envio.transportadora}
                        variant="secondary"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {envio.origem}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {envio.cliente}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {envio.seriais.map((serial) => (
                          <SerialTag key={serial} serial={serial} size="sm" />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge
                        label={statusLabels[envio.status]}
                        variant={statusVariants[envio.status]}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(envio.dataDespachado)}
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
