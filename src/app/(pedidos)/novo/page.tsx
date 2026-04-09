"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { SerialTag } from "@/components/ui/serial-tag";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils-client";

type Step = 1 | 2 | 3 | 4 | 5;

interface OrderFormData {
  source: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCountry: string;
  selectedSeriais: string[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  feeShopify: number;
  feePaypal: number;
  feeStripe: number;
  feeAffirm: number;
}

const sourceOptions = [
  { value: "SHOPIFY", label: "Shopify" },
  { value: "INVOICE_PAYPAL", label: "Invoice PayPal" },
  { value: "INVOICE_STRIPE", label: "Invoice Stripe" },
  { value: "INVOICE_AFFIRM", label: "Invoice Affirm" },
  { value: "WIRE_TRANSFER", label: "Transferência Bancária" },
  { value: "OUTRO", label: "Outro" },
];

const modeloOptions = ["CLASSIC", "SILHOUETTE", "WOOD_SERIES", "BOREALIS", "CELLO"];

const corOptions = ["White", "Black", "Red", "Blue", "Natural"];

const instrumentosMock = [
  { serial: "A7VNA00114010216090", modelo: "CLASSIC", cor: "White", cordas: 4 },
  { serial: "A8SIL00205020316089", modelo: "SILHOUETTE", cor: "Black", cordas: 5 },
  { serial: "A7CLA00404010216088", modelo: "CLASSIC", cor: "Red", cordas: 4 },
  { serial: "A8BOR00103030216087", modelo: "BOREALIS", cor: "Blue", cordas: 5 },
];

const precosPorModelo: Record<string, number> = {
  CLASSIC: 3200,
  SILHOUETTE: 4500,
  WOOD_SERIES: 3850,
  BOREALIS: 4200,
  CELLO: 5800,
};

export default function NovoOrdenPage() {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<OrderFormData>({
    source: "SHOPIFY",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCountry: "USA",
    selectedSeriais: [],
    subtotal: 0,
    shippingCharge: 0,
    discount: 0,
    feeShopify: 0,
    feePaypal: 0,
    feeStripe: 0,
    feeAffirm: 0,
  });

  const handleSourceChange = (source: string) => {
    setFormData({ ...formData, source });
  };

  const handleCustomerChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSerialToggle = (serial: string) => {
    const isSelected = formData.selectedSeriais.includes(serial);
    const newSeriais = isSelected
      ? formData.selectedSeriais.filter((s) => s !== serial)
      : [...formData.selectedSeriais, serial];

    // Recalculate subtotal
    let subtotal = 0;
    newSeriais.forEach((s) => {
      const inst = instrumentosMock.find((i) => i.serial === s);
      if (inst) {
        subtotal += precosPorModelo[inst.modelo] || 0;
      }
    });

    setFormData({
      ...formData,
      selectedSeriais: newSeriais,
      subtotal,
    });
  };

  const handlePricingChange = (field: string, value: number) => {
    setFormData({ ...formData, [field]: value });
  };

  const total =
    formData.subtotal +
    formData.shippingCharge -
    formData.discount;

  const totalFees =
    formData.feeShopify +
    formData.feePaypal +
    formData.feeStripe +
    formData.feeAffirm;

  const income = total - totalFees;

  const canProceedToStep2 = formData.source;
  const canProceedToStep3 = formData.customerName && formData.customerEmail;
  const canProceedToStep4 = formData.selectedSeriais.length > 0;
  const canProceedToStep5 = true;

  return (
    <div>
      <Link
        href="/pedidos"
        className="inline-flex items-center gap-2 text-[#e94560] hover:text-[#d73a4f] font-medium mb-6"
      >
        <ArrowLeft size={20} />
        Voltar para Pedidos
      </Link>

      {/* Steps Indicator */}
      <div className="mb-8 flex justify-between">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                s === step
                  ? "bg-[#e94560] text-white"
                  : s < step
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
              }`}
            >
              {s < step ? <Check size={20} /> : s}
            </div>
            {s < 5 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  s < step ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        {/* Step 1: Source */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Escolha a Origem do Pedido
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sourceOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSourceChange(option.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.source === option.value
                      ? "border-[#e94560] bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900">{option.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Customer */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Informações do Cliente
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    handleCustomerChange("customerName", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) =>
                    handleCustomerChange("customerEmail", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) =>
                    handleCustomerChange("customerPhone", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <input
                  type="text"
                  value={formData.customerCountry}
                  onChange={(e) =>
                    handleCustomerChange("customerCountry", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Instruments */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Selecione os Instrumentos
            </h2>
            <div className="space-y-3">
              {instrumentosMock.map((inst) => (
                <label
                  key={inst.serial}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedSeriais.includes(inst.serial)}
                    onChange={() => handleSerialToggle(inst.serial)}
                    className="w-5 h-5 rounded border-gray-300 text-[#e94560]"
                  />
                  <div className="flex-1">
                    <SerialTag
                      serial={inst.serial}
                      size="sm"
                      clickable={false}
                    />
                    <div className="text-sm text-gray-600 mt-1">
                      {inst.modelo} • {inst.cor} • {inst.cordas} cordas
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(
                      precosPorModelo[inst.modelo] || 0,
                      "USD"
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Pricing */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Definir Preços e Taxas
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Subtotal ({formData.selectedSeriais.length} instrumento(s)):
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(formData.subtotal, "USD")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frete/Envio
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shippingCharge}
                  onChange={(e) =>
                    handlePricingChange(
                      "shippingCharge",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desconto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) =>
                    handlePricingChange("discount", parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                />
              </div>

              {formData.source === "SHOPIFY" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taxa Shopify
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.feeShopify}
                    onChange={(e) =>
                      handlePricingChange("feeShopify", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                  />
                </div>
              )}

              {formData.source === "INVOICE_PAYPAL" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taxa PayPal
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.feePaypal}
                    onChange={(e) =>
                      handlePricingChange("feePaypal", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e94560] focus:border-transparent"
                  />
                </div>
              )}

              <div className="bg-[#f8f9fa] p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total:</span>
                  <span className="font-bold">{formatCurrency(total, "USD")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Taxas:</span>
                  <span className="font-bold">
                    -{formatCurrency(totalFees, "USD")}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Renda:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(income, "USD")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Revisar Pedido
            </h2>
            <div className="space-y-6">
              <div className="border-t border-b py-4">
                <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
                <p>{formData.customerName}</p>
                <p className="text-sm text-gray-600">{formData.customerEmail}</p>
              </div>

              <div className="border-t border-b py-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Instrumentos ({formData.selectedSeriais.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formData.selectedSeriais.map((serial) => (
                    <SerialTag key={serial} serial={serial} size="sm" />
                  ))}
                </div>
              </div>

              <div className="border-t border-b py-4">
                <h3 className="font-semibold text-gray-900 mb-3">Valores</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(formData.subtotal, "USD")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frete:</span>
                    <span>{formatCurrency(formData.shippingCharge, "USD")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desconto:</span>
                    <span>-{formatCurrency(formData.discount, "USD")}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(total, "USD")}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Taxas:</span>
                    <span>-{formatCurrency(totalFees, "USD")}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-bold border-t pt-2">
                    <span>Renda:</span>
                    <span>{formatCurrency(income, "USD")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={20} />
              Anterior
            </button>
          )}

          {step < 5 && (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={
                (step === 1 && !canProceedToStep2) ||
                (step === 2 && !canProceedToStep3) ||
                (step === 3 && !canProceedToStep4) ||
                (step === 4 && !canProceedToStep5)
              }
              className="flex items-center gap-2 px-6 py-2 bg-[#e94560] text-white rounded-lg font-medium hover:bg-[#d73a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              Próximo
              <ArrowRight size={20} />
            </button>
          )}

          {step === 5 && (
            <button className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors ml-auto">
              Criar Pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
