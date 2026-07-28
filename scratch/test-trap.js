require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { GoogleGenAI } = require('@google/genai');
const { decryptText } = require('../lib/encryption');

async function run() {
  const setting = await prisma.setting.findUnique({ where: { key: 'geminiApiKey' } });
  const apiKey = decryptText(setting.value);
  const client = new GoogleGenAI({ apiKey });

  const tools = [{
    type: 'function',
    name: "responder_fuera_de_alcance",
    description: "Usar SIEMPRE que la pregunta del usuario no tenga relación con el negocio",
    parameters: { type: 'object', properties: {} },
  }];

  try {
    const res = await client.interactions.create({
      store: false,
      model: "gemini-3.5-flash-lite",
      tools: tools,
      input: [{ type: "user_input", content: [{ type: "text", text: "Hola" }] }]
    });
    console.log("Success");
  } catch (e) {
    console.log("Error:", e.message || e);
  }
}
run();
