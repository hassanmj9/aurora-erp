import {
  PrismaClient,
  ModelType,
  InstrumentStatus,
  InstrumentLocation,
  OrderStatus,
  OrderSource,
  FinancialType,
  FinancialCategory,
  ProductionStatus,
  PaymentInstallmentStatus,
  Prisma,
} from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

// ============================================================================
// CONSTANTS & MAPPINGS
// ============================================================================

const COLOR_CODE_MAP: Record<string, string> = {
  "01": "White",
  "02": "Black",
  "03": "Acqua",
  "04": "Natural",
  "05": "Sunburst",
  "06": "Red",
  "07": "Blue",
  "08": "Gold",
  "09": "Silver",
  "11": "Purple",
  "12": "Green",
  "21": "Walnut",
  "22": "Maple",
  "23": "Rosewood",
  "24": "Cherry",
  "25": "Mahogany",
  "54": "Carbon Black",
  "55": "Carbon White",
};

const REVERSE_COLOR_CODE_MAP: Record<string, string> = {};
Object.entries(COLOR_CODE_MAP).forEach(([code, name]) => {
  REVERSE_COLOR_CODE_MAP[name] = code;
});

const MODEL_CODE_MAP: Record<string, ModelType> = {
  "1": ModelType.CLASSIC,
  "2": ModelType.SILHOUETTE,
  "3": ModelType.WOOD_SERIES,
  "4": ModelType.BOREALIS,
  "5": ModelType.CELLO,
};

const REVERSE_MODEL_CODE_MAP: Record<ModelType, string> = {
  [ModelType.CLASSIC]: "1",
  [ModelType.SILHOUETTE]: "2",
  [ModelType.WOOD_SERIES]: "3",
  [ModelType.BOREALIS]: "4",
  [ModelType.CELLO]: "5",
  [ModelType.GHOST]: "6",
  [ModelType.AURO]: "7",
};

// Base prices in USD
const BASE_PRICES: Record<string, number> = {
  "CLASSIC_4": 1290,
  "CLASSIC_5": 1390,
  "SILHOUETTE_4": 1090,
  "SILHOUETTE_5": 1190,
  "WOOD_SERIES_4": 990,
  "WOOD_SERIES_5": 1090,
  "BOREALIS_4": 1290,
  "BOREALIS_5": 1390,
  "CELLO_4": 2690,
  "CELLO_5": 2790,
  "GHOST_4": 1490,
  "AURO_4": 1290,
};

// Cost prices in USD (newer, most recent)
const COST_PRICES: Record<string, number> = {
  "CLASSIC_4": 560,
  "CLASSIC_5": 610,
  "SILHOUETTE_4": 470,
  "SILHOUETTE_5": 520,
  "WOOD_SERIES_4": 385,
  "WOOD_SERIES_5": 435,
  "BOREALIS_4": 515,
  "BOREALIS_5": 575,
  "CELLO_4": 860,
  "CELLO_5": 950,
  "GHOST_4": 500,
  "AURO_4": 445,
};

// Cost prices for older instruments (pre-A25)
const COST_PRICES_OLD: Record<string, number> = {
  "CLASSIC_4": 450,
  "CLASSIC_5": 500,
  "SILHOUETTE_4": 365,
  "SILHOUETTE_5": 410,
  "WOOD_SERIES_4": 330,
  "WOOD_SERIES_5": 435,
  "BOREALIS_4": 465,
  "BOREALIS_5": 515,
  "CELLO_4": 860,
  "CELLO_5": 950,
  "GHOST_4": 500,
  "AURO_4": 445,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse serial number string to extract components
 * Full serial: "A7VNA000140101150901"
 * [0:2]=brand, [2:4]=type, [4]="A", [5:8]=series, [8]=model, [9]=strings,
 * [10:12]=color, [12:14]=batch, [14:16]=year, [16:18]=month, [18:20]=buyer
 */
function parseSerialNumber(serial: string) {
  if (!serial || serial.length < 20) {
    return null;
  }

  const brand = serial.substring(0, 2);
  const type = serial.substring(2, 4);
  const seriesNum = serial.substring(5, 8);
  const modelCode = serial.charAt(8);
  const strings = parseInt(serial.charAt(9));
  const colorCode = serial.substring(10, 12);
  const batchCode = serial.substring(12, 14);
  const year = parseInt(serial.substring(14, 16));
  const month = parseInt(serial.substring(16, 18));
  const buyerCode = serial.substring(18, 20);

  return {
    brand,
    type,
    seriesNum,
    modelCode,
    strings,
    colorCode,
    batchCode,
    year: 2000 + year,
    month,
    buyerCode,
  };
}

function colorCodeToName(code: string): string {
  return COLOR_CODE_MAP[code] || "Unknown";
}

function nameToColorCode(name: string): string {
  return REVERSE_COLOR_CODE_MAP[name] || "01";
}

function modelCodeToType(code: string): ModelType {
  return MODEL_CODE_MAP[code] || ModelType.CLASSIC;
}

function modelTypeToCode(type: ModelType): string {
  return REVERSE_MODEL_CODE_MAP[type] || "1";
}

function getBasePrice(modelType: ModelType, strings: number): number {
  const key = `${modelType}_${strings}`;
  return BASE_PRICES[key] || 1000;
}

function getCostPrice(modelType: ModelType, strings: number, isOlder: boolean = false): number {
  const key = `${modelType}_${strings}`;
  const priceMap = isOlder ? COST_PRICES_OLD : COST_PRICES;
  return priceMap[key] || 400;
}

/**
 * Map production model names to ModelType
 */
function productionModelToType(modelName: string): ModelType {
  const normalized = (modelName || "").toLowerCase();

  if (normalized.includes("classic")) return ModelType.CLASSIC;
  if (normalized.includes("silhouette")) return ModelType.SILHOUETTE;
  if (normalized.includes("ws") || normalized.includes("wood")) return ModelType.WOOD_SERIES;
  if (normalized.includes("borealis")) return ModelType.BOREALIS;
  if (normalized.includes("cello")) return ModelType.CELLO;
  if (normalized.includes("ghost")) return ModelType.GHOST;
  if (normalized.includes("auro")) return ModelType.AURO;

  return ModelType.CLASSIC;
}

/**
 * Map sales order/vendas model names to ModelType
 */
function salesModelToType(modelName: string): ModelType {
  const normalized = (modelName || "").toLowerCase();

  if (normalized === "classic") return ModelType.CLASSIC;
  if (normalized === "silhouette") return ModelType.SILHOUETTE;
  if (normalized === "wood") return ModelType.WOOD_SERIES;
  if (normalized === "borealis") return ModelType.BOREALIS;
  if (normalized === "cello") return ModelType.CELLO;
  if (normalized === "ghost") return ModelType.GHOST;
  if (normalized === "auro") return ModelType.AURO;

  return ModelType.CLASSIC;
}

/**
 * Map owner field to status and location
 */
function getInstrumentStatusAndLocation(
  owner: string
): { status: InstrumentStatus; location: InstrumentLocation } {
  const normalized = (owner || "").trim();

  if (normalized === "Hassan")
    return { status: InstrumentStatus.EM_ESTOQUE, location: InstrumentLocation.CASA_EUA };
  if (normalized === "Sam Ash")
    return { status: InstrumentStatus.EM_ESTOQUE, location: InstrumentLocation.SAM_ASH };
  if (normalized === "EVS" || normalized === "Pedido")
    return { status: InstrumentStatus.EM_PRODUCAO, location: InstrumentLocation.FABRICA };
  if (normalized === "Aurora" || normalized === "Internal")
    return { status: InstrumentStatus.EM_ESTOQUE, location: InstrumentLocation.CASA_EUA };
  if (normalized === "" || !normalized)
    return { status: InstrumentStatus.EM_ESTOQUE, location: InstrumentLocation.CASA_EUA };

  // Specific names and countries -> ENTREGUE, OUTRO
  if (
    normalized === "Sorocaba" ||
    normalized === "Xarxa" ||
    normalized === "Brazil" ||
    normalized === "Custom red"
  ) {
    return { status: InstrumentStatus.ENTREGUE, location: InstrumentLocation.OUTRO };
  }

  // Any other name = delivered/specific customer
  return { status: InstrumentStatus.ENTREGUE, location: InstrumentLocation.OUTRO };
}

/**
 * Parse DD/MM/YY Brazilian date format
 */
function parseBrazilianDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;

  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(fullYear, month - 1, day);

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse Portuguese month name to number
 */
function parsePortugueseMonth(monthStr: string): number {
  const monthMap: Record<string, number> = {
    "jan": 1,
    "fev": 2,
    "mar": 3,
    "abr": 4,
    "mai": 5,
    "jun": 6,
    "jul": 7,
    "ago": 8,
    "set": 9,
    "out": 10,
    "nov": 11,
    "dez": 12,
  };

  const normalized = (monthStr || "").toLowerCase().replace(".", "");
  return monthMap[normalized] || 1;
}

/**
 * Parse sales order date format: "12-mar." -> Date
 */
function parseSalesOrderDate(dateStr: string, yearHint: number = 2024): Date | null {
  if (!dateStr || !dateStr.trim()) return null;

  const parts = dateStr.split("-");
  if (parts.length !== 2) return null;

  const day = parseInt(parts[0]);
  const monthNum = parsePortugueseMonth(parts[1]);

  if (isNaN(day)) return null;

  return new Date(yearHint, monthNum - 1, day);
}

/**
 * Parse vendas23 date: all October 2023
 */
function parseVendas23Date(dateStr: string): Date {
  if (!dateStr || !dateStr.trim()) {
    return new Date(2023, 9, 1); // Default to October 1, 2023
  }

  const parts = dateStr.split("-");
  if (parts.length !== 2) {
    return new Date(2023, 9, 1);
  }

  const day = parseInt(parts[0]);
  if (isNaN(day)) {
    return new Date(2023, 9, 1);
  }

  return new Date(2023, 9, day);
}

/**
 * Parse breakeven date - handles various formats
 */
function parseBreakevenDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;

  // Try MM/DD/YYYY format first
  let parts = dateStr.split("/");
  if (parts.length === 3) {
    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, month - 1, day);
    }
  }

  return null;
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// ============================================================================
// DATA CLEARING
// ============================================================================

async function clearAllData() {
  console.log("Clearing all existing data...");
  await prisma.instrumentEvent.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.instrument.deleteMany({});
  await prisma.productionPayment.deleteMany({});
  await prisma.productionItem.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.financial.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.model.deleteMany({});
  console.log("All data cleared.");
}

// ============================================================================
// MODEL CATALOG
// ============================================================================

async function createModelCatalog() {
  console.log("\n=== CREATING MODEL CATALOG ===");

  const models: Map<string, boolean> = new Map();

  // Read all serial data
  const serialPath = path.join(process.cwd(), "prisma", "data", "serials.csv");
  const serialData = fs.readFileSync(serialPath, "utf-8");
  const serialLines = serialData.split("\n").slice(1).filter((l) => l.trim());

  for (const line of serialLines) {
    const [series, serial, owner] = line.split("|");
    if (!serial || serial.trim().length < 20) continue;

    const parsed = parseSerialNumber(serial);
    if (!parsed) continue;

    const modelType = modelCodeToType(parsed.modelCode);
    const color = colorCodeToName(parsed.colorCode);
    const key = `${modelType}|${parsed.strings}|${color}`;

    models.set(key, true);
  }

  // Read production data
  const prodPath = path.join(process.cwd(), "prisma", "data", "production-full.json");
  const prodData = JSON.parse(fs.readFileSync(prodPath, "utf-8"));

  for (const order of prodData) {
    for (const item of order.items || []) {
      const [qty, _, modelName, color, stringsStr] = item;
      const strings = parseInt(stringsStr);
      const modelType = productionModelToType(modelName);
      const key = `${modelType}|${strings}|${color}`;
      models.set(key, true);
    }
  }

  // Read sales orders
  const ordersPath = path.join(process.cwd(), "prisma", "data", "orders.json");
  const ordersData = JSON.parse(fs.readFileSync(ordersPath, "utf-8"));

  for (const order of ordersData) {
    const modelType = salesModelToType(order.model);
    const strings = parseInt(order.strings);
    const key = `${modelType}|${strings}|${order.color}`;
    models.set(key, true);
  }

  // Read vendas23
  const vendas23Path = path.join(process.cwd(), "prisma", "data", "vendas23.json");
  const vendas23Data = JSON.parse(fs.readFileSync(vendas23Path, "utf-8"));

  for (const venda of vendas23Data) {
    const itemParts = (venda.item || "").split(" ");
    if (itemParts.length < 3) continue;

    const modelName = itemParts[0];
    const color = itemParts[1];
    const stringsStr = itemParts[2];
    const strings = parseInt(stringsStr);

    const modelType = salesModelToType(modelName);
    const key = `${modelType}|${strings}|${color}`;
    models.set(key, true);
  }

  // Create all models
  const modelMap = new Map<string, string>();
  let count = 0;

  for (const modelKey of models.keys()) {
    const [modelTypeStr, stringsStr, color] = modelKey.split("|");
    const strings = parseInt(stringsStr);
    const modelType = modelTypeStr as ModelType;

    const basePrice = getBasePrice(modelType, strings);
    const costPrice = getCostPrice(modelType, strings, false);
    const colorCode = nameToColorCode(color);
    const modelCode = modelTypeToCode(modelType);

    const name = `${modelType === "WOOD_SERIES" ? "Wood Series" : modelType.charAt(0) + modelType.slice(1).toLowerCase()} ${color} ${strings}-String`;

    const model = await prisma.model.create({
      data: {
        type: modelType,
        strings,
        color,
        colorCode,
        modelCode,
        name,
        basePrice: new Prisma.Decimal(basePrice),
        costPrice: new Prisma.Decimal(costPrice),
      },
    });

    modelMap.set(modelKey, model.id);
    count++;
  }

  console.log(`Created ${count} models.`);
  return modelMap;
}

// ============================================================================
// SERIAL MIGRATION
// ============================================================================

async function migrateSerials(modelMap: Map<string, string>) {
  console.log("\n=== MIGRATING SERIALS ===");

  const serialPath = path.join(process.cwd(), "prisma", "data", "serials.csv");
  const serialData = fs.readFileSync(serialPath, "utf-8");
  const serialLines = serialData.split("\n").slice(1).filter((l) => l.trim());

  const instruments: Prisma.InstrumentCreateManyInput[] = [];
  const instrumentsByOwner = new Map<string, Array<{ owner: string; modelType: ModelType; strings: number; color: string; series: string }>>();
  let skipped = 0;

  for (const line of serialLines) {
    const [series, serial, owner] = line.split("|");

    // Skip entries without full serial suffix (A284-A298 unassigned blanks)
    if (!serial || serial.trim().length < 20) {
      skipped++;
      continue;
    }

    const parsed = parseSerialNumber(serial);
    if (!parsed) {
      skipped++;
      continue;
    }

    const modelType = modelCodeToType(parsed.modelCode);
    const color = colorCodeToName(parsed.colorCode);
    const key = `${modelType}|${parsed.strings}|${color}`;

    const modelId = modelMap.get(key);
    if (!modelId) {
      console.warn(`  No model found for ${key}`);
      skipped++;
      continue;
    }

    const { status, location } = getInstrumentStatusAndLocation(owner);

    // Determine if older (pre-A25) for cost pricing
    const seriesNum = parseInt(parsed.seriesNum);
    const isOlder = seriesNum < 25;
    const costPrice = getCostPrice(modelType, parsed.strings, isOlder);

    instruments.push({
      serial: serial.trim(),
      modelId,
      modelType,
      strings: parsed.strings,
      color,
      series: series.trim(),
      year: parsed.year,
      month: parsed.month,
      status,
      location,
      costPrice: new Prisma.Decimal(costPrice),
    });

    // Track instruments by owner for customer linking
    const ownerStr = (owner || "").trim();
    if (ownerStr && status === InstrumentStatus.ENTREGUE) {
      if (!instrumentsByOwner.has(ownerStr)) {
        instrumentsByOwner.set(ownerStr, []);
      }
      instrumentsByOwner.get(ownerStr)!.push({
        owner: ownerStr,
        modelType,
        strings: parsed.strings,
        color,
        series: series.trim(),
      });
    }
  }

  // Batch create instruments
  await prisma.instrument.createMany({ data: instruments });

  console.log(`Migrated ${instruments.length} instruments. Skipped ${skipped}.`);
  return { instruments, instrumentsByOwner };
}

// ============================================================================
// PRODUCTION ORDERS
// ============================================================================

async function migrateProductionOrders(modelMap: Map<string, string>) {
  console.log("\n=== MIGRATING PRODUCTION ORDERS ===");

  const prodPath = path.join(process.cwd(), "prisma", "data", "production-full.json");
  const prodData = JSON.parse(fs.readFileSync(prodPath, "utf-8"));

  let count = 0;

  for (const order of prodData) {
    const orderCode = order.n; // "A2", "A3", etc.
    const isOldFormat = order.vt > 0;
    let totalCostBRL: number;

    if (isOldFormat) {
      // Old format: vt field is the total cost
      totalCostBRL = order.vt;
    } else {
      // New format: calculate as p20 * 5 (since p20 = 20% of total)
      totalCostBRL = order.p20 * 5;
    }

    // Determine production order status based on filled dates (before creating)
    const dates = order.dates || {};
    const pedidoKey = isOldFormat ? "Pedido" : "Pedido 20%";
    const entregaKey = isOldFormat ? "Entrega" : "Entrega 20%";
    const pedidoDate = parseBrazilianDate(dates[pedidoKey]?.date || "");
    const entregaDate = parseBrazilianDate(dates[entregaKey]?.date || "");
    const parcela1Date = parseBrazilianDate(dates["Parcela 1"]?.date || "");
    const parcela2Date = parseBrazilianDate(dates["Parcela 2"]?.date || "");
    const parcela3Date = parseBrazilianDate(dates["Parcela 3"]?.date || "");
    const parcela4Date = parseBrazilianDate(dates["Parcela 4"]?.date || "");

    const baseDueDate = pedidoDate || new Date();

    const filledDates = [pedidoDate, entregaDate, parcela1Date, parcela2Date, parcela3Date, parcela4Date].filter(d => d !== null);
    let orderStatus: ProductionStatus = ProductionStatus.ORCAMENTO;

    if (filledDates.length >= 6) {
      orderStatus = ProductionStatus.RECEBIDO;
    } else if (filledDates.length >= 2) {
      orderStatus = ProductionStatus.EM_PRODUCAO;
    } else if (filledDates.length === 1) {
      orderStatus = ProductionStatus.PEDIDO_FEITO;
    }

    // Create production order with correct status
    const prodOrder = await prisma.productionOrder.create({
      data: {
        code: orderCode,
        description: `Production Order ${orderCode}`,
        totalCostBRL: new Prisma.Decimal(totalCostBRL),
        totalCostUSD: new Prisma.Decimal(0),
        status: orderStatus,
      },
    });

    // Create production items (batch)
    const itemsData = (order.items || []).map((item: any) => {
      const [qty, _, modelName, color, stringsStr, costUnit, totalCost] = item;
      const strings = parseInt(stringsStr);
      const modelType = productionModelToType(modelName);
      return {
        productionOrderId: prodOrder.id,
        modelType,
        strings,
        color,
        quantity: qty || 1,
        unitCost: new Prisma.Decimal(costUnit || 0),
        totalCost: new Prisma.Decimal(totalCost || 0),
      };
    });
    if (itemsData.length > 0) {
      await prisma.productionItem.createMany({ data: itemsData });
    }

    // Create production payments (6 payment structure)
    const payments = [
      {
        installment: 1,
        description: "Pedido 20%",
        amount: order.p20,
        dueDate: pedidoDate || baseDueDate,
        dateValue: pedidoDate,
      },
      {
        installment: 2,
        description: "Entrega 20%",
        amount: order.e20,
        dueDate: entregaDate || addMonths(baseDueDate, 1),
        dateValue: entregaDate,
      },
      {
        installment: 3,
        description: "Parcela 1",
        amount: order.p15,
        dueDate: parcela1Date || addMonths(baseDueDate, 2),
        dateValue: parcela1Date,
      },
      {
        installment: 4,
        description: "Parcela 2",
        amount: order.p15,
        dueDate: parcela2Date || addMonths(baseDueDate, 3),
        dateValue: parcela2Date,
      },
      {
        installment: 5,
        description: "Parcela 3",
        amount: order.p15,
        dueDate: parcela3Date || addMonths(baseDueDate, 4),
        dateValue: parcela3Date,
      },
      {
        installment: 6,
        description: "Parcela 4",
        amount: order.p15,
        dueDate: parcela4Date || addMonths(baseDueDate, 5),
        dateValue: parcela4Date,
      },
    ];

    await prisma.productionPayment.createMany({
      data: payments.map((payment) => ({
        productionOrderId: prodOrder.id,
        installment: payment.installment,
        description: payment.description,
        amountBRL: new Prisma.Decimal(payment.amount),
        dueDate: payment.dueDate,
        paidDate: payment.dateValue || undefined,
        status: payment.dateValue ? PaymentInstallmentStatus.PAGO : PaymentInstallmentStatus.PENDENTE,
      })),
    });

    count++;
  }

  console.log(`Migrated ${count} production orders with payments.`);
}

// ============================================================================
// CREATE INSTRUMENTS FOR RECEBIDO ORDERS
// ============================================================================

async function createInstrumentsForRecebidoOrders() {
  console.log("\n=== CREATING INSTRUMENTS FOR RECEBIDO ORDERS ===");

  // Helper function to get next sequence number (from serial.ts logic)
  async function getNextSequenceNumberForModel(modelType: ModelType): Promise<string> {
    const latest = await prisma.instrument.findFirst({
      where: { modelType },
      orderBy: { serial: "desc" },
      select: { serial: true },
    });

    if (!latest) {
      return "001";
    }

    // Parse the serial to get the sequence (positions 5-8)
    // Format: A7VNA[SEQ][MODEL][STRINGS][COLOR][SERIES][YY][MM][BUYER]
    try {
      const seqStr = latest.serial.substring(5, 8); // Extract 3-digit sequence
      const currentSeq = parseInt(seqStr);
      const nextSeq = currentSeq + 1;
      return String(nextSeq).padStart(3, "0");
    } catch {
      return "001";
    }
  }

  // Helper function to generate serial (from serial.ts logic)
  function generateSerialForRecebido(params: {
    sequence: string; // "001", "002", etc.
    model: ModelType;
    strings: number;
    color: string; // color code "01", "02"
  }): string {
    const modelCodes: Record<ModelType, string> = {
      CLASSIC: "1",
      SILHOUETTE: "2",
      WOOD_SERIES: "3",
      BOREALIS: "4",
      CELLO: "5",
      GHOST: "6",
      AURO: "7",
    };

    const modelCode = modelCodes[params.model] || "1";
    const strings = String(params.strings);
    const color = params.color;
    const series = "01";
    const year = String(new Date().getFullYear() % 100).padStart(2, "0");
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const buyer = "01";

    return `A7VNA${params.sequence}${modelCode}${strings}${color}${series}${year}${month}${buyer}`;
  }

  // Find all RECEBIDO production orders
  const recebidoOrders = await prisma.productionOrder.findMany({
    where: {
      status: ProductionStatus.RECEBIDO,
    },
    include: {
      items: true,
    },
  });

  let created = 0;

  for (const order of recebidoOrders) {
    for (const item of order.items) {
      // For each item in the order, create the specified quantity of instruments
      for (let i = 0; i < item.quantity; i++) {
        // Get the next sequence number for this model type
        const sequenceNum = await getNextSequenceNumberForModel(item.modelType);

        // Generate the serial
        const colorCode = nameToColorCode(item.color);
        const serial = generateSerialForRecebido({
          sequence: sequenceNum,
          model: item.modelType,
          strings: item.strings,
          color: colorCode,
        });

        // Find the model for this instrument
        const model = await prisma.model.findFirst({
          where: {
            type: item.modelType,
            strings: item.strings,
            color: item.color,
          },
        });

        if (!model) {
          console.warn(`  No model found for ${item.modelType} ${item.strings}str ${item.color}`);
          continue;
        }

        // Create the instrument (with collision retry)
        let serialToUse = serial;
        let retries = 0;
        while (retries < 20) {
          const exists = await prisma.instrument.findUnique({ where: { serial: serialToUse } });
          if (!exists) break;
          retries++;
          const newSeq = String(parseInt(sequenceNum) + retries + 300).padStart(3, "0");
          serialToUse = generateSerialForRecebido({
            sequence: newSeq,
            model: item.modelType,
            strings: item.strings,
            color: colorCode,
          });
        }
        if (retries >= 20) {
          console.warn(`  Could not find unique serial for ${item.modelType} ${item.color}, skipping`);
          continue;
        }

        await prisma.instrument.create({
          data: {
            serial: serialToUse,
            modelId: model.id,
            modelType: item.modelType,
            strings: item.strings,
            color: item.color,
            series: "01",
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            status: InstrumentStatus.EM_ESTOQUE,
            location: InstrumentLocation.CASA_EUA,
            productionOrderId: order.id,
            costPrice: item.unitCost || undefined,
          },
        });

        created++;
      }
    }
  }

  console.log(`Created ${created} instruments for RECEBIDO orders.`);
}

// ============================================================================
// PRODUCTION-INSTRUMENT LINKING
// ============================================================================

async function linkInstrumentsToProductionOrders() {
  console.log("\n=== LINKING INSTRUMENTS TO PRODUCTION ORDERS ===");

  // Find instruments in production (EM_PRODUCAO, FABRICA)
  const productionInstruments = await prisma.instrument.findMany({
    where: {
      status: InstrumentStatus.EM_PRODUCAO,
      location: InstrumentLocation.FABRICA,
    },
  });

  // Find active production orders (PEDIDO_FEITO, EM_PRODUCAO, and RECEBIDO)
  const activeProductionOrders = await prisma.productionOrder.findMany({
    where: {
      status: {
        in: [ProductionStatus.PEDIDO_FEITO, ProductionStatus.EM_PRODUCAO, ProductionStatus.RECEBIDO],
      },
    },
    include: {
      items: true,
    },
  });

  let linked = 0;

  for (const instrument of productionInstruments) {
    // Find a matching active production order by model type
    const matchingOrder = activeProductionOrders.find((order) =>
      order.items.some(
        (item) =>
          item.modelType === instrument.modelType &&
          item.strings === instrument.strings &&
          item.color === instrument.color
      )
    );

    if (matchingOrder) {
      // Actually update the database to link the instrument
      await prisma.instrument.update({
        where: { id: instrument.id },
        data: { productionOrderId: matchingOrder.id },
      });
      linked++;
    }
  }

  console.log(`Linked ${linked} instruments to production orders.`);
}

// ============================================================================
// CUSTOMER LINKING FOR DELIVERED INSTRUMENTS
// ============================================================================

async function linkInstrumentsToCustomers(
  instrumentsByOwner: Map<string, Array<{ owner: string; modelType: ModelType; strings: number; color: string; series: string }>>
) {
  console.log("\n=== LINKING INSTRUMENTS TO CUSTOMERS ===");

  const customerMap = new Map<string, string>();
  let linked = 0;

  for (const [owner, instruments] of instrumentsByOwner) {
    // Create customer for this owner (customer initials or name)
    let customerId = customerMap.get(owner);
    if (!customerId) {
      const customer = await prisma.customer.create({
        data: {
          name: owner,
          source: "instrument",
        },
      });
      customerId = customer.id;
      customerMap.set(owner, customerId);
    }

    // Link each instrument to the customer
    for (const inst of instruments) {
      const dbInstrument = await prisma.instrument.findFirst({
        where: {
          series: inst.series,
          modelType: inst.modelType,
          strings: inst.strings,
          color: inst.color,
          status: InstrumentStatus.ENTREGUE,
          customerId: null,
        },
      });

      if (dbInstrument) {
        await prisma.instrument.update({
          where: { id: dbInstrument.id },
          data: { customerId },
        });
        linked++;
      }
    }
  }

  console.log(`Linked ${linked} instruments to customers.`);
}

// ============================================================================
// SALES ORDERS
// ============================================================================

async function migrateSalesOrders(modelMap: Map<string, string>) {
  console.log("\n=== MIGRATING SALES ORDERS ===");

  const ordersPath = path.join(process.cwd(), "prisma", "data", "orders.json");
  const ordersData = JSON.parse(fs.readFileSync(ordersPath, "utf-8"));

  const customerMap = new Map<string, string>();
  let count = 0;

  // Determine year for each order
  const determineOrderYear = (orderNum: string): number => {
    const num = parseInt(orderNum);
    if (num >= 1001 && num <= 1017) return 2024;
    return 2025; // 1018-1035
  };

  for (const orderData of ordersData) {
    const orderNum = orderData.num || "unknown";
    const year = determineOrderYear(orderNum);
    const date = parseSalesOrderDate(orderData.date, year);

    if (!date) {
      console.warn(`  Skipping order ${orderNum}: invalid date ${orderData.date}`);
      continue;
    }

    // Create or get customer
    const customerName = orderData.customer || "Unknown";
    let customerId = customerMap.get(customerName);

    if (!customerId) {
      const customer = await prisma.customer.create({
        data: {
          name: customerName,
          email: orderData.email || undefined,
          city: orderData.city || undefined,
          country: orderData.country || undefined,
          source: "shopify",
        },
      });

      customerId = customer.id;
      customerMap.set(customerName, customerId);
    }

    // Calculate fees and income
    const subtotal = orderData.price || 0;
    const shipping = orderData.shipping || 0;
    const total = orderData.total || subtotal + shipping;
    const feeShopify = orderData.feeShopify || 0;
    const feePaypal = orderData.feePaypal || 0;
    const totalFees = feeShopify + feePaypal;
    const income = orderData.income || total - totalFees;
    const extraHandling = orderData.handling || 0;

    // Get model type and cost
    const modelType = salesModelToType(orderData.model);
    const strings = parseInt(orderData.strings);
    const key = `${modelType}|${strings}|${orderData.color}`;
    const modelId = modelMap.get(key);

    if (!modelId) {
      console.warn(`  No model for ${key} in order ${orderNum}`);
      continue;
    }

    const model = await prisma.model.findUnique({ where: { id: modelId } });
    const productionCost = model?.costPrice || new Prisma.Decimal(0);

    const profit = income - (orderData.shipping || 0) - productionCost.toNumber();

    // Create order
    const orderRecord = await prisma.order.create({
      data: {
        orderNumber: `AV-${year}-${orderNum}`,
        date,
        source: OrderSource.SHOPIFY,
        customerId,
        subtotal: new Prisma.Decimal(subtotal),
        shippingCharge: new Prisma.Decimal(shipping),
        total: new Prisma.Decimal(total),
        feeShopify: new Prisma.Decimal(feeShopify),
        feePaypal: new Prisma.Decimal(feePaypal),
        totalFees: new Prisma.Decimal(totalFees),
        income: new Prisma.Decimal(income),
        shippingCost: new Prisma.Decimal(orderData.shipping || 0),
        extraHandling: new Prisma.Decimal(extraHandling),
        productionCost: new Prisma.Decimal(productionCost),
        profit: new Prisma.Decimal(profit),
        status: OrderStatus.PAGO,
        paidAt: date,
      },
    });

    // Try to link an unassigned instrument matching model/color/strings
    const matchingInstrument = await prisma.instrument.findFirst({
      where: {
        modelType,
        strings,
        color: orderData.color,
        orderId: null,
        status: { in: [InstrumentStatus.EM_ESTOQUE, InstrumentStatus.ENTREGUE] },
      },
    });

    if (matchingInstrument) {
      await prisma.instrument.update({
        where: { id: matchingInstrument.id },
        data: {
          orderId: orderRecord.id,
          status: InstrumentStatus.ENTREGUE,
        },
      });
    }

    // Create Financial entry for income
    await prisma.financial.create({
      data: {
        date,
        type: FinancialType.ENTRADA,
        category: FinancialCategory.VENDA,
        description: `Sale ${orderNum} to ${customerName}`,
        amountUSD: new Prisma.Decimal(income),
        amountBRL: new Prisma.Decimal(income * 5), // Rough conversion
        orderId: orderRecord.id,
      },
    });

    count++;
  }

  console.log(`Migrated ${count} sales orders.`);
}

// ============================================================================
// VENDAS23 (October 2023 Sales)
// ============================================================================

async function migrateVendas23(modelMap: Map<string, string>) {
  console.log("\n=== MIGRATING VENDAS23 (October 2023 Sales) ===");

  const vendas23Path = path.join(process.cwd(), "prisma", "data", "vendas23.json");
  const vendas23Data = JSON.parse(fs.readFileSync(vendas23Path, "utf-8"));

  const customerMap = new Map<string, string>();
  let count = 0;

  for (const venda of vendas23Data) {
    const date = parseVendas23Date(venda.date || "");
    const customerName = venda.customer || "Unknown";

    // Create or get customer
    let customerId = customerMap.get(customerName);
    if (!customerId) {
      const customer = await prisma.customer.create({
        data: {
          name: customerName,
          country: venda.country || undefined,
          source: "shopify",
        },
      });
      customerId = customer.id;
      customerMap.set(customerName, customerId);
    }

    // Parse item: "Wood Sapphire 4"
    const itemParts = (venda.item || "").split(" ");
    if (itemParts.length < 3) continue;

    const modelName = itemParts[0];
    const color = itemParts[1];
    const strings = parseInt(itemParts[2]);
    const modelType = salesModelToType(modelName);

    const key = `${modelType}|${strings}|${color}`;
    const modelId = modelMap.get(key);

    if (!modelId) {
      console.warn(`  No model for ${key} in venda from ${customerName}`);
      continue;
    }

    const model = await prisma.model.findUnique({ where: { id: modelId } });
    const productionCost = venda.cost || model?.costPrice?.toNumber() || 0;

    const price = venda.price || 0;
    const shipping = venda.shipping || 0;
    const total = price + shipping;
    const feeShopify = venda.feeShopify || 0;
    const feePaypal = venda.feePaypal || 0;
    const totalFees = feeShopify + feePaypal;
    const income = venda.net || total - totalFees;
    const profit = venda.profit || income - shipping - productionCost;

    const orderRecord = await prisma.order.create({
      data: {
        orderNumber: `AV-OCT2023-${count.toString().padStart(3, "0")}`,
        date,
        source: OrderSource.SHOPIFY,
        customerId,
        subtotal: new Prisma.Decimal(price),
        shippingCharge: new Prisma.Decimal(shipping),
        total: new Prisma.Decimal(total),
        feeShopify: new Prisma.Decimal(feeShopify),
        feePaypal: new Prisma.Decimal(feePaypal),
        totalFees: new Prisma.Decimal(totalFees),
        income: new Prisma.Decimal(income),
        shippingCost: new Prisma.Decimal(shipping),
        productionCost: new Prisma.Decimal(productionCost),
        profit: new Prisma.Decimal(profit),
        status: OrderStatus.PAGO,
        paidAt: date,
      },
    });

    // Try to link an unassigned instrument matching model/color/strings
    const matchingInstrument = await prisma.instrument.findFirst({
      where: {
        modelType,
        strings,
        color,
        orderId: null,
        status: { in: [InstrumentStatus.EM_ESTOQUE, InstrumentStatus.ENTREGUE] },
      },
    });

    if (matchingInstrument) {
      await prisma.instrument.update({
        where: { id: matchingInstrument.id },
        data: {
          orderId: orderRecord.id,
          status: InstrumentStatus.ENTREGUE,
        },
      });
    }

    // Create Financial entry
    await prisma.financial.create({
      data: {
        date,
        type: FinancialType.ENTRADA,
        category: FinancialCategory.VENDA,
        description: `Venda to ${customerName} - ${modelName} ${color}`,
        amountUSD: new Prisma.Decimal(income),
        amountBRL: new Prisma.Decimal(venda.profitBRL || profit * 5),
        orderId: orderRecord.id,
      },
    });

    count++;
  }

  console.log(`Migrated ${count} October 2023 sales.`);
}

// ============================================================================
// BREAKEVEN (Financial Entries)
// ============================================================================

async function migrateBreakeven() {
  console.log("\n=== MIGRATING BREAKEVEN (Financial Entries) ===");

  const breakevenPath = path.join(process.cwd(), "prisma", "data", "breakeven.json");
  const breakevenData = JSON.parse(fs.readFileSync(breakevenPath, "utf-8"));

  let count = 0;

  for (const entry of breakevenData) {
    const description = entry.description || "";

    // Skip headers and summaries
    if (
      !description ||
      description === "Investido" ||
      (entry.brl === 0 && entry.usd === 0)
    ) {
      continue;
    }

    const date = parseBreakevenDate(entry.date || "");
    const brl = entry.brl || 0;
    const usd = entry.usd || 0;

    if (brl === 0 && usd === 0) continue;

    // Map description to category
    let category: FinancialCategory = FinancialCategory.OUTRO;

    if (description.toLowerCase().includes("shopify")) {
      category = FinancialCategory.ASSINATURA;
    } else if (description.toLowerCase().includes("facebook")) {
      category = FinancialCategory.PUBLICIDADE;
    } else if (
      description.toLowerCase().includes("citibank") ||
      description.toLowerCase().includes("monthly service")
    ) {
      category = FinancialCategory.TAXA_SERVICO;
    } else if (
      description.toLowerCase().includes("violino") ||
      description.toLowerCase().includes("comprado") ||
      description.toLowerCase().includes("classic") ||
      description.toLowerCase().includes("parcela")
    ) {
      category = FinancialCategory.CUSTO_PRODUCAO;
    } else if (
      description.toLowerCase().includes("envio") ||
      description.toLowerCase().includes("frete")
    ) {
      category = FinancialCategory.FRETE_ESTOQUE;
    } else if (description.toLowerCase().includes("transferwise")) {
      category = FinancialCategory.TAXA_TRANSFERENCIA;
    } else if (
      description.toLowerCase().includes("bronka") ||
      description.toLowerCase().includes("fotos")
    ) {
      category = FinancialCategory.OUTRO;
    } else if (description.toLowerCase().includes("dominio")) {
      category = FinancialCategory.ASSINATURA;
    } else if (
      description.toLowerCase().includes("registered") ||
      description.toLowerCase().includes("sunbiz")
    ) {
      category = FinancialCategory.TAXA_SERVICO;
    }

    const financial = await prisma.financial.create({
      data: {
        date: date || new Date(),
        type: FinancialType.SAIDA,
        category,
        description,
        amountBRL: new Prisma.Decimal(brl),
        amountUSD: usd > 0 ? new Prisma.Decimal(usd) : undefined,
      },
    });

    count++;
  }

  console.log(`Migrated ${count} financial entries.`);
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function main() {
  console.log(
    "=========================================================================="
  );
  console.log("Aurora Violins ERP - Complete Data Migration");
  console.log(
    "=========================================================================="
  );

  try {
    // 1. Clear all data
    await clearAllData();

    // 2. Create model catalog
    const modelMap = await createModelCatalog();

    // 3. Migrate serials
    const { instruments, instrumentsByOwner } = await migrateSerials(modelMap);

    // 4. Migrate production orders
    await migrateProductionOrders(modelMap);

    // 5. Migrate sales orders
    await migrateSalesOrders(modelMap);

    // 6. Migrate vendas23 (October 2023)
    await migrateVendas23(modelMap);

    // 7. Migrate breakeven financial entries
    await migrateBreakeven();

    // 8. Create instruments for RECEBIDO orders
    try {
      await createInstrumentsForRecebidoOrders();
    } catch (e) {
      console.warn("Warning: createInstrumentsForRecebidoOrders failed:", e);
    }

    // 9. Link instruments to production orders
    try {
      await linkInstrumentsToProductionOrders();
    } catch (e) {
      console.warn("Warning: linkInstrumentsToProductionOrders failed:", e);
    }

    // 10. Link delivered instruments to customers
    try {
      await linkInstrumentsToCustomers(instrumentsByOwner);
    } catch (e) {
      console.warn("Warning: linkInstrumentsToCustomers failed:", e);
    }

    // 11. Summary
    console.log("\n=== MIGRATION SUMMARY ===");
    const modelCount = await prisma.model.count();
    const instrumentCount = await prisma.instrument.count();
    const customerCount = await prisma.customer.count();
    const orderCount = await prisma.order.count();
    const prodOrderCount = await prisma.productionOrder.count();
    const financialCount = await prisma.financial.count();

    console.log(`Models:              ${modelCount}`);
    console.log(`Instruments:         ${instrumentCount}`);
    console.log(`Customers:           ${customerCount}`);
    console.log(`Sales Orders:        ${orderCount}`);
    console.log(`Production Orders:   ${prodOrderCount}`);
    console.log(`Financial Entries:   ${financialCount}`);

    console.log(
      "\n=========================================================================="
    );
    console.log("Migration completed successfully!");
    console.log(
      "=========================================================================="
    );
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
