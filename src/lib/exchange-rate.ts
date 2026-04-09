import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Fetch USD to BRL exchange rate from BCB PTAX API
 * If the date is a weekend/holiday (empty result), retries previous business days
 */
export async function fetchRateFromBCB(date?: Date): Promise<number> {
  let targetDate = date ? new Date(date) : new Date();
  let attempts = 0;
  const maxAttempts = 5; // Try up to 5 days back

  while (attempts < maxAttempts) {
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const dateStr = `${month}-${day}-${year}`;

    try {
      const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateStr}'&$top=1&$format=json&$orderby=dataHoraCotacao%20desc`;

      const response = await fetch(url);
      const data = await response.json();

      // Check if we got a result
      if (data.value && data.value.length > 0) {
        const cotacao = data.value[0];
        const rate = parseFloat(cotacao.cotacaoCompra);
        if (!isNaN(rate)) {
          return rate;
        }
      }
    } catch (error) {
      console.error(`Error fetching BCB rate for ${dateStr}:`, error);
    }

    // Try previous day
    targetDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
    attempts++;
  }

  // Fallback: return a default rate (this should rarely happen)
  console.warn("Could not fetch BCB rate, using fallback rate");
  return 5.5; // Approximate rate
}

/**
 * Get exchange rate for a specific date
 * Checks ExchangeRate table first, if not found, fetches from BCB and caches
 */
export async function getExchangeRate(
  prisma: PrismaClient,
  date?: Date
): Promise<number> {
  const targetDate = date ? new Date(date) : new Date();
  // Normalize to start of day
  targetDate.setHours(0, 0, 0, 0);

  // Check if rate already cached
  const cached = await prisma.exchangeRate.findUnique({
    where: { date: targetDate },
  });

  if (cached) {
    return cached.usdToBrl.toNumber();
  }

  // Fetch from BCB
  const rate = await fetchRateFromBCB(targetDate);

  // Cache in database
  await prisma.exchangeRate.create({
    data: {
      date: targetDate,
      usdToBrl: new Decimal(rate),
    },
  });

  return rate;
}

/**
 * Convert USD to BRL using exchange rate
 * Returns amount in BRL rounded to 2 decimals
 */
export function convertUsdToBrl(amountUsd: number, rate: number): number {
  return parseFloat((amountUsd * rate).toFixed(2));
}
