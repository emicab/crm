const { GoogleGenAI } = require('@google/genai');

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Need GEMINI_API_KEY");
  const client = new GoogleGenAI({ apiKey });
  
  const systemInstruction = "Eres un asistente.";
  const historyArr = [
    { type: "user_input", content: [{ type: "text", text: "Hola" }] },
    { type: "model_output", content: [{ type: "text", text: "Soy un asistente" }] },
    { type: "user_input", content: [{ type: "text", text: "cual es el producto con mayor margen de ganancia?" }] }
  ];

  const tools = [{
      type: 'function',
      name: "ejecutar_consulta_sql",
      description: "Ejecuta una consulta SQL RAW (SOLO SELECT)",
      parameters: {
        type: 'object',
        properties: {
          consulta_sql: { type: 'string' }
        },
        required: ["consulta_sql"],
      },
    }];

  try {
    const res = await client.interactions.create({
      store: false,
      system_instruction: systemInstruction,
      input: historyArr,
      tools: tools,
      model: "gemini-3.5-flash-lite"
    });

    console.log("Response 1:", JSON.stringify(res, null, 2));
    
    // Simulate function result
    const call = res.steps.find(s => s.type === 'function_call');
    if (call) {
      historyArr.push(...res.steps);
      historyArr.push({
        type: 'function_result',
        name: call.name,
        call_id: call.id,
        result: [{ type: 'text', text: JSON.stringify({ resultados: [{ name: "FERNET", margen: 6634 }] }) }]
      });

      const res2 = await client.interactions.create({
        store: false,
        system_instruction: systemInstruction,
        input: historyArr,
        tools: tools,
        model: "gemini-3.5-flash-lite"
      });
      console.log("Response 2:", JSON.stringify(res2, null, 2));
    }
  } catch (e) {
    console.error("SDK ERROR:", e);
  }
}

run();
