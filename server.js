const express = require("express");
const app = express();

app.use(express.json());

// rota webhook da Flow
app.post("/webhook", (req, res) => {

    const event = req.body;
    console.log("Evento recebido:", event);

    if (event.type === "charge.paid") {
        console.log("PAGAMENTO CONFIRMADO:", event.data.id);
    }

    if (event.type === "charge.expired") {
        console.log("COBRANÇA EXPIRADA:", event.data.id);
    }

    res.sendStatus(200);
});

// rota só pra teste
app.get("/", (req,res)=>res.send("online"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));