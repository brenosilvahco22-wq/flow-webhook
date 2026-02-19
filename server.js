app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("HEADERS RECEBIDOS:", req.headers);

    const raw = req.body; // Buffer
    const signature = req.headers[FLOW_SIGNATURE_HEADER];

    if (!FLOW_WEBHOOK_SECRET) {
      console.log("❌ FLOW_WEBHOOK_SECRET não configurado no ENV.");
      return res.status(500).send("Webhook secret missing");
    }

    if (!signature || typeof signature !== "string") {
      console.log("🚫 Assinatura ausente:", FLOW_SIGNATURE_HEADER);
      return res.status(401).send("Missing signature");
    }

    const expected = crypto
      .createHmac("sha256", FLOW_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");

    const sigOk = timingSafeEqualHex(signature, expected);
    if (!sigOk) {
      console.log("🚫 Assinatura inválida.");
      return res.status(401).send("Invalid signature");
    }

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
      await sendDiscordMessage(`💰 PAGAMENTO CONFIRMADO\nID: ${chargeId}\nValor: ${formatBRLFromCents(cents)}`);
    } else if (type === "charge.expired") {
      await sendDiscordMessage(`⌛ PAGAMENTO EXPIRADO\nID: ${chargeId}`);
    } else {
      console.log("ℹ️ Evento não tratado:", type);
    }

    return res.status(200).send("OK");
  }
);
