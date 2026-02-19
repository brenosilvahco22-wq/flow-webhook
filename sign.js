const crypto = require("crypto");

const secret = process.env.FLOW_WEBHOOK_SECRET;

const body = JSON.stringify({
  type: "charge.paid",
  data: { id: "PAGAMENTO_REAL", value: 15000 }
});

const signature = crypto
  .createHmac("sha256", secret)
  .update(body)
  .digest("hex");

console.log("ASSINATURA:");
console.log(signature);
console.log("\nBODY:");
console.log(body);
