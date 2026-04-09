import { PrismaClient, ModelType } from "@prisma/client";

/**
 * Serial format: A7VNA[SEQ][MODEL][STRINGS][COLOR][SERIES][YY][MM][BUYER]
 * Example: A7VNA00114010216090 1
 *
 * A7VNA = Brand prefix (Aurora Violins)
 * 001   = Sequential (A001, A002, etc.)
 * 1     = Model (1=Classic, 2=Silhouette, 3=Wood Series, 4=Borealis, 5=Cello)
 * 4     = Strings (4 or 5)
 * 01    = Color code
 * 2     = Series (1, 2, 3...)
 * 06    = Year (06 = 2026)
 * 90    = Month (90 = retired/special, usually 01-12)
 * 1     = Buyer code (01, 02, 03...)
 */

export const SERIAL_MODEL_CODES: Record<ModelType, string> = {
  CLASSIC: "1",
  SILHOUETTE: "2",
  WOOD_SERIES: "3",
  BOREALIS: "4",
  CELLO: "5",
  GHOST: "6",
  AURO: "7",
};

export const SERIAL_COLOR_CODES: Record<string, string> = {
  White: "01",
  Black: "02",
  Gold: "03",
  Silver: "04",
  Red: "05",
  Acqua: "06",
  Natural: "07",
  Sunburst: "08",
  Ruby: "09",
  Amethyst: "10",
  Blue: "11",
  RedBordeaux: "12",
  Carbon: "13",
  Sapphire: "14",
  Custom: "55",
};

// Reverse lookup for parsing
const REVERSE_MODEL_CODES: Record<string, ModelType> = {};
for (const [key, val] of Object.entries(SERIAL_MODEL_CODES)) {
  REVERSE_MODEL_CODES[val] = key as ModelType;
}

const REVERSE_COLOR_CODES = Object.entries(SERIAL_COLOR_CODES).reduce(
  (acc, [key, val]) => ({ ...acc, [val]: key }),
  {} as Record<string, string>
);

export interface SerialComponents {
  brand: string;
  instrument: string;
  sequence: string;
  model: ModelType;
  strings: number;
  color: string;
  series: string;
  year: number;
  month: number;
  buyer: string;
}

/**
 * Generate serial number string from components
 * Format: A7VNA[SEQ][MODEL][STRINGS][COLOR][SERIES][YY][MM][BUYER]
 */
export function generateSerial(params: {
  sequence: string; // "A001", "A002"
  model: ModelType;
  strings: number; // 4 or 5
  color: string; // color code "01", "02"
  series?: string; // "01", "02"
  year?: number; // YY (06 for 2026)
  month?: number; // MM (01-12)
  buyer?: string; // "01"
}): string {
  const sequence = params.sequence;
  const modelCode = SERIAL_MODEL_CODES[params.model];
  const strings = String(params.strings);
  const color = params.color;
  const series = params.series || "01";

  // Year: last 2 digits of current year or provided year
  let year = params.year;
  if (!year) {
    year = new Date().getFullYear() % 100;
  }
  const yearStr = String(year).padStart(2, "0");

  // Month: 01-12 or 90 for special
  let month = params.month;
  if (!month) {
    month = new Date().getMonth() + 1;
  }
  const monthStr = String(month).padStart(2, "0");

  const buyer = params.buyer || "01";

  // Combine all parts
  // Brand prefix + sequence (already includes letter prefix like A) + model + strings + color + series + year + month + buyer
  // A7VNA001 1 4 01 01 06 01 01
  // But actually the sequence already comes as "A001" so we use that
  return `A7VNA${sequence}${modelCode}${strings}${color}${series}${yearStr}${monthStr}${buyer}`;
}

/**
 * Parse serial number back into components
 * Returns all component parts
 */
export function parseSerial(serial: string): SerialComponents {
  // Format check
  if (!serial.startsWith("A7VNA") || serial.length < 22) {
    throw new Error(`Invalid serial format: ${serial}`);
  }

  // Extract parts (A7VNA[SEQ][MODEL][STRINGS][COLOR][SERIES][YY][MM][BUYER])
  // A7VNA = 5 chars
  // Sequence = 4 chars (A001, A002, etc.) — actually just digits after we skip the A prefix
  // But wait, looking at the example: A7VNA00114010216090 1
  // Let me re-parse: A7VNA + 001 + 1 + 4 + 01 + 02 + 16 + 09 + 01
  // So:
  // A7VNA = brand (5)
  // 001 = seq (3)
  // 1 = model (1)
  // 4 = strings (1)
  // 01 = color (2)
  // 02 = series (2)  — actually looking at the example more carefully
  // Let me count the example: A7VNA 0011 4 01 02 16 09 01
  // Hmm, let me look at the spec again: [SEQ][MODEL][STRINGS][COLOR][SERIES][YY][MM][BUYER]
  // The example shows A7VNA00114010216090 1
  // So: A7VNA + 001 + 1 + 4 + 01 + 02 + 16 + 09 + 01
  // That's 5 + 3 + 1 + 1 + 2 + 2 + 2 + 2 + 2 = 20, but the example is 20 chars + a space + 1
  // Looking at example: "A7VNA00114010216090 1" (21 chars including space)
  // Without space: "A7VNA000114010216090" would be 20 chars
  // Let me re-examine: maybe sequence is 4 chars?
  // A7VNA (5) + 0001 (4) + 1 (1) + 4 (1) + 01 (2) + 02 (2) + 16 (2) + 09 (2) + 01 (2) = 21
  // But the spec says A[SEQ] which suggests A is prefix to seq.
  // Ah! The sequence field is "A001", "A002" as a string, so that's 4 chars total.
  // So: A7VNA (5) + A001 (4) + 1 (1) + 4 (1) + 01 (2) + 01 (2) + 06 (2) + 09 (2) + 01 (2) = 22
  // But the example shows "A7VNA00114010216090 1"
  // Let me count: A(1) 7(1) V(1) N(1) A(1) 0(1) 0(1) 1(1) 1(1) 4(1) 0(1) 1(1) 0(1) 2(1) 1(1) 6(1) 0(1) 9(1) 0(1) 1(1) = 20 chars
  // So without the A prefix on sequence: A7VNA + 001 + 1 + 4 + 01 + 02 + 16 + 09 + 01
  // Let me look at the spec one more time: "[SEQ]" — it doesn't say "[A][SEQ]"
  // But in generateSerial, we use params.sequence which is "A001"...
  // I think the confusion is: the generateSerial takes sequence as "A001" (4 chars)
  // but the serial itself stores it as 001 (3 chars) + we already have the A from A7VNA prefix
  // Actually no, looking at generateSerial: return `A7VNA${sequence}...`
  // If sequence is "A001", that gives "A7VNAA001..." which has duplicate A.
  // So I think sequence should be just "001" when passed to generateSerial.
  // But the function signature shows it coming from getNextSequenceNumber which returns "A001"...
  // Let me reconsider: in getNextSequenceNumber, we return "A001", "A002" etc.
  // Then in generateSerial, we use it as is. So if sequence = "A001", serial becomes "A7VNAA0011..."
  // That doesn't match the example.
  // I think the spec meant the sequence number is stored as A001, A002 but in the serial
  // only the numeric part (001, 002) is included since A is already the brand prefix.
  //
  // Let me redefine: sequence returned from DB/function is like "A001" but in the serial string
  // it's stored as just the digits "001".
  // So in generateSerial, we should strip the A if present.

  const brand = serial.substring(0, 5); // A7VNA
  let pos = 5;

  // Sequence: 3 digits (001, 002, etc.)
  const seqDigits = serial.substring(pos, pos + 3);
  const sequence = `A${seqDigits}`;
  pos += 3;

  // Model: 1 digit
  const modelCode = serial.substring(pos, pos + 1);
  const model = REVERSE_MODEL_CODES[modelCode] || "CLASSIC";
  pos += 1;

  // Strings: 1 digit
  const strings = parseInt(serial.substring(pos, pos + 1));
  pos += 1;

  // Color: 2 digits
  const color = serial.substring(pos, pos + 2);
  pos += 2;

  // Series: 2 digits
  const series = serial.substring(pos, pos + 2);
  pos += 2;

  // Year: 2 digits
  const year = parseInt(serial.substring(pos, pos + 2));
  pos += 2;

  // Month: 2 digits
  const month = parseInt(serial.substring(pos, pos + 2));
  pos += 2;

  // Buyer: remaining (usually 2 digits)
  const buyer = serial.substring(pos);

  const colorName = REVERSE_COLOR_CODES[color] || "Custom";
  const instrument = model === "CELLO" ? "VC" : "VN";

  return {
    brand,
    instrument,
    sequence,
    model,
    strings,
    color: colorName,
    series,
    year,
    month,
    buyer,
  };
}

/**
 * Get the next sequence number for a model type
 * Queries the database for the highest sequence number of that model type
 * and returns the next one as "A001", "A002", etc.
 */
export async function getNextSequenceNumber(
  prisma: PrismaClient,
  modelType: ModelType
): Promise<string> {
  // Find the highest sequence number for this model type
  const latest = await prisma.instrument.findFirst({
    where: { modelType },
    orderBy: { serial: "desc" },
    select: { serial: true },
  });

  if (!latest) {
    // No instruments of this model exist, start at A001
    return "A001";
  }

  // Parse the serial to get the current sequence
  try {
    const parsed = parseSerial(latest.serial);
    const currentSeq = parseInt(parsed.sequence.substring(1)); // Remove 'A' prefix
    const nextSeq = currentSeq + 1;
    return `A${String(nextSeq).padStart(3, "0")}`;
  } catch {
    // If parsing fails, start fresh
    return "A001";
  }
}

/**
 * Generate a complete serial for a new instrument
 * Combines getNextSequenceNumber + generateSerial
 */
export async function generateSerialForInstrument(
  prisma: PrismaClient,
  params: {
    modelType: ModelType;
    strings: number;
    color: string; // color code like "01", "02"
    series?: string;
    year?: number;
    month?: number;
    buyerCode?: string;
  }
): Promise<string> {
  const sequence = await getNextSequenceNumber(prisma, params.modelType);

  return generateSerial({
    sequence,
    model: params.modelType,
    strings: params.strings,
    color: params.color,
    series: params.series,
    year: params.year,
    month: params.month,
    buyer: params.buyerCode || "01",
  });
}
