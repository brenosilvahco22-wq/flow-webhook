const express = require("express");
const app = express();

app.use(express.json());

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1472646584083812615/scg8vvhhSj0M-6ck7rfcarmoJMKtrryGJ3zltpWsnyGhKDG_fRN7W4vCrSYYTXyZkvQI";

async function sendDiscordMessage(text) {
    await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text })
    });
}

app.post("/webhook", async (req, res) => {
    const event = req.body;
    console.log("Evento recebido:", event);

    if (event.type === "charge.paid") {
        await sendDiscordMessage(`💰 PAGAMENTO CONFIRMADO\nID: ${event.data.id}\nValor: R$ ${(event.data.value/100).toFixed(2)}`);
    }

    if (event.type === "charge.expired") {
        await sendDiscordMessage(`⌛ PAGAMENTO EXPIRADO\nID: ${event.data.id}`);
    }

    res.sendStatus(200);
});

app.get("/", (req,res)=>res.send("online"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
