const express = require("express");
const crypto = require("crypto");

const app = express();

/**
 * ENV (Railway Variables)
 */
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const FLOW_WEBHOOK_SECRET = process.env.FLOW_WEBHOOK_SECRET;
const FLOW_SIGNATURE_HEADER = (process.env.FLOW_SIGNATURE_HEADER || "x-signature").toLowerCase();

/**
 * Precisamos do RAW BODY pra assinatura bater certo.
 * Então usamos express.raw e depois fazemos JSON.parse manualmente.
 */
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const raw = req.body; // Buffer
    const signature = req.headers[FLOW_SIGNATURE_HEADER];

    // 1) Se não tem secret configurado: trava tudo (melhor falhar fechado)
    if (!FLOW_WEBHOOK_SECRET) {
      console.log("❌ FLOW_WEBHOOK_SECRET não configurado no ENV.");
      return res.status(500).send("Webhook secret missing");
    }

    // 2) Assinatura obrigatória
    if (!signature || typeof signature !== "string") {
      console.log("🚫 Assinatura ausente:", FLOW_SIGNATURE_HEADER);
      return res.status(401).send("Missing signature");
    }

    // 3) Calcula HMAC SHA256 do RAW body
    const expected = crypto
      .createHmac("sha256", FLOW_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");

    // 4) Compara de forma segura (timing-safe)
    const sigOk = timingSafeEqualHex(signature, expected);
    if (!sigOk) {
      console.log("🚫 Assinatura inválida.");
      return res.status(401).send("Invalid signature");
    }

    // 5) Parseia o JSON só depois de validar assinatura
    let event;
    try {
      event = JSON.parse(raw.toString("utf8"));
    } catch (e) {
      console.log("❌ JSON inválido:", e.message);
      return res.status(400).send("Invalid JSON");
    }

    const type = event?.type;
    const chargeId = event?.data?.id || event?.charge?.id || event?.id || "SEM-ID";
    const cents = event?.data?.value ?? event?.charge?.value ?? event?.data?.amount ?? event?.amount;

    if (type === "charge.paid") {
      await sendDiscordMessage(
        `💰 PAGAMENTO CONFIRMADO\nID: ${chargeId}\nValor: ${formatBRLFromCents(cents)}`
      );
    } else if (type === "charge.expired") {
      await sendDiscordMessage(`⌛ PAGAMENTO EXPIRADO\nID: ${chargeId}`);
    } else {
      console.log("ℹ️ Evento não tratado:", type);
    }

    return res.status(200).send("OK");
  }
);

app.get("/", (req, res) => res.send("online"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));

/**
 * Helpers
 */

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

function timingSafeEqualHex(a, b) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
