import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let whereClause = {};

    if (activeOnly) {
      const now = new Date();
      whereClause = {
        active: true,
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      };
    }

    const promotions = await prisma.creditCardPromotion.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(promotions);
  } catch (error) {
    console.error("Error fetching credit card promotions:", error);
    return NextResponse.json({ error: "Failed to fetch promotions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validaciones básicas
    if (!data.bank || !data.installments) {
      return NextResponse.json({ error: "El banco y la cantidad de cuotas son requeridos." }, { status: 400 });
    }

    const promotion = await prisma.creditCardPromotion.create({
      data: {
        bank: data.bank,
        installments: data.installments,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        notes: data.notes || null,
        active: data.active !== undefined ? data.active : true,
      }
    });

    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error("Error creating credit card promotion:", error);
    return NextResponse.json({ error: "Failed to create promotion" }, { status: 500 });
  }
}
