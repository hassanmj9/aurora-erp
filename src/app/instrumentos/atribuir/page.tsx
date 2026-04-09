"use client";

import { useState, useEffect } from "react";
import { Search, Plus, AlertCircle, Factory } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SerialTag } from "@/components/ui/serial-tag";
import { formatCurrency } from "@/lib/utils-client";
import Link from "next/link";

interface Instrument {
  id: string;
  serial: string;
  model: {
    type: string;
    color: string;
    basePrice: number;
  };
  strings: number;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
}

export default function AtribuirSerialPage() {
  const [step, setStep] = useState<"search" | "details" | "customer" | "confirm">("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    country: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Step 1: Search for instruments
  const handleSearchInstruments = async () => {
    if (!searchTerm.trim()) {
      setError("Digite um serial para buscar");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/instruments?status=EM_ESTOQUE&search=${encodeURIComponent(searchTerm)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.instruments.length === 0) {
          setError("Nenhum instrumento encontrado em estoque com esse serial");
        } else {
          setAvailableInstruments(data.instruments);
        }
      } else {
        setError("Erro ao buscar instrumentos");
      }
    } catch (err) {
      setError("Erro ao buscar instrumentos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Select instrument and move to details
  const handleSelectInstrument = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setStep("customer");
  };

  // Search customers
  const handleSearchCustomers = async () => {
    if (!searchCustomer.trim()) {
      setCustomers([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/customers?search=${encodeURIComponent(searchCustomer)}`
      );
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      setError("Nome do cliente é obrigatório");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      if (response.ok) {
        const customer = await response.json();
        setSelectedCustomer(customer);
        setShowNewCustomer(false);
        setStep("confirm");
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao criar cliente");
      }
    } catch (err) {
      setError("Erro ao criar cliente");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create order and assign serial
  const handleCreateOrder = async () => {
    if (!selectedInstrument || !selectedCustomer) {
      setError("Instrumento e cliente são obrigatórios");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create order
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          source: "INVOICE_PAYPAL",
          instrumentSerials: [selectedInstrument.serial],
          subtotal: selectedInstrument.model.basePrice,
        }),
      });

      if (!orderResponse.ok) {
        const data = await orderResponse.json();
        throw new Error(data.error || "Erro ao criar pedido");
      }

      setSuccess("Pedido criado com sucesso! Serial atribuído ao cliente.");
      setTimeout(() => {
        window.location.href = "/pedidos";
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar pedido";
      setError(message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Atribuir Serial"
        subtitle="Associar instrumento a um cliente e criar pedido de venda"
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

        {/* Step 1: Search Instruments */}
        {step === "search" && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-900">
              1. Buscar Instrumento Disponível
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código Serial
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por serial (ex: A7VNA00114010216090)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearchInstruments()}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleSearchInstruments}
                    disabled={loading}
                    className="px-6 py-2 bg-[#e94560] text-white rounded-lg font-medium hover:bg-[#d73a4f] disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Buscando..." : "Buscar"}
                  </button>
                </div>
              </div>

              {availableInstruments.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Instrumentos Encontrados ({availableInstruments.length})
                  </h3>
                  <div className="space-y-3">
                    {availableInstruments.map((inst) => (
                      <button
                        key={inst.id}
                        onClick={() => handleSelectInstrument(inst)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-[#e94560] hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <SerialTag serial={inst.serial} size="sm" />
                          <StatusBadge label="Em Estoque" variant="secondary" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Modelo:</span>
                            <p className="font-medium text-gray-900">
                              {inst.model.type} - {inst.model.color}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Cordas:</span>
                            <p className="font-medium text-gray-900">{inst.strings}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Preço Base:</span>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(inst.model.basePrice, "USD")}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Nenhum instrumento disponível?</strong> Crie um novo pedido de
                  produção para a fábrica.
                </p>
                <Link
                  href="/producao/novo"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                  <Factory size={18} />
                  Gerar Pedido de Produção
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Customer */}
        {step === "customer" && selectedInstrument && (
          <div className="space-y-6">
            {/* Instrument Summary */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Instrumento Selecionado</h3>
              <div className="flex items-start justify-between mb-4">
                <SerialTag serial={selectedInstrument.serial} size="md" />
                <button
                  onClick={() => {
                    setSelectedInstrument(null);
                    setStep("search");
                  }}
                  className="text-sm text-[#e94560] hover:text-[#d73a4f] font-medium"
                >
                  Alterar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Modelo:</span>
                  <p className="font-medium text-gray-900">
                    {selectedInstrument.model.type} - {selectedInstrument.model.color}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Cordas:</span>
                  <p className="font-medium text-gray-900">{selectedInstrument.strings}</p>
                </div>
                <div>
                  <span className="text-gray-600">Preço:</span>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(selectedInstrument.model.basePrice, "USD")}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Selection */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">2. Selecionar Cliente</h3>

              {!showNewCustomer ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Cliente Existente
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome ou email..."
                        value={searchCustomer}
                        onChange={(e) => {
                          setSearchCustomer(e.target.value);
                          if (e.target.value.trim()) {
                            handleSearchCustomers();
                          } else {
                            setCustomers([]);
                          }
                        }}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {customers.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Clientes encontrados:</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {customers.map((cust) => (
                          <button
                            key={cust.id}
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setStep("confirm");
                            }}
                            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-[#e94560] hover:bg-red-50 transition-colors"
                          >
                            <p className="font-medium text-gray-900">{cust.name}</p>
                            {cust.email && (
                              <p className="text-sm text-gray-600">{cust.email}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowNewCustomer(true)}
                    className="w-full py-2 px-4 border border-dashed border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Criar Novo Cliente
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome
                    </label>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={newCustomer.name}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, name: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={newCustomer.email}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, email: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      País (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: United States"
                      value={newCustomer.country}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, country: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowNewCustomer(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateCustomer}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-[#e94560] text-white rounded-lg hover:bg-[#d73a4f] disabled:opacity-50 font-medium transition-colors"
                    >
                      {loading ? "Criando..." : "Criar Cliente"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === "confirm" && selectedInstrument && selectedCustomer && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-6 text-gray-900">3. Confirmar Atribuição</h2>

            <div className="space-y-6">
              {/* Instrument */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Instrumento</p>
                <div className="flex items-center justify-between">
                  <div>
                    <SerialTag serial={selectedInstrument.serial} size="md" />
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedInstrument.model.type} - {selectedInstrument.model.color}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(selectedInstrument.model.basePrice, "USD")}
                  </p>
                </div>
              </div>

              {/* Customer */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Cliente</p>
                <p className="font-semibold text-gray-900">{selectedCustomer.name}</p>
                {selectedCustomer.email && (
                  <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                )}
              </div>

              {/* Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between mb-4">
                  <span className="text-gray-700">Subtotal</span>
                  <span className="font-semibold">
                    {formatCurrency(selectedInstrument.model.basePrice, "USD")}
                  </span>
                </div>
                <div className="flex justify-between mb-4 pb-4 border-b">
                  <span className="text-gray-700">Frete</span>
                  <span className="font-semibold">USD 0.00</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-[#e94560]">
                    {formatCurrency(selectedInstrument.model.basePrice, "USD")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setStep("customer");
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-[#e94560] text-white rounded-lg hover:bg-[#d73a4f] disabled:opacity-50 font-bold transition-colors"
                >
                  {submitting ? "Criando Pedido..." : "Criar Pedido e Atribuir Serial"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
