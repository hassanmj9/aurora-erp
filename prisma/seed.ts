import { PrismaClient, ModelType, InstrumentStatus, InstrumentLocation, OrderStatus, OrderSource, ShipmentStatus, ShipmentCarrier, ShipmentOrigin, FinancialType, FinancialCategory, ProductionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎻 Seeding Aurora Violins ERP...\n');

  // =========================================================================
  // 1. MODELOS (Catálogo)
  // =========================================================================
  console.log('📦 Creating models...');

  const models = await Promise.all([
    // Classic 4-String
    prisma.model.upsert({ where: { type_strings_color: { type: 'CLASSIC', strings: 4, color: 'White' } }, update: {}, create: { type: 'CLASSIC', name: 'Classic 4-String White', strings: 4, color: 'White', colorCode: '01', modelCode: '1', basePrice: 2850, costPrice: 800 } }),
    prisma.model.upsert({ where: { type_strings_color: { type: 'CLASSIC', strings: 4, color: 'Black' } }, update: {}, create: { type: 'CLASSIC', name: 'Classic 4-String Black', strings: 4, color: 'Black', colorCode: '02', modelCode: '1', basePrice: 2850, costPrice: 800 } }),
    prisma.model.upsert({ where: { type_strings_color: { type: 'CLASSIC', strings: 4, color: 'Red' } }, update: {}, create: { type: 'CLASSIC', name: 'Classic 4-String Red', strings: 4, color: 'Red', colorCode: '03', modelCode: '1', basePrice: 2850, costPrice: 800 } }),
    prisma.model.upsert({ where: { type_strings_color: { type: 'CLASSIC', strings: 4, color: 'Blue' } }, update: {}, create: { type: 'CLASSIC', name: 'Classic 4-String Blue', strings: 4, color: 'Blue', colorCode: '04', modelCode: '1', basePrice: 2850, costPrice: 800 } }),
    prisma.model.upsert({ where: { type_strings_color: { type: 'CLASSIC', strings: 4, color: 'Purple' } }, update: {}, create: { type: 'CLASSIC', name: 'Classic 4-String Purple', strings: 4, color: 'Purple', colorCode: '05', modelCode: '1', basePrice: 2850, costPrice: 800 } }),
    // Classic 5-String
    prisma.model.upsert({ where: { type_strings_color: { type: 'CLASSIC', strings: 5, color: 'White' } }, update: {}, create: { type: 'CLASSIC', name: 'Classic 5-String White', strings: 5, color: 'White', colorCode: '01', modelCode: '2', basePrice: 3200, costPrice: 950 } }),
    prisma.model.upsert({ where: { type_strings_color: { type: 'CLASSIC', strings: 5, color: 'Black' } }, update: {}, create: { type: 'CLASSIC', name: 'Classic 5-String Black', strings: 5, color: 'Black', colorCode: '02', modelCode: '2', basePrice: 3200, costPrice: 950 } }),
    // Silhouette 4-String
    prisma.model.upsert({ where: { type_strings_color: { type: 'SILHOUETTE', strings: 4, color: 'Black' } }, update: {}, create: { type: 'SILHOUETTE', name: 'Silhouette 4-String Black', strings: 4, color: 'Black', colorCode: '02', modelCode: '3', basePrice: 3500, costPrice: 1100 } }),
    prisma.model.upsert({ where: { type_strings_color: { type: 'SILHOUETTE', strings: 4, color: 'White' } }, update: {}, create: { type: 'SILHOUETTE', name: 'Silhouette 4-String White', strings: 4, color: 'White', colorCode: '01', modelCode: '3', basePrice: 3500, costPrice: 1100 } }),
    // Silhouette 5-String
    prisma.model.upsert({ where: { type_strings_color: { type: 'SILHOUETTE', strings: 5, color: 'Black' } }, update: {}, create: { type: 'SILHOUETTE', name: 'Silhouette 5-String Black', strings: 5, color: 'Black', colorCode: '02', modelCode: '4', basePrice: 3800, costPrice: 1250 } }),
    // Wood Series
    prisma.model.upsert({ where: { type_strings_color: { type: 'WOOD_SERIES', strings: 4, color: 'Natural' } }, update: {}, create: { type: 'WOOD_SERIES', name: 'Wood Series 4-String Natural', strings: 4, color: 'Natural', colorCode: '06', modelCode: '5', basePrice: 4200, costPrice: 1400 } }),
    prisma.model.upsert({ where: { type_strings_color: { type: 'WOOD_SERIES', strings: 5, color: 'Natural' } }, update: {}, create: { type: 'WOOD_SERIES', name: 'Wood Series 5-String Natural', strings: 5, color: 'Natural', colorCode: '06', modelCode: '6', basePrice: 4500, costPrice: 1550 } }),
    // Borealis
    prisma.model.upsert({ where: { type_strings_color: { type: 'BOREALIS', strings: 4, color: 'Aurora' } }, update: {}, create: { type: 'BOREALIS', name: 'Borealis 4-String Aurora', strings: 4, color: 'Aurora', colorCode: '07', modelCode: '7', basePrice: 4800, costPrice: 1600 } }),
    prisma.model.upsert({ where: { type_strings_color: { type: 'BOREALIS', strings: 5, color: 'Aurora' } }, update: {}, create: { type: 'BOREALIS', name: 'Borealis 5-String Aurora', strings: 5, color: 'Aurora', colorCode: '07', modelCode: '8', basePrice: 5200, costPrice: 1800 } }),
    // Cello
    prisma.model.upsert({ where: { type_strings_color: { type: 'CELLO', strings: 4, color: 'Black' } }, update: {}, create: { type: 'CELLO', name: 'Electric Cello 4-String Black', strings: 4, color: 'Black', colorCode: '02', modelCode: '9', basePrice: 5500, costPrice: 2000 } }),
  ]);

  console.log(`  ✓ ${models.length} models created\n`);

  // =========================================================================
  // 2. CUSTOMERS
  // =========================================================================
  console.log('👤 Creating customers...');

  const customers = await Promise.all([
    prisma.customer.upsert({ where: { email: 'sarah.johnson@email.com' }, update: {}, create: { name: 'Sarah Johnson', email: 'sarah.johnson@email.com', phone: '+1-555-0101', address: '123 Music Ave', city: 'Nashville', state: 'TN', country: 'US', zipCode: '37201', source: 'shopify' } }),
    prisma.customer.upsert({ where: { email: 'michael.chen@email.com' }, update: {}, create: { name: 'Michael Chen', email: 'michael.chen@email.com', phone: '+1-555-0102', address: '456 Harmony Blvd', city: 'Los Angeles', state: 'CA', country: 'US', zipCode: '90001', source: 'instagram' } }),
    prisma.customer.upsert({ where: { email: 'emma.wilson@email.com' }, update: {}, create: { name: 'Emma Wilson', email: 'emma.wilson@email.com', phone: '+44-7700-0103', address: '78 Camden Rd', city: 'London', country: 'GB', zipCode: 'NW1 9EJ', source: 'shopify' } }),
    prisma.customer.upsert({ where: { email: 'david.martinez@email.com' }, update: {}, create: { name: 'David Martinez', email: 'david.martinez@email.com', phone: '+1-555-0104', address: '910 Broadway', city: 'New York', state: 'NY', country: 'US', zipCode: '10001', source: 'whatsapp' } }),
    prisma.customer.upsert({ where: { email: 'lisa.anderson@email.com' }, update: {}, create: { name: 'Lisa Anderson', email: 'lisa.anderson@email.com', phone: '+1-555-0105', address: '222 Jazz St', city: 'Chicago', state: 'IL', country: 'US', zipCode: '60601', source: 'shopify' } }),
    prisma.customer.upsert({ where: { email: 'james.brown@email.com' }, update: {}, create: { name: 'James Brown', email: 'james.brown@email.com', phone: '+1-555-0106', address: '333 Rock Ln', city: 'Austin', state: 'TX', country: 'US', zipCode: '73301', source: 'instagram' } }),
    prisma.customer.upsert({ where: { email: 'yuki.tanaka@email.com' }, update: {}, create: { name: 'Yuki Tanaka', email: 'yuki.tanaka@email.com', phone: '+81-90-0107', address: '4-2-8 Shibuya', city: 'Tokyo', country: 'JP', zipCode: '150-0002', source: 'shopify' } }),
  ]);

  console.log(`  ✓ ${customers.length} customers created\n`);

  // =========================================================================
  // 3. PRODUCTION ORDER
  // =========================================================================
  console.log('🏭 Creating production orders...');

  const prodA7 = await prisma.productionOrder.upsert({
    where: { code: 'A7' },
    update: {},
    create: {
      code: 'A7',
      description: 'Lote Fevereiro 2026 — 8 violinos',
      status: 'RECEBIDO',
      totalCostBRL: 48000,
      totalCostUSD: 8800,
      totalPaidBRL: 48000,
      remainingBRL: 0,
      orderedAt: new Date('2026-01-15'),
      estimatedReady: new Date('2026-02-28'),
      readyAt: new Date('2026-02-25'),
      receivedAt: new Date('2026-03-10'),
    },
  });

  const prodA8 = await prisma.productionOrder.upsert({
    where: { code: 'A8' },
    update: {},
    create: {
      code: 'A8',
      description: 'Lote Abril 2026 — 10 violinos + 1 cello',
      status: 'EM_PRODUCAO',
      totalCostBRL: 72000,
      totalCostUSD: 13200,
      totalPaidBRL: 36000,
      remainingBRL: 36000,
      orderedAt: new Date('2026-03-01'),
      estimatedReady: new Date('2026-05-15'),
    },
  });

  // Production payments for A8
  await prisma.productionPayment.createMany({
    data: [
      { productionOrderId: prodA8.id, installment: 1, description: 'Entrada 50%', amountBRL: 36000, amountUSD: 6600, exchangeRate: 5.4545, dueDate: new Date('2026-03-05'), paidDate: new Date('2026-03-05'), status: 'PAGO', paymentMethod: 'Wise' },
      { productionOrderId: prodA8.id, installment: 2, description: 'Parcela 2/3', amountBRL: 18000, amountUSD: 3300, exchangeRate: 5.4545, dueDate: new Date('2026-04-15'), status: 'PENDENTE' },
      { productionOrderId: prodA8.id, installment: 3, description: 'Parcela final', amountBRL: 18000, amountUSD: 3300, exchangeRate: 5.4545, dueDate: new Date('2026-05-15'), status: 'PENDENTE' },
    ],
    skipDuplicates: true,
  });

  console.log(`  ✓ 2 production orders created (A7 received, A8 in production)\n`);

  // =========================================================================
  // 4. INSTRUMENTS (from A7 lot - received)
  // =========================================================================
  console.log('🎻 Creating instruments...');

  const classicWhite4 = models.find(m => m.type === 'CLASSIC' && m.strings === 4 && m.color === 'White')!;
  const classicBlack4 = models.find(m => m.type === 'CLASSIC' && m.strings === 4 && m.color === 'Black')!;
  const classicRed4 = models.find(m => m.type === 'CLASSIC' && m.strings === 4 && m.color === 'Red')!;
  const silhouetteBlack4 = models.find(m => m.type === 'SILHOUETTE' && m.strings === 4 && m.color === 'Black')!;
  const silhouetteBlack5 = models.find(m => m.type === 'SILHOUETTE' && m.strings === 5 && m.color === 'Black')!;
  const woodNatural4 = models.find(m => m.type === 'WOOD_SERIES' && m.strings === 4 && m.color === 'Natural')!;
  const borealisAurora4 = models.find(m => m.type === 'BOREALIS' && m.strings === 4 && m.color === 'Aurora')!;
  const classicBlue4 = models.find(m => m.type === 'CLASSIC' && m.strings === 4 && m.color === 'Blue')!;

  const instrumentsData = [
    // EM_ESTOQUE (available for sale)
    { serial: 'A7VNA001-1401-0126-03', modelId: classicWhite4.id, modelType: 'CLASSIC' as ModelType, strings: 4, color: 'White', year: 26, month: 2, status: 'EM_ESTOQUE' as InstrumentStatus, location: 'CASA_EUA' as InstrumentLocation, costPrice: 800, productionOrderId: prodA7.id },
    { serial: 'A7VNA002-1402-0126-03', modelId: classicBlack4.id, modelType: 'CLASSIC' as ModelType, strings: 4, color: 'Black', year: 26, month: 2, status: 'EM_ESTOQUE' as InstrumentStatus, location: 'CASA_EUA' as InstrumentLocation, costPrice: 800, productionOrderId: prodA7.id },
    { serial: 'A7VNA003-1403-0126-03', modelId: classicRed4.id, modelType: 'CLASSIC' as ModelType, strings: 4, color: 'Red', year: 26, month: 2, status: 'EM_ESTOQUE' as InstrumentStatus, location: 'CASA_EUA' as InstrumentLocation, costPrice: 800, productionOrderId: prodA7.id },
    { serial: 'A7VNA004-3402-0126-03', modelId: silhouetteBlack4.id, modelType: 'SILHOUETTE' as ModelType, strings: 4, color: 'Black', year: 26, month: 2, status: 'EM_ESTOQUE' as InstrumentStatus, location: 'CASA_EUA' as InstrumentLocation, costPrice: 1100, productionOrderId: prodA7.id },
    { serial: 'A7VNA005-5406-0126-03', modelId: woodNatural4.id, modelType: 'WOOD_SERIES' as ModelType, strings: 4, color: 'Natural', year: 26, month: 2, status: 'EM_ESTOQUE' as InstrumentStatus, location: 'CASA_EUA' as InstrumentLocation, costPrice: 1400, productionOrderId: prodA7.id },

    // RESERVADO (sold, preparing)
    { serial: 'A7VNA006-1404-0126-03', modelId: classicBlue4.id, modelType: 'CLASSIC' as ModelType, strings: 4, color: 'Blue', year: 26, month: 2, status: 'RESERVADO' as InstrumentStatus, location: 'CASA_EUA' as InstrumentLocation, costPrice: 800, salePrice: 2850, productionOrderId: prodA7.id, customerId: customers[0].id },

    // ENTREGUE (delivered to customer)
    { serial: 'A7VNA007-7407-0126-03', modelId: borealisAurora4.id, modelType: 'BOREALIS' as ModelType, strings: 4, color: 'Aurora', year: 26, month: 2, status: 'ENTREGUE' as InstrumentStatus, location: 'OUTRO' as InstrumentLocation, locationNote: 'Entregue a David Martinez', costPrice: 1600, salePrice: 4800, productionOrderId: prodA7.id, customerId: customers[3].id },

    // EM_TRANSITO_CLIENTE
    { serial: 'A7VNA008-4502-0126-03', modelId: silhouetteBlack5.id, modelType: 'SILHOUETTE' as ModelType, strings: 5, color: 'Black', year: 26, month: 2, status: 'EM_TRANSITO_CLIENTE' as InstrumentStatus, location: 'EM_TRANSITO' as InstrumentLocation, locationNote: 'DHL 7891234567', costPrice: 1250, salePrice: 3800, productionOrderId: prodA7.id, customerId: customers[2].id },
  ];

  const instruments = [];
  for (const data of instrumentsData) {
    const inst = await prisma.instrument.upsert({
      where: { serial: data.serial },
      update: {},
      create: data,
    });
    instruments.push(inst);

    // Create instrument event
    await prisma.instrumentEvent.create({
      data: {
        instrumentId: inst.id,
        toStatus: data.status,
        description: data.status === 'EM_ESTOQUE' ? 'Recebido da fábrica, disponível em estoque' :
          data.status === 'RESERVADO' ? 'Vendido e reservado para envio' :
          data.status === 'ENTREGUE' ? 'Entregue ao cliente' :
          data.status === 'EM_TRANSITO_CLIENTE' ? 'Despachado via DHL' : 'Status registrado',
      },
    });
  }

  console.log(`  ✓ ${instruments.length} instruments created\n`);

  // =========================================================================
  // 5. ORDERS
  // =========================================================================
  console.log('🛒 Creating orders...');

  // Order 1 - Sarah Johnson - Classic Blue (RESERVADO, awaiting payment)
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'AV-202604-001',
      source: 'SHOPIFY',
      customerId: customers[0].id,
      subtotal: 2850,
      shippingCharge: 75,
      discount: 0,
      total: 2925,
      feeShopify: 87.75,
      totalFees: 87.75,
      income: 2837.25,
      shippingCost: 45,
      productionCost: 800,
      profit: 1992.25,
      status: 'PREPARANDO',
      instruments: { connect: [{ id: instruments[5].id }] },
    },
  });

  // Order 2 - Emma Wilson - Silhouette 5-String (EM_TRANSITO)
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'AV-202603-042',
      date: new Date('2026-03-28'),
      source: 'INVOICE_PAYPAL',
      customerId: customers[2].id,
      subtotal: 3800,
      shippingCharge: 120,
      discount: 0,
      total: 3920,
      feePaypal: 117.60,
      totalFees: 117.60,
      income: 3802.40,
      shippingCost: 95,
      productionCost: 1250,
      profit: 2457.40,
      status: 'ENVIADO',
      paidAt: new Date('2026-03-29'),
      instruments: { connect: [{ id: instruments[7].id }] },
    },
  });

  // Order 3 - David Martinez - Borealis (ENTREGUE)
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'AV-202603-038',
      date: new Date('2026-03-15'),
      source: 'SHOPIFY',
      customerId: customers[3].id,
      subtotal: 4800,
      shippingCharge: 0,
      discount: 200,
      total: 4600,
      feeShopify: 138,
      totalFees: 138,
      income: 4462,
      shippingCost: 55,
      productionCost: 1600,
      profit: 2807,
      status: 'ENTREGUE',
      paidAt: new Date('2026-03-16'),
      instruments: { connect: [{ id: instruments[6].id }] },
      exchangeRate: 5.45,
      totalBRL: 25070,
      profitBRL: 15298.15,
    },
  });

  // Order 4 - Michael Chen - awaiting payment
  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'AV-202604-002',
      source: 'INVOICE_STRIPE',
      customerId: customers[1].id,
      subtotal: 3500,
      shippingCharge: 65,
      discount: 0,
      total: 3565,
      status: 'AGUARDANDO_PAGTO',
    },
  });

  console.log(`  ✓ 4 orders created\n`);

  // =========================================================================
  // 6. SHIPMENT for order2 (Emma Wilson)
  // =========================================================================
  console.log('📦 Creating shipments...');

  await prisma.shipment.create({
    data: {
      orderId: order2.id,
      customerId: customers[2].id,
      carrier: 'DHL',
      trackingNumber: '7891234567',
      origin: 'EUA',
      destName: 'Emma Wilson',
      destAddress: '78 Camden Rd',
      destCity: 'London',
      destCountry: 'GB',
      weight: 3.5,
      status: 'EM_TRANSITO',
      shippingCost: 95,
      shippedAt: new Date('2026-04-01'),
      estimatedDelivery: new Date('2026-04-10'),
      instruments: { connect: [{ id: instruments[7].id }] },
    },
  });

  // Shipment for order3 (David Martinez - delivered)
  await prisma.shipment.create({
    data: {
      orderId: order3.id,
      customerId: customers[3].id,
      carrier: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      origin: 'EUA',
      destName: 'David Martinez',
      destAddress: '910 Broadway',
      destCity: 'New York',
      destCountry: 'US',
      weight: 3.2,
      status: 'ENTREGUE',
      shippingCost: 55,
      shippedAt: new Date('2026-03-18'),
      deliveredAt: new Date('2026-03-20'),
      instruments: { connect: [{ id: instruments[6].id }] },
    },
  });

  console.log(`  ✓ 2 shipments created\n`);

  // =========================================================================
  // 7. FINANCIAL RECORDS
  // =========================================================================
  console.log('💰 Creating financial records...');

  await prisma.financial.createMany({
    data: [
      { date: new Date('2026-03-16'), type: 'ENTRADA', category: 'VENDA', description: 'Venda Borealis 4-Str - David Martinez', amountUSD: 4600, amountBRL: 25070, exchangeRate: 5.45, orderId: order3.id },
      { date: new Date('2026-03-29'), type: 'ENTRADA', category: 'VENDA', description: 'Venda Silhouette 5-Str - Emma Wilson', amountUSD: 3920, amountBRL: 21364, exchangeRate: 5.45, orderId: order2.id },
      { date: new Date('2026-03-05'), type: 'SAIDA', category: 'CUSTO_PRODUCAO', description: 'Entrada 50% Lote A8', amountUSD: 6600, amountBRL: 36000, exchangeRate: 5.4545, productionOrderId: prodA8.id },
      { date: new Date('2026-03-18'), type: 'SAIDA', category: 'FRETE_ENVIO', description: 'DHL Envio #7891234567 - Emma Wilson', amountUSD: 95, amountBRL: 517.75, exchangeRate: 5.45, orderId: order2.id },
      { date: new Date('2026-03-18'), type: 'SAIDA', category: 'FRETE_ENVIO', description: 'UPS Envio - David Martinez', amountUSD: 55, amountBRL: 299.75, exchangeRate: 5.45, orderId: order3.id },
      { date: new Date('2026-04-01'), type: 'SAIDA', category: 'TAXA_SHOPIFY', description: 'Taxa Shopify venda #AV-202603-038', amountUSD: 138, amountBRL: 752.10, exchangeRate: 5.45, orderId: order3.id },
      { date: new Date('2026-04-01'), type: 'SAIDA', category: 'TAXA_PAYPAL', description: 'Taxa PayPal venda #AV-202603-042', amountUSD: 117.60, amountBRL: 640.92, exchangeRate: 5.45, orderId: order2.id },
      { date: new Date('2026-04-01'), type: 'SAIDA', category: 'ASSINATURA', description: 'Shopify Basic Plan - Abril 2026', amountUSD: 39, amountBRL: 212.55, exchangeRate: 5.45 },
      { date: new Date('2026-03-10'), type: 'SAIDA', category: 'FRETE_ESTOQUE', description: 'DHL Frete Fábrica→EUA Lote A7', amountUSD: 480, amountBRL: 2616, exchangeRate: 5.45, productionOrderId: prodA7.id },
    ],
  });

  console.log(`  ✓ 9 financial records created\n`);

  // =========================================================================
  // 8. EXCHANGE RATES
  // =========================================================================
  console.log('💱 Creating exchange rates...');

  const rates = [
    { date: new Date('2026-04-09'), usdToBrl: 5.47 },
    { date: new Date('2026-04-08'), usdToBrl: 5.45 },
    { date: new Date('2026-04-07'), usdToBrl: 5.48 },
    { date: new Date('2026-04-04'), usdToBrl: 5.44 },
    { date: new Date('2026-04-03'), usdToBrl: 5.42 },
    { date: new Date('2026-04-02'), usdToBrl: 5.46 },
    { date: new Date('2026-04-01'), usdToBrl: 5.45 },
  ];

  for (const rate of rates) {
    await prisma.exchangeRate.upsert({
      where: { date: rate.date },
      update: {},
      create: { date: rate.date, usdToBrl: rate.usdToBrl, source: 'BCB' },
    });
  }

  console.log(`  ✓ ${rates.length} exchange rates created\n`);

  // =========================================================================
  // 9. UPDATE CUSTOMER STATS
  // =========================================================================
  await prisma.customer.update({ where: { id: customers[0].id }, data: { totalSpent: 2925, orderCount: 1 } });
  await prisma.customer.update({ where: { id: customers[2].id }, data: { totalSpent: 3920, orderCount: 1 } });
  await prisma.customer.update({ where: { id: customers[3].id }, data: { totalSpent: 4600, orderCount: 1 } });
  await prisma.customer.update({ where: { id: customers[1].id }, data: { totalSpent: 0, orderCount: 1 } });

  console.log('✅ Seed complete! Aurora Violins ERP is ready.\n');
  console.log('Summary:');
  console.log('  - 15 violin models (Classic, Silhouette, Wood Series, Borealis, Cello)');
  console.log('  - 7 customers');
  console.log('  - 8 instruments (5 in stock, 1 reserved, 1 in transit, 1 delivered)');
  console.log('  - 4 orders (1 preparing, 1 shipped, 1 delivered, 1 awaiting payment)');
  console.log('  - 2 shipments (1 in transit, 1 delivered)');
  console.log('  - 2 production orders (A7 received, A8 in production)');
  console.log('  - 9 financial records');
  console.log('  - 7 exchange rates');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
