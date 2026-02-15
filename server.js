const express = require("express");
const app = express();

// Node 18+ tem fetch nativo (Node 24 ok). Se der ruim, instala node-fetch.
// npm i node-fetch
// e descomenta:
// const fetch = require("node-fetch");

// Lê JSON normal (sem assinatura por enquanto)
app.use(express.json());

// ⚠️ Nunca deixe webhook fixo no código. Use ENV no Railway.
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// util: tenta achar um valor dentro de vários caminhos possíveis
function pick(obj, paths) {
  for (const p of paths) {
    const parts = p.split(".");
    let cur = obj;
    let ok = true;
    for (const k of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, k)) cur = cur[k];
      else {
        ok = false;
        break;
      }
    }
    if (ok && cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

// util: valor em centavos -> "R$ 150,00"
function formatBRLFromCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "R$ (não informado)";
  return `R$ ${(n / 100).toFixed(2).replace(".", ",")}`;
}

async function sendDiscordMessage(text) {
  if (!DISCORD_WEBHOOK) {
    console.log("⚠️ DISCORD_WEBHOOK não configurado (env). Mensagem:", text);
    return;
  }

  const r = await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  });

  if (!r.ok) {
    const body = await r.text().catch(() => "");
    console.log("❌ Erro ao enviar pro Discord:", r.status, body);
  }
}

app.post("/webhook", async (req, res) => {
  const event = req.body;

  // DEBUG PRA VOCÊ DESCOBRIR O HEADER DE ASSINATURA:
  // (depois você me manda o print dos headers que eu te digo qual é)
  console.log("========== WEBHOOK RECEBIDO ==========");
  console.log("HEADERS:", req.headers);
  console.log("BODY:", event);
  console.log("======================================");

  const type = event?.type;

  // tenta achar id/value em formatos diferentes
  const chargeId =
    pick(event, ["data.id", "charge.id", "data.chargeId", "id"]) || "SEM-ID";

  const cents =
    pick(event, ["data.value", "charge.value", "data.amount", "amount"]) ??
    undefined;

  if (type === "charge.paid") {
    await sendDiscordMessage(
      `💰 PAGAMENTO CONFIRMADO\nID: ${chargeId}\nValor: ${formatBRLFromCents(
        cents
      )}`
    );
  } else if (type === "charge.expired") {
    await sendDiscordMessage(`⌛ PAGAMENTO EXPIRADO\nID: ${chargeId}`);
  } else {
    // opcional: logar eventos que você ainda não trata
    console.log("ℹ️ Evento não tratado:", type);
  }

  res.sendStatus(200);
});

// rota pra teste
app.get("/", (req, res) => res.send("online"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
