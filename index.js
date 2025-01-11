const express = require("express");
const Botly = require("botly");
const https = require("https");
const axios = require("axios");

const app = express();

const botly = new Botly({
  accessToken: process.env.PAGE_ACCESS_TOKEN,
  verifyToken: process.env.VERIFY_TOKEN,
  webHookPath: process.env.WB_PATH,
  notificationType: Botly.CONST.REGULAR,
  FB_URL: "https://graph.facebook.com/v13.0/"
});

function keepAppRunning() {
  setInterval(() => {
    https.get(`${process.env.RENDER_EXTERNAL_URL}/ping`, (resp) => {
      if (resp.statusCode === 200) {
        console.log("Ping successful");
      } else {
        console.error("Ping failed");
      }
    });
  }, 5 * 60 * 1000);
}

app.get("/", (_req, res) => res.sendStatus(200));
app.get("/ping", (_req, res) => res.status(200).json({ message: "Ping successful" }));

app.use(express.json({ verify: botly.getVerifySignature(process.env.APP_SECRET) }));
app.use(express.urlencoded({ extended: false }));

app.use("/webhook", botly.router());

async function chatWithGPT(messages) {
  const tokenList = require("./apikey.json")[0].token;
  const apiKey = tokenList[Math.floor(Math.random() * tokenList.length)];

  const options = {
    method: "POST",
    url: "https://chatgpt-vision1.p.rapidapi.com/",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "chatgpt-vision1.p.rapidapi.com",
    },
    data: { messages },
  };

  try {
    const response = await axios.request(options);
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error in chatWithGPT:", error);
    return "عذرًا، حدث خطأ أثناء المعالجة.";
  }
}

botly.on("message", async (senderId, message, data) => {
  let userMessage = "";

  if (message.message.text) {
    userMessage = message.message.text;
  } else if (message.message.attachments?.[0]?.type) {
    userMessage = `تلقيت ملف من النوع: ${message.message.attachments[0].type}`;
  } else {
    userMessage = "رسالة غير معروفة.";
  }

  const gptMessages = [
    { role: "system", content: "أنت مساعد ذكي يساعد المستخدمين باللغة العربية." },
    { role: "user", content: userMessage },
  ];

  const gptResponse = await chatWithGPT(gptMessages);

  botly.sendText({ id: senderId, text: gptResponse });
});

app.listen(process.env.PORT, () => {
  console.log(`App is running on port ${process.env.PORT}`);
  keepAppRunning();
});
