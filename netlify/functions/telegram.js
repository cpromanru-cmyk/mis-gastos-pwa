// netlify/functions/telegram.js
const SUPABASE_URL = 'https://zxjctenaxqhosxeuqrxl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_deLxambtyjoS5tE2elApsQ_l1WugKqy';
const TELEGRAM_TOKEN = '9247154659:AAFerZqo9CG46iPlRi9MUgifriXUqxRFubE';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'Bot activo' };
  }

  try {
    const body = JSON.parse(event.body);
    if (!body.message || !body.message.text) {
      return { statusCode: 200, body: 'Sin texto' };
    }

    const chatId = body.message.chat.id;
    const text = body.message.text.trim();

    // Formato esperado: "Descripción Monto Categoría" (Ej: "Taxi 15 Transporte")
    const parts = text.split(' ');
    
    if (parts.length < 2) {
      await sendTelegram(chatId, '⚠️ Formato: *Descripción Monto Categoría*\nEjemplo: `Almuerzo 25 Comida`');
      return { statusCode: 200, body: 'Formato inválido' };
    }

    // Extraer categoría (si no pone, asume 'Otros') y monto
    let category = 'Otros';
    let amount = 0;
    let desc = '';

    const validCategories = ['Vivienda', 'Comida', 'Transporte', 'Servicios', 'Ocio', 'Salud', 'Otros'];
    const lastWord = capitalize(parts[parts.length - 1]);

    if (validCategories.includes(lastWord) && parts.length >= 3) {
      category = lastWord;
      amount = parseFloat(parts[parts.length - 2]);
      desc = parts.slice(0, -2).join(' ');
    } else {
      amount = parseFloat(parts[parts.length - 1]);
      desc = parts.slice(0, -1).join(' ');
    }

    if (isNaN(amount) || amount <= 0) {
      await sendTelegram(chatId, '❌ No entendí el monto. Ejemplo válido:\n`Cafe 8.50 Comida`');
      return { statusCode: 200, body: 'Monto inválido' };
    }

    // Fecha de hoy en formato YYYY-MM-DD (hora Perú)
    const today = new Date(Date.now() - 5 * 3600 * 1000).toISOString().split('T')[0];

    // Guardar en Supabase
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ desc, amount, category, date: today })
    });

    if (res.ok) {
      await sendTelegram(chatId, `✅ *Gasto registrado:*\n• ${desc}\n• Monto: *${amount.toFixed(2)}*\n• Categoría: ${category}`);
    } else {
      await sendTelegram(chatId, '❌ Error al guardar en la base de datos.');
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function sendTelegram(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
}