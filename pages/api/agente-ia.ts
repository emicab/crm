import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { decryptText } from '../../lib/encryption';
import { GoogleGenAI } from '@google/genai';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { message, sessionId, userId } = req.body;

    if (!userId) {
      return res.status(403).json({ error: "Acceso denegado: Usuario no identificado." });
    }
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ error: "Acceso denegado: Se requiere rol de Administrador para usar ClinIA." });
    }

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const setting = await prisma.setting.findUnique({
      where: { key: "geminiApiKey" },
    });

    if (!setting || !setting.value) {
      return res.status(401).json({ error: "API Key de Gemini no configurada." });
    }

    const apiKey = decryptText(setting.value);
    
    if (!apiKey) {
      return res.status(401).json({ error: "API Key inválida." });
    }

    const client = new GoogleGenAI({ apiKey });

    // Declarar las herramientas (Tools)
    const getSalesMetrics = {
      type: 'function',
      name: "obtener_metricas_ventas",
      description: "Obtiene el total de ventas, transacciones y ganancias netas de los últimos X días.",
      parameters: {
        type: 'object',
        properties: {
          dias: {
            type: 'number',
            description: "Número de días hacia atrás a analizar (ej. 7 para una semana)",
          }
        },
        required: ["dias"],
      },
    };

    const getLowStock = {
      type: 'function',
      name: "obtener_productos_bajo_stock",
      description: "Obtiene una lista de productos que están por debajo de su alerta de stock mínimo, indicando cantidad actual y mínima.",
      parameters: {
        type: 'object',
        properties: {
          limite: {
            type: 'number',
            description: "Número máximo de productos a retornar (ej. 10)",
          }
        },
      },
    };

    const getTopProducts = {
      type: 'function',
      name: "obtener_productos_mas_vendidos",
      description: "Obtiene los productos más vendidos en los últimos X días.",
      parameters: {
        type: 'object',
        properties: {
          dias: { type: 'number', description: "Número de días hacia atrás (ej. 7)" },
          limite: { type: 'number', description: "Cantidad de productos a mostrar (ej. 5)" }
        },
      },
    };

    const createPromo = {
      type: 'function',
      name: "crear_promocion",
      description: "Crea una nueva promoción o descuento global en el sistema.",
      parameters: {
        type: 'object',
        properties: {
          nombre: {
            type: 'string',
            description: "Nombre de la promoción (ej. 'Liquidación Fin de Mes')",
          },
          descuento: {
            type: 'number',
            description: "Valor numérico del descuento (ej. 15)",
          },
          tipo: {
            type: 'string',
            description: "Tipo de descuento: 'PERCENTAGE' (porcentaje) o 'FIXED_AMOUNT' (monto fijo)",
          }
        },
        required: ["nombre", "descuento", "tipo"],
      },
    };

    const createClientTool = {
      type: 'function',
      name: "crear_cliente",
      description: "Registra un nuevo cliente en el sistema ClinPOS.",
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: "Nombre del cliente (ej. 'Juan')" },
          apellido: { type: 'string', description: "Apellido del cliente (ej. 'Pérez')" },
          telefono: { type: 'string', description: "Teléfono o celular del cliente" },
          email: { type: 'string', description: "Correo electrónico del cliente" },
          cuit: { type: 'string', description: "CUIT / CUIL o DNI del cliente" },
          direccion: { type: 'string', description: "Dirección física" },
          notas: { type: 'string', description: "Notas u observaciones" },
        },
        required: ["nombre"],
      },
    };

    const updateStockAlertTool = {
      type: 'function',
      name: "actualizar_alerta_stock",
      description: "Actualiza el umbral de alerta de stock mínimo para un producto.",
      parameters: {
        type: 'object',
        properties: {
          productoId: { type: 'number', description: "ID numérico del producto" },
          stockMinAlert: { type: 'number', description: "Cantidad mínima de stock antes de alertar (ej. 5)" },
        },
        required: ["productoId", "stockMinAlert"],
      },
    };

    const createDiscountCodeTool = {
      type: 'function',
      name: "crear_codigo_descuento",
      description: "Crea un nuevo código de descuento (cupón promocional) en el sistema. NOTA: Solo admite porcentajes.",
      parameters: {
        type: 'object',
        properties: {
          codigo: { type: 'string', description: "Código en mayúsculas (ej. 'VERANO2026')" },
          descuento: { type: 'number', description: "Porcentaje de descuento (ej. 10 para 10%)" },
          usoMaximo: { type: 'number', description: "Cantidad máxima de usos permitidos (opcional)" },
        },
        required: ["codigo", "descuento"],
      },
    };

    const createComboTool = {
      type: 'function',
      name: "crear_combo",
      description: "Crea un combo promocional que agrupa varios productos por un precio final unificado.",
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: "Nombre del combo (ej. 'Combo Fernet + Coca')" },
          precio: { type: 'number', description: "Precio final del combo" },
          descripcion: { type: 'string', description: "Descripción breve del combo" },
          items: {
            type: 'array',
            description: "Lista de productos que componen el combo",
            items: {
              type: 'object',
              properties: {
                productoId: { type: 'number', description: "ID del producto en la base de datos" },
                cantidad: { type: 'number', description: "Cantidad de este producto en el combo" }
              },
              required: ["productoId", "cantidad"]
            }
          }
        },
        required: ["nombre", "precio", "items"],
      },
    };

    const executeSql = {
      type: 'function',
      name: "ejecutar_consulta_sql",
      description: "Ejecuta una consulta SQL RAW (SOLO SELECT) en la base de datos SQLite para extraer métricas complejas, morosidad, compras a proveedores, rendimiento de vendedores, etc.",
      parameters: {
        type: 'object',
        properties: {
          consulta_sql: {
            type: 'string',
            description: "La consulta SQL válida para SQLite. Ej: SELECT count(*) FROM Client",
          }
        },
        required: ["consulta_sql"],
      },
    };

    const outOfScopeTrap = {
      type: 'function',
      name: "responder_fuera_de_alcance",
      description: "Usar SIEMPRE que la pregunta del usuario no tenga relación con el negocio (ventas, stock, clientes, cuenta corriente, proveedores, compras, gastos, vendedores, promociones, caja, consignaciones). Ejemplos: matemática, charla general, preguntas sobre temas externos, saludos sin contexto de negocio.",
      parameters: { type: 'object', properties: {} },
    };

    const tools = [
      getSalesMetrics, getLowStock, getTopProducts, createPromo, createComboTool,
      createClientTool, updateStockAlertTool, createDiscountCodeTool,
      executeSql, outOfScopeTrap
    ];

    const businessNameSetting = await prisma.setting.findUnique({ where: { key: "businessName" } });
    const businessName = businessNameSetting?.value?.trim() || "tu negocio";

    const systemInstruction = `Eres el Asistente Copilot Autónomo de ${businessName}, integrado al software POS ClinPOS.
Tienes acceso a herramientas reales (functions) para consultar métricas, ver inventario bajo, crear promociones, registrar clientes, actualizar alertas de stock, crear códigos de descuento y ejecutar SQL para analítica profunda.

Tu único propósito es responder preguntas sobre la gestión integral de ${businessName}:
- Ventas y Facturación
- Inventario, Stock y Alertas
- Clientes, Cuenta Corriente y Deudas/Morosidad
- Proveedores, Compras e Insumos
- Vendedores, Turnos y Movimientos de Caja
- Promociones, Combos y Códigos de Descuento
- Ventas a Consignación

Si te preguntan algo que NO está relacionado con la gestión de ${businessName} (matemática, cultura general, charla casual, cualquier tema ajeno al negocio), debes usar la herramienta 'responder_fuera_de_alcance'.

IMPORTANTE SOBRE SQL:
- Base de datos SQLite. NUNCA consultes SQLITE_MASTER, sqlite_master ni tablas internas del sistema.
- SOLO TIENES PERMISOS PARA EJECUTAR 'SELECT'. Nunca intentes UPDATE, DELETE, INSERT o DROP.
- MANEJO DE FECHAS: Las columnas de fecha se guardan como timestamps en MILISEGUNDOS. Para extraer hora o fecha SIEMPRE divide por 1000:
  * Hora: strftime('%H:00', saleDate / 1000, 'unixepoch', 'localtime')
  * Fecha: strftime('%Y-%m-%d', saleDate / 1000, 'unixepoch', 'localtime')

ESQUEMA EXACTO DE LA BASE DE DATOS (usa SOLO estos nombres de columnas):

Sale: id, saleDate(ms), totalAmount, paymentType, notes, clientId, sellerId, cashRegisterId, status, onAccount
SaleItem: id, saleId, productId, quantity, unitPrice, totalPrice
Product: id, name, sku, description, pricePurchase, priceSale, quantityStock, stockMinAlert, unitType, brandId, categoryId, supplierId
Category: id, name, logoUrl
Brand: id, name, logoUrl
Supplier: id, name, email, phone, address, contactName
Client: id, firstName, lastName, email, phone, address, notes, cuit, businessName
Seller: id, name, email, phone, isActive
AccountBalance: id, clientId, balance
AccountMovement: id, accountBalanceId, amount, type, description, saleId, createdAt(ms)
Purchase: id, supplierId, totalAmount, notes, purchaseDate(ms), status
PurchaseItem: id, purchaseId, productId, quantity, unitCost
Expense: id, amount, description, category, date(ms)
CashMovement: id, amount, type, description, sourceId, cashRegisterId, createdAt(ms)
Shift: id, sellerId, cashRegisterId, openedAt(ms), closedAt(ms), openingAmount, closingAmount, status
Consignment: id, clientId, status, notes, deliveredAt(ms), settledAt(ms)
ConsignmentItem: id, consignmentId, productId, quantityDelivered, quantitySold, quantityReturned, unitPrice
DiscountCode: id, code, type, value, maxUses, usedCount, isActive
Promotion: id, name, type, discountType, discountValue, status, priority

MANEJO DE ERRORES: Si una herramienta devuelve un error técnico (ej. "no such column", "Violación de Privacidad", etc.), NUNCA muestres esos detalles técnicos crudos al usuario. Solo dile de forma natural y amigable que hubo un inconveniente al procesar su solicitud o que no pudiste encontrar los datos exactos.

Responde de manera profesional, amigable, concisa y siempre usando Markdown.
Si consideras útil sugerirle al usuario siguientes pasos o preguntas de seguimiento, incluye al final de tu respuesta una lista de sugerencias dentro de una etiqueta <suggestions> separadas por pipes (|). Ejemplo:
<suggestions>Ver deudas en cuenta corriente|Ver compras del mes|Ver consignaciones pendientes</suggestions>`;

    // --- MANEJO DE SESIÓN Y PERSISTENCIA ---
    let currentSessionId = sessionId;
    let dbHistory: any[] = [];

    if (currentSessionId) {
      dbHistory = await prisma.chatMessage.findMany({
        where: { sessionId: currentSessionId },
        orderBy: { createdAt: 'asc' }
      });
    } else {
      const newSession = await prisma.chatSession.create({
        data: { title: message.substring(0, 30) + (message.length > 30 ? "..." : "") }
      });
      currentSessionId = newSession.id;
    }

    // Guardar el mensaje del usuario en la BD
    await prisma.chatMessage.create({
      data: {
        sessionId: currentSessionId,
        role: "user",
        content: message
      }
    });

    // Construir el contexto para Gemini a partir de la historia guardada
    const contextStr = dbHistory.map((m: any) => `${m.role === 'user' ? 'Usuario' : 'Agente'}: ${m.content}`).join("\n");
    const fullPrompt = `Contexto de la conversacion (ya respondido):
${contextStr}

Mensaje actual del usuario (debes responder a esto, y llamar a funciones si es necesario para responderlo): ${message}`;

    let historyArr: any[] = [{ type: "user_input", content: [{ type: "text", text: fullPrompt }] }];

    // Función auxiliar con fallback automático entre modelos de la Interactions API
    const MODELS_FALLBACK = [
      "gemini-3.5-flash-lite",
    ];
    const safeCreateInteraction = async (params: any) => {
      let lastError = null;
      for (const modelName of MODELS_FALLBACK) {
        try {
          const res = await client.interactions.create({
            ...params,
            model: modelName,
          });
          if (modelName !== MODELS_FALLBACK[0]) {
            console.log(`[ClinIA Fallback Exitoso] Respondiendo con el modelo alternativo: ${modelName}`);
          }
          return res;
        } catch (err: any) {
          lastError = err;
          console.warn(`[ClinIA Fallback] Modelo ${modelName} no pudo responder (${err?.message || "Error de API"}). Probando modelo alternativo...`);
          continue;
        }
      }
      throw lastError;
    };

    let currentInteraction = await safeCreateInteraction({
      store: false,
      system_instruction: systemInstruction,
      input: historyArr,
      tools: tools as any,
    });

    function extractOutputText(interaction: any): string | null {
      if (!interaction) return null;

      if (interaction.output_text && typeof interaction.output_text === 'string' && interaction.output_text.trim().length > 0) {
        return interaction.output_text.trim();
      }

      if (interaction.steps && Array.isArray(interaction.steps)) {
        for (const step of interaction.steps) {
          if (step.text && typeof step.text === 'string' && step.text.trim()) {
            return step.text.trim();
          }
          if (step.parts && Array.isArray(step.parts)) {
            const joined = step.parts.map((p: any) => (typeof p === 'string' ? p : p?.text || '')).join('').trim();
            if (joined) return joined;
          }
          if (step.content) {
            if (typeof step.content === 'string' && step.content.trim()) {
              return step.content.trim();
            }
            if (Array.isArray(step.content)) {
              for (const c of step.content) {
                if (c.text && typeof c.text === 'string' && c.text.trim()) return c.text.trim();
                if (typeof c === 'string' && c.trim()) return c.trim();
              }
            }
          }
        }
      }

      if (interaction.candidates && Array.isArray(interaction.candidates)) {
        for (const cand of interaction.candidates) {
          const parts = cand.content?.parts;
          if (Array.isArray(parts)) {
            const joined = parts.map((p: any) => p.text || '').join('').trim();
            if (joined) return joined;
          }
        }
      }

      return null;
    }

    let finalResponse = extractOutputText(currentInteraction);
    let loopCount = 0;

    // Bucle para soportar múltiples llamadas a funciones (multi-step function calling)
    while (!finalResponse && loopCount < 5) {
      const fcStep = currentInteraction.steps?.find((s: any) => s.type === 'function_call');
      if (!fcStep) break;

      historyArr = historyArr.concat(currentInteraction.steps || []);
      
      const call = fcStep as any; // Para evitar errores de tipos en TS con el union type 'Step'
      let toolResponse: any = null;

      try {
        if (call.name === "obtener_metricas_ventas") {
          const dias = call.arguments?.dias || 7;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - dias);
          
          const sales = await prisma.sale.findMany({
            where: { saleDate: { gte: startDate }, status: "COMPLETED" },
            include: { items: true }
          });
          const totalVentas = sales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
          toolResponse = { transacciones: sales.length, ingresosBrutos: totalVentas, periodo: `${dias} dias` };
        
        } else if (call.name === "obtener_productos_bajo_stock") {
          const limit = call.arguments?.limite || 10;
          const products = await prisma.product.findMany();
          const lowStock = products.filter(p => p.stockMinAlert !== null && p.quantityStock <= p.stockMinAlert).slice(0, limit);
          toolResponse = { productos: lowStock.map(p => ({ id: p.id, nombre: p.name, stockActual: p.quantityStock, alertaEn: p.stockMinAlert })) };
        
        } else if (call.name === "obtener_productos_mas_vendidos") {
          const dias = call.arguments?.dias || 30;
          const limit = call.arguments?.limite || 5;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - dias);

          const items = await prisma.saleItem.groupBy({
            by: ["productId"],
            where: {
              sale: {
                saleDate: { gte: startDate },
                status: "COMPLETED"
              }
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: limit
          });

          const topProducts = await Promise.all(
            items.map(async (i) => {
              const product = await prisma.product.findUnique({ where: { id: i.productId } });
              return {
                nombre: product?.name || "Desconocido",
                cantidadVendida: i._sum.quantity || 0,
              };
            })
          );
          toolResponse = { productosMasVendidos: topProducts, periodo: `${dias} dias` };

        } else if (call.name === "crear_promocion") {
          const { nombre, descuento, tipo } = call.arguments as any;
          if (tipo === "PERCENTAGE" && (descuento < 1 || descuento > 100)) {
            toolResponse = { error: "El descuento en porcentaje debe estar entre 1 y 100." };
          } else if (tipo === "FIXED_AMOUNT" && descuento <= 0) {
            toolResponse = { error: "El descuento fijo debe ser mayor a 0." };
          } else {
            const promo = await prisma.promotion.create({
              data: {
                name: nombre,
                type: "SET_DISCOUNT",
                discountType: tipo === "PERCENTAGE" ? "PERCENTAGE" : "FIXED_AMOUNT",
                discountValue: descuento,
                status: "ACTIVE",
                priority: 1,
              }
            });
            toolResponse = { exito: true, promocionCreada: promo };
          }
          
        } else if (call.name === "crear_combo") {
          const { nombre, precio, descripcion, items } = call.arguments as any;
          if (!items || !items.length) {
            toolResponse = { error: "El combo debe contener al menos un producto (items)." };
          } else if (precio <= 0) {
            toolResponse = { error: "El precio del combo debe ser mayor a 0." };
          } else {
            const combo = await prisma.combo.create({
              data: {
                name: nombre,
                price: precio,
                description: descripcion || null,
                active: true,
                items: {
                  create: items.map((i: any) => ({
                    productId: parseInt(i.productoId),
                    quantity: parseFloat(i.cantidad) || 1,
                  }))
                }
              },
              include: { items: true }
            });
            toolResponse = { exito: true, comboCreado: combo };
          }

        } else if (call.name === "crear_cliente") {
          const { nombre, apellido, telefono, email, cuit, direccion, notas } = call.arguments as any;
          const newClient = await prisma.client.create({
            data: {
              firstName: nombre,
              lastName: apellido || null,
              phone: telefono || null,
              email: email || null,
              cuit: cuit || null,
              address: direccion || null,
              notes: notas || null,
            }
          });
          toolResponse = { exito: true, clienteCreado: newClient };

        } else if (call.name === "actualizar_alerta_stock") {
          const { productoId, stockMinAlert } = call.arguments as any;
          const updated = await prisma.product.update({
            where: { id: parseInt(productoId) },
            data: { stockMinAlert: parseFloat(stockMinAlert) }
          });
          toolResponse = { exito: true, productoActualizado: { id: updated.id, nombre: updated.name, stockMinAlert: updated.stockMinAlert } };

        } else if (call.name === "crear_codigo_descuento") {
          const { codigo, descuento, usoMaximo } = call.arguments as any;
          const codeUpper = codigo.trim().toUpperCase();
          const createdCode = await prisma.discountCode.create({
            data: {
              code: codeUpper,
              discountPercent: descuento,
              maxUses: usoMaximo ? parseInt(usoMaximo) : null,
              isActive: true,
            }
          });
          toolResponse = { exito: true, codigoDescuentoCreado: createdCode };
          
        } else if (call.name === "ejecutar_consulta_sql") {
          const { consulta_sql } = call.arguments as any;
          
          const upperQuery = consulta_sql.trim().toUpperCase();
          if (!upperQuery.startsWith("SELECT")) {
             throw new Error("Violación de Seguridad: Solo se permiten consultas SELECT.");
          }

          // Allowlist estricto de tablas para proteger Setting, User, etc.
          const TABLAS_PERMITIDAS = ['Product', 'Category', 'Brand', 'Supplier', 'Sale', 'SaleItem', 'Purchase', 'PurchaseItem', 'Client', 'Seller', 'PaymentMethod', 'Expense', 'CashMovement', 'Shift', 'Consignment', 'ConsignmentItem', 'AccountBalance', 'AccountMovement', 'DiscountCode', 'Promotion', 'Combo', 'ComboItem'];
          
          // Regex basica para extraer palabras que siguen a FROM o JOIN
          const tableMatches = upperQuery.match(/(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)/g);
          if (tableMatches) {
             for (const match of tableMatches) {
                const tableName = match.split(/\s+/)[1];
                // Busqueda case-insensitive en el allowlist
                if (!TABLAS_PERMITIDAS.some(t => t.toUpperCase() === tableName)) {
                   throw new Error(`Violación de Privacidad: La tabla '${tableName}' no está en la lista de tablas permitidas para consultas analíticas.`);
                }
             }
          }

          try {
            // Conexión aislada nativa de solo lectura para ejecutar de forma estructuralmente segura
            let dbPath = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace("file:", "") : "./prisma/dev.db";
            // Prisma resuelve file:./dev.db relativo a la carpeta prisma/. node:sqlite lo hace desde la raíz.
            if (dbPath === "./dev.db" || dbPath === "dev.db") {
              dbPath = "./prisma/dev.db";
            }
            // @ts-expect-error: eval avoids webpack resolving the native module at build time
            const { DatabaseSync } = eval("require('node:sqlite')");
            const safeDb = new DatabaseSync(dbPath, { readOnly: true });
            
            const rawData = safeDb.prepare(consulta_sql).all();
            
            // Límite de seguridad para evitar exceder el límite de tokens de respuesta (Payload)
            const arrayData = Array.isArray(rawData) ? rawData : [rawData];
            if (arrayData.length > 50) {
               toolResponse = { nota: "Resultados truncados a los primeros 50 registros", resultados: arrayData.slice(0, 50) };
            } else {
               toolResponse = { resultados: arrayData };
            }
          } catch (dbErr: any) {
             toolResponse = { error_sql: dbErr.message };
          }

        } else if (call.name === "responder_fuera_de_alcance") {
          toolResponse = { mensaje: `Fuera de alcance — no ejecutar ninguna acción. Informa amablemente al usuario que solo puedes responder preguntas de la gestión de ${businessName} (ventas, stock, clientes, caja, promociones).` };
          
        } else {
          toolResponse = { error: "Función desconocida" };
        }
      } catch (err: any) {
        toolResponse = { error: err.message };
      }

      // Enviar resultado de vuelta
      historyArr.push({
        type: 'function_result',
        name: call.name,
        call_id: call.id,
        result: [{ type: 'text', text: JSON.stringify(toolResponse, (key, value) => typeof value === 'bigint' ? value.toString() : value) }]
      });

      currentInteraction = await safeCreateInteraction({
        store: false,
        system_instruction: systemInstruction,
        input: historyArr,
        tools: tools as any,
      });
      
      finalResponse = extractOutputText(currentInteraction);
      loopCount++;
    }

    // Si el modelo quedó atrapado en un bucle de herramientas sin generar texto,
    // hacemos una llamada final SIN herramientas para forzar una respuesta en texto.
    if (!finalResponse) {
      console.warn("[ClinIA] Modelo atrapado en bucle de herramientas. Forzando síntesis final sin tools...");
      try {
        // Construir un prompt de síntesis con toda la info recopilada
        const synthesisPrompt = `${historyArr.map((h: any) => {
          if (h.type === 'user_input') return '';
          if (h.type === 'function_result') return `Resultado de herramienta ${h.name}: ${h.result?.[0]?.text || ''}`;
          return '';
        }).filter(Boolean).join('\n')}

Con base en los resultados de las herramientas anteriores, responde de forma clara y concisa en Markdown al usuario. No llames a ninguna herramienta adicional.`;

        const finalCall = await safeCreateInteraction({
          store: false,
          system_instruction: systemInstruction,
          input: [{ type: "user_input", content: [{ type: "text", text: synthesisPrompt }] }],
          tools: [], // Sin herramientas — fuerza texto puro
        });
        finalResponse = extractOutputText(finalCall);
        if (!finalResponse && finalCall?.output_text) finalResponse = finalCall.output_text;
      } catch (synthErr: any) {
        console.error("[ClinIA] Error en síntesis forzada:", synthErr?.message);
      }
    }

    if (!finalResponse) {
      finalResponse = "Obtuve los datos de tu negocio, pero no pude formatear la respuesta. Intenta de nuevo con una pregunta más específica.";
    }

    // Extraer sugerencias si existen
    let suggestions: string[] = [];
    const suggestionMatch = finalResponse.match(/<suggestions>([\s\S]*?)<\/suggestions>/i);
    if (suggestionMatch) {
      suggestions = suggestionMatch[1].split('|').map(s => s.trim()).filter(Boolean);
      finalResponse = finalResponse.replace(/<suggestions>[\s\S]*?<\/suggestions>/i, '').trim();
    }

    // Guardar el mensaje del modelo en la BD
    await prisma.chatMessage.create({
      data: {
        sessionId: currentSessionId,
        role: "model",
        content: finalResponse,
        suggestions: suggestions.length > 0 ? JSON.stringify(suggestions) : null
      }
    });

    return res.status(200).json({ reply: finalResponse, suggestions, sessionId: currentSessionId });
  } catch (error: any) {
    console.error("Agent error:", error);
    
    // Interceptar errores de cuota (Rate Limit 429) para no mostrar el error crudo al usuario final
    if (error.message && error.message.includes("429")) {
      return res.status(429).json({ error: "¡Ups! Me hiciste muchas preguntas muy rápido y me quedé sin aliento (límite de consultas gratuitas alcanzado). Por favor, esperá 1 minutito y volvé a intentarlo ⏱️" });
    }

    return res.status(500).json({ error: "Ocurrió un error interno al intentar comunicarme con el motor de IA. Intenta de nuevo más tarde." });
  }
}
