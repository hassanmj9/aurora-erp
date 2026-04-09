"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  User,
  Package,
  Truck,
  Wrench,
  DollarSign,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { SerialTag } from "@/components/ui/serial-tag";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate, getInstrumentStatusLabel, getInstrumentStatusColor } from "@/lib/utils-client";

interface InstrumentEvent {
  id: string;
  fromStatus?: string;
  toStatus: string;
  description: string;
  createdAt: string;
}

interface InstrumentDetail {
  serial: string;
  model: {
    type: string;
    color: string;
    strings: number;
  };
  status: string;
  location: string;
  locationNote?: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  order?: {
    number: string;
    date: string;
    total: number;
  };
  shipment?: {
    trackingNumber: string;
    carrier: string;
    status: string;
    estimatedDelivery?: string;
  };
  productionOrder?: {
    code: string;
    status: string;
  };
  costPrice?: number;
  salePrice?: number;
  createdAt: string;
  history: InstrumentEvent[];
}

export default function InstrumentDetailPage() {
  const params = useParams();
  const serial = params.serial as string;

  const [instrument, setInstrument] = useState<InstrumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstrument = async () => {
      try {
        const response = await fetch(`/api/instruments/${serial}`);
        if (response.ok) {
          const result = await response.json();
          setInstrument(result);
        }
      } catch (error) {
        console.error("Erro ao buscar instrumento:", error);
      } finally {
        setLoading(false);
      }
    };

    if (serial) {
      fetchInstrument();
    }
  }, [serial]);

  // Placeholder data
  const placeholderInstrument: InstrumentDetail = {
    serial: "A7VNA00114010216090",
    model: {
      type: "CLASSIC",
      color: "White",
      strings: 4,
    },
    status: "EM_ESTOQUE",
    location: "CASA_EUA",
    locationNote: "Prateleira 3, Rack B",
    customer: undefined,
    order: undefined,
    shipment: undefined,
    productionOrder: {
      code: "A7",
      status: "RECEBIDO",
    },
    costPrice: 1800,
    salePrice: 3200,
    createdAt: "2024-03-15",
    history: [
      {
        id: "1",
        fromStatus: "EM_TRANSITO_ESTOQUE",
        toStatus: "EM_ESTOQUE",
        description: "Recebido no estoque nos EUA",
        createdAt: "2024-04-08",
      },
      {
        id: "2",
        fromStatus: "PRODUZIDO",
        toStatus: "EM_TRANSITO_ESTOQUE",
        description: "Despachado da fábrica para EUA via DHL",
        createdAt: "2024-03-28",
      },
      {
        id: "3",
        fromStatus: "EM_PRODUCAO",
        toStatus: "PRODUZIDO",
        description: "Finalizado na fábrica em Brazolim",
        createdAt: "2024-03-20",
      },
      {
        id: "4",
        fromStatus: undefined,
        toStatus: "EM_PRODUCAO",
        description: "Produção iniciada",
        createdAt: "2024-03-15",
      },
    ],
  };

  const displayInstrument = instrument || placeholderInstrument;

  const statusColor = getInstrumentStatusColor(
    displayInstrument.status as any
  );

  const profit =
    displayInstrument.salePrice && displayInstrument.costPrice
      ? displayInstrument.salePrice - displayInstrument.costPrice
      : 0;

  const profitMargin =
    displayInstrument.salePrice && displayInstrument.costPrice
      ? ((profit / displayInstrument.costPrice) * 100).toFixed(1)
      : 0;

  return (
    <div>
      <Link
        href="/instrumentos"
        className="inline-flex items-center gap-2 text-[#e94560] hover:text-[#d73a4f] font-medium mb-6"
      >
        <ArrowLeft size={20} />
        Voltar para Instrumentos
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <SerialTag serial={displayInstrument.serial} size="lg" clickable={false} />
            <div className="mt-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {displayInstrument.model.type}
              </h1>
              <p className="text-lg text-gray-600">
                {displayInstrument.model.color} • {displayInstrument.model.strings} cordas
              </p>
            </div>
          </div>
          <StatusBadge
            label={getInstrumentStatusLabel(displayInstrument.status as any)}
            variant={
              statusColor.bg === "bg-blue-100"
                ? "warning"
                : statusColor.bg === "bg-green-100"
                  ? "success"
                  : statusColor.bg === "bg-purple-100"
                    ? "secondary"
                    : statusColor.bg === "bg-orange-100"
                      ? "warning"
                      : statusColor.bg === "bg-cyan-100"
                        ? "info"
                        : statusColor.bg === "bg-emerald-100"
                          ? "success"
                          : statusColor.bg === "bg-red-100"
                            ? "danger"
                            : "default"
            }
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Série</p>
            <p className="font-semibold text-gray-900">01</p>
          </div>
          <div>
            <p className="text-gray-600">Criado em</p>
            <p className="font-semibold text-gray-900">
              {formatDate(displayInstrument.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Produção</p>
            <p className="font-semibold text-gray-900">
              {displayInstrument.productionOrder?.code || "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Estoque</p>
            <p className="font-semibold text-gray-900">
              {displayInstrument.location}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Identidade */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Identidade</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Modelo</p>
              <p className="font-semibold text-gray-900">
                {displayInstrument.model.type}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cor</p>
              <p className="font-semibold text-gray-900">
                {displayInstrument.model.color}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cordas</p>
              <p className="font-semibold text-gray-900">
                {displayInstrument.model.strings}
              </p>
            </div>
            <div className="pt-4 border-t">
              <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                Foto do instrumento
              </div>
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-[#e94560]" />
            Localização
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Local Atual</p>
              <p className="font-semibold text-gray-900">
                {displayInstrument.location}
              </p>
            </div>
            {displayInstrument.locationNote && (
              <div>
                <p className="text-sm text-gray-600">Observação</p>
                <p className="font-semibold text-gray-900">
                  {displayInstrument.locationNote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Owner / Customer */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User size={20} className="text-[#e94560]" />
          Proprietário
        </h2>
        {displayInstrument.customer ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Nome</p>
              <p className="font-semibold text-gray-900">
                {displayInstrument.customer.name}
              </p>
            </div>
            {displayInstrument.customer.email && (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">
                  {displayInstrument.customer.email}
                </p>
              </div>
            )}
            {displayInstrument.customer.phone && (
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <p className="font-semibold text-gray-900">
                  {displayInstrument.customer.phone}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-600 font-medium">
            Disponível para venda
          </div>
        )}
      </div>

      {/* Order / Shipment / Production */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {displayInstrument.order && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-[#e94560]" />
              Pedido
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Número</p>
                <p className="font-mono font-semibold text-gray-900">
                  {displayInstrument.order.number}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(displayInstrument.order.date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(displayInstrument.order.total, "USD")}
                </p>
              </div>
            </div>
          </div>
        )}

        {displayInstrument.shipment && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck size={20} className="text-[#e94560]" />
              Envio
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Rastreamento</p>
                <p className="font-mono font-semibold text-gray-900">
                  {displayInstrument.shipment.trackingNumber}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Transportadora</p>
                <p className="font-semibold text-gray-900">
                  {displayInstrument.shipment.carrier}
                </p>
              </div>
              {displayInstrument.shipment.estimatedDelivery && (
                <div>
                  <p className="text-sm text-gray-600">Previsão</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(displayInstrument.shipment.estimatedDelivery)}
                  </p>
                </div>
              )}
              <StatusBadge
                label={displayInstrument.shipment.status}
                variant="info"
              />
            </div>
          </div>
        )}

        {displayInstrument.productionOrder && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench size={20} className="text-[#e94560]" />
              Produção
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Pedido</p>
                <p className="font-mono font-semibold text-gray-900">
                  {displayInstrument.productionOrder.code}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <StatusBadge
                  label={displayInstrument.productionOrder.status}
                  variant="info"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financeiro */}
      {(displayInstrument.costPrice || displayInstrument.salePrice) && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-[#e94560]" />
            Financeiro
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayInstrument.costPrice && (
              <div>
                <p className="text-sm text-gray-600">Custo</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(displayInstrument.costPrice, "USD")}
                </p>
              </div>
            )}
            {displayInstrument.salePrice && (
              <div>
                <p className="text-sm text-gray-600">Preço de Venda</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(displayInstrument.salePrice, "USD")}
                </p>
              </div>
            )}
            {profit > 0 && (
              <div>
                <p className="text-sm text-gray-600">Lucro</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(profit, "USD")}
                </p>
              </div>
            )}
            {profitMargin && (
              <div>
                <p className="text-sm text-gray-600">Margem</p>
                <p className="text-xl font-bold text-green-600">
                  {profitMargin}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar size={20} className="text-[#e94560]" />
          Histórico
        </h2>

        {displayInstrument.history.length === 0 ? (
          <EmptyState title="Sem histórico" />
        ) : (
          <div className="timeline">
            {displayInstrument.history.map((event, index) => (
              <div key={event.id} className="timeline-item">
                <div className="timeline-dot">
                  <div className="timeline-dot-circle" />
                  {index < displayInstrument.history.length - 1 && (
                    <div
                      className="timeline-line"
                      style={{
                        height: "60px",
                      }}
                    />
                  )}
                </div>
                <div className="timeline-content">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900">
                        {event.description}
                      </p>
                      <span className="text-xs text-gray-600 whitespace-nowrap ml-4">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    {event.fromStatus && (
                      <p className="text-sm text-gray-600">
                        {event.fromStatus} → {event.toStatus}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8 flex-wrap">
        <button className="px-6 py-2 bg-[#e94560] text-white rounded-lg font-medium hover:bg-[#d73a4f] transition-colors">
          Mover Status
        </button>
        <button className="px-6 py-2 border border-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors">
          Atribuir a Pedido
        </button>
        <button className="px-6 py-2 border border-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors">
          Registrar Envio
        </button>
      </div>
    </div>
  );
}
