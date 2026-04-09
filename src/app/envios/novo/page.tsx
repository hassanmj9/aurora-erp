"use client";

import { useState, useEffect } from "react";
import { Search, AlertCircle, Package } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SerialTag } from "@/components/ui/serial-tag";
import { StatusBadge } from "@/components/ui/status-badge";

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email?: string;
  };
  instruments: Array<{
    serial: string;
    modelType: string;
    color: string;
    strings: number;
  }>;
  status: string;
  total?: number;
}

interface ShippingForm {
  orderId: string;
  carrier: "DHL" | "UPS" | "USPS" | "CORREIOS" | "";
  trackingNumber: string;
  actualCost: string;
  origin: "EUA" | "BRASIL" | "";
}

export default function NovoEnvioPage() {
  const [step, setStep] = useState<"select-order" | "shipping-details" | "confirm">("select-order");
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ShippingForm>({
    orderId: "",
    carrier: "",
    trackingNumber: "",
    actualCost: "",
    origin: "",
  });

  // Search orders with status PAGO or instruments with status RESERVADO
  const handleSearchOrders = async () => {
    if (!searchTerm.trim()) {
      setError("Digite um número de pedido ou serial");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orders?search=${encodeURIComponent(searchTerm)}`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter for PAGO status only
        const paidOrders = data.orders.filter((o: Order) => o.status === "PAGO");
        if (paidOrders.length === 0) {
          setError(
            "Nenhum pedido pago encontrado. Procure por pedidos com status PAGO."
          );
        } else {
          setOrders(paidOrders);
        }
      } else {
        setError("Erro ao buscar pedidos");
      }
    } catch (err) {
      setError("Erro ao buscar pedidos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setFormData({
      ...formData,
      orderId: order.id,
    });
    setStep("shipping-details");
  };

  const handleFormChange = (field: keyof ShippingForm, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleProceedToConfirm = () => {
    // Validate form
    if (!formData.carrier) {
      setError("Selecione uma transportadora");
      return;
    }
    if (!formData.trackingNumber.trim()) {
      setError("Digite o número de rastreamento");
      return;
    }
    if (!formData.actualCost.trim() || isNaN(parseFloat(formData.actualCost))) {
      setError("Digite um custo de frete válido");
      return;
    }
    if (!formData.origin) {
      setError("Selecione a origem do envio");
      return;
    }

    setError(null);
    setStep("confirm");
  };

  const handleCreateShipment = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: formData.orderId,
          carrier: formData.carrier,
          trackingNumber: formData.trackingNumber,
          origin: formData.origin,
          shippingCost: parseFloat(formData.actualCost),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao criar envio");
      }

      const shipment = await response.json();

      // createShipment already updates instrument status to EM_TRANSITO_CLIENTE
      setSuccess("Envio criado com sucesso!");
      setTimeout(() => {
        window.location.href = "/envios";
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar envio";
      setError(message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Novo Envio"
        subtitle="Registrar despacho de instrumento para cliente"
      />

      <div className="max-w-2xl mx-auto">
        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            {success}
          </div>
        )}

        {/* Step 1: Select Order */}
        {step === "select-order" && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-900">
              1. Selecionar Pedido Pago
            </h2>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Procure por pedidos com status <strong>PAGO</strong> para enviar.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Pedido ou Serial
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Ex: AV-202604-001 ou A7VNA00114010216090"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSearchOrders()
                      }
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleSearchOrders}
                    disabled={loading}
                    className="px-6 py-2 bg-[#e94560] text-white rounded-lg font-medium hover:bg-[#d73a4f] disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Buscando..." : "Buscar"}
                  </button>
                </div>
              </div>

              {orders.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Pedidos Encontrados ({orders.length})
                  </h3>
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => handleSelectOrder(order)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-[#e94560] hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {order.orderNumber}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {order.customer.name}
                            </p>
                          </div>
                          <StatusBadge label="Pago" variant="success" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-600">
                            <strong>Instrumentos:</strong>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {order.instruments.map((inst) => (
                              <SerialTag
                                key={inst.serial}
                                serial={inst.serial}
                                size="sm"
                              />
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Shipping Details */}
        {step === "shipping-details" && selectedOrder && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Pedido Selecionado
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Número</p>
                  <p className="font-semibold text-gray-900">
                    {selectedOrder.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-semibold text-gray-900">
                    {selectedOrder.customer.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Instrumentos</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.instruments.map((inst) => (
                      <SerialTag
                        key={inst.serial}
                        serial={inst.serial}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setStep("select-order");
                }}
                className="mt-4 text-sm text-[#e94560] hover:text-[#d73a4f] font-medium"
              >
                Alterar Pedido
              </button>
            </div>

            {/* Shipping Details Form */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4 text-gray-900">
                2. Detalhes de Envio
              </h2>

              <div className="space-y-4">
                {/* Carrier Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transportadora
                  </label>
                  <select
                    value={formData.carrier}
                    onChange={(e) =>
                      handleFormChange("carrier", e.target.value as any)
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                  >
                    <option value="">Selecione uma transportadora</option>
                    <option value="DHL">DHL</option>
                    <option value="UPS">UPS</option>
                    <option value="USPS">USPS</option>
                    <option value="CORREIOS">Correios</option>
                  </select>
                </div>

                {/* Tracking Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Rastreamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: DHL1234567890"
                    value={formData.trackingNumber}
                    onChange={(e) =>
                      handleFormChange("trackingNumber", e.target.value)
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                  />
                </div>

                {/* Origin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origem do Envio
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="origin"
                        value="EUA"
                        checked={formData.origin === "EUA"}
                        onChange={(e) =>
                          handleFormChange("origin", e.target.value as any)
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">Estados Unidos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="origin"
                        value="BRASIL"
                        checked={formData.origin === "BRASIL"}
                        onChange={(e) =>
                          handleFormChange("origin", e.target.value as any)
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">Brasil</span>
                    </label>
                  </div>
                </div>

                {/* Actual Shipping Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custo Atual de Frete (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.actualCost}
                      onChange={(e) =>
                        handleFormChange("actualCost", e.target.value)
                      }
                      className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Custo real do frete que você pagou à transportadora
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep("select-order")}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleProceedToConfirm}
                  className="flex-1 px-4 py-3 bg-[#e94560] text-white rounded-lg hover:bg-[#d73a4f] font-medium transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === "confirm" && selectedOrder && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-6 text-gray-900">
              3. Confirmar Envio
            </h2>

            <div className="space-y-6">
              {/* Order Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Pedido</p>
                <p className="font-semibold text-gray-900 mb-1">
                  {selectedOrder.orderNumber}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedOrder.customer.name}
                </p>
              </div>

              {/* Shipment Details */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Transportadora</span>
                  <span className="font-semibold text-gray-900">
                    {formData.carrier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Rastreamento</span>
                  <span className="font-semibold font-mono text-gray-900">
                    {formData.trackingNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Origem</span>
                  <span className="font-semibold text-gray-900">
                    {formData.origin === "EUA"
                      ? "Estados Unidos"
                      : "Brasil"}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-700">Custo de Frete</span>
                  <span className="font-bold text-[#e94560]">
                    ${parseFloat(formData.actualCost || "0").toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Instruments to be shipped */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  <Package size={16} className="inline mr-1" />
                  Instrumentos a serem enviados
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.instruments.map((inst) => (
                    <SerialTag
                      key={inst.serial}
                      serial={inst.serial}
                      size="sm"
                    />
                  ))}
                </div>
                <p className="text-xs text-blue-800 mt-2">
                  Status será atualizado para "Em Trânsito com Cliente"
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("shipping-details")}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCreateShipment}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-[#e94560] text-white rounded-lg hover:bg-[#d73a4f] disabled:opacity-50 font-bold transition-colors"
                >
                  {submitting ? "Registrando..." : "Registrar Envio"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
