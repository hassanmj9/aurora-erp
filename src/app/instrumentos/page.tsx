"use client";

import { useState, useEffect } from "react";
import { Search, Grid3x3, List, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SerialTag } from "@/components/ui/serial-tag";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils-client";

interface Instrument {
  serial: string;
  model: {
    type: string;
    color: string;
  };
  strings: number;
  status: string;
  location: string;
  customer?: {
    name: string;
  };
  createdAt: string;
}

interface InstrumentosData {
  instrumentos: Instrument[];
  total: number;
}

export default function InstrumentosPage() {
  const [data, setData] = useState<InstrumentosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const statusOptions = [
    "EM_PRODUCAO",
    "PRODUZIDO",
    "EM_TRANSITO_ESTOQUE",
    "EM_ESTOQUE",
    "RESERVADO",
    "EM_TRANSITO_CLIENTE",
    "ENTREGUE",
    "EM_GARANTIA",
    "DEVOLVIDO",
    "PERDIDO",
  ];

  const statusLabels: Record<string, string> = {
    EM_PRODUCAO: "Em Produção",
    PRODUZIDO: "Produzido",
    EM_TRANSITO_ESTOQUE: "Em Trânsito (Est.)",
    EM_ESTOQUE: "Em Estoque",
    RESERVADO: "Reservado",
    EM_TRANSITO_CLIENTE: "Em Trânsito",
    ENTREGUE: "Entregue",
    EM_GARANTIA: "Em Garantia",
    DEVOLVIDO: "Devolvido",
    PERDIDO: "Perdido",
  };

  const statusVariants: Record<string, "success" | "warning" | "danger" | "info" | "secondary" | "default"> = {
    EM_PRODUCAO: "warning",
    PRODUZIDO: "success",
    EM_TRANSITO_ESTOQUE: "warning",
    EM_ESTOQUE: "secondary",
    RESERVADO: "warning",
    EM_TRANSITO_CLIENTE: "info",
    ENTREGUE: "success",
    EM_GARANTIA: "danger",
    DEVOLVIDO: "default",
    PERDIDO: "danger",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);
        if (statusFilter) params.append("status", statusFilter);

        const response = await fetch(`/api/instruments?${params}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Erro ao buscar instrumentos:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // Placeholder data for development
  const placeholderData: InstrumentosData = {
    total: 47,
    instrumentos: [
      {
        serial: "A7VNA00114010216090",
        model: { type: "CLASSIC", color: "White" },
        strings: 4,
        status: "EM_ESTOQUE",
        location: "CASA_EUA",
        createdAt: "2024-04-08",
      },
      {
        serial: "A8SIL00205020316089",
        model: { type: "SILHOUETTE", color: "Black" },
        strings: 5,
        status: "RESERVADO",
        location: "CASA_EUA",
        customer: { name: "John Smith" },
        createdAt: "2024-04-07",
      },
      {
        serial: "A7CLA00404010216088",
        model: { type: "CLASSIC", color: "Red" },
        strings: 4,
        status: "EM_TRANSITO_CLIENTE",
        location: "EM_TRANSITO",
        customer: { name: "Sarah Johnson" },
        createdAt: "2024-04-06",
      },
      {
        serial: "A8BOR00103030216087",
        model: { type: "BOREALIS", color: "Blue" },
        strings: 5,
        status: "ENTREGUE",
        location: "OUTRO",
        customer: { name: "Michael Chen" },
        createdAt: "2024-04-05",
      },
      {
        serial: "A7WOO00502010216086",
        model: { type: "WOOD_SERIES", color: "Natural" },
        strings: 4,
        status: "EM_PRODUCAO",
        location: "FABRICA",
        createdAt: "2024-04-04",
      },
    ],
  };

  const displayData = data || placeholderData;

  const filteredInstrumentos = displayData.instrumentos.filter((inst) => {
    const matchesSearch =
      searchTerm === "" ||
      inst.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.model.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.model.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus =
      statusFilter === null || inst.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Instrumentos"
        subtitle={`${displayData.total} instrumentos encontrados`}
        action={{
          label: "Novo Instrumento",
          href: "/instrumentos/novo",
          icon: <Plus />,
        }}
      />

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por serial, modelo, cor, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {viewMode === "list" ? <Grid3x3 size={20} /> : <List size={20} />}
          </button>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2">
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
      </div>

      {/* Content */}
      {filteredInstrumentos.length === 0 ? (
        <EmptyState
          title="Nenhum instrumento encontrado"
          description={
            searchTerm || statusFilter
              ? "Tente ajustar seus filtros"
              : "Comece criando um novo instrumento"
          }
        />
      ) : viewMode === "list" ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Serial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Modelo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Cordas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Localização
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Cliente
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInstrumentos.map((inst) => (
                  <tr key={inst.serial} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <SerialTag serial={inst.serial} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">
                        {inst.model.type}
                      </div>
                      <div className="text-xs text-gray-600">
                        {inst.model.color}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {inst.strings}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge
                        label={statusLabels[inst.status]}
                        variant={
                          statusVariants[inst.status] || "default"
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {inst.location}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {inst.customer?.name || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstrumentos.map((inst) => (
            <div
              key={inst.serial}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <SerialTag serial={inst.serial} size="md" className="mb-4" />

              <div className="mb-4">
                <h3 className="font-semibold text-gray-900">
                  {inst.model.type}
                </h3>
                <p className="text-sm text-gray-600">{inst.model.color}</p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cordas:</span>
                  <span className="font-medium text-gray-900">
                    {inst.strings}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Localização:</span>
                  <span className="font-medium text-gray-900">
                    {inst.location}
                  </span>
                </div>
                {inst.customer && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium text-gray-900">
                      {inst.customer.name}
                    </span>
                  </div>
                )}
              </div>

              <StatusBadge
                label={statusLabels[inst.status]}
                variant={statusVariants[inst.status] || "default"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
