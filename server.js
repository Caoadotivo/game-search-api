// server.js
const express = require("express");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require("cors");


const app = express();
app.use(express.json());
app.use(cors()); // libera CORS pro frontend

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

let TOKEN = "";
let TOKEN_EXPIRES = 0;

// Função para obter token da IGDB
async function getToken() {
  const now = Date.now();
  if (TOKEN && now < TOKEN_EXPIRES) return TOKEN;

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );
  const data = await res.json();
  TOKEN = data.access_token;
  TOKEN_EXPIRES = now + data.expires_in * 1000 - 60000; // renova 1min antes
  return TOKEN;
}

// Rota de pesquisa de jogos
app.post("/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query vazia" });

  try {
    const token = await getToken();
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: `search "${query}"; fields name,rating,cover.image_id; limit 20;`,
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
});

// Rota de detalhes do jogo
app.post("/details", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "ID inválido" });

  try {
    const token = await getToken();
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: `fields name,summary,rating,first_release_date,platforms.name,screenshots.image_id,cover.image_id; where id=${id};`,
    });
    const data = await response.json();
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar detalhes" });
  }

});

    app.get("/popular", async (req, res) => {
      try {
        const token = await getToken();

        const response = await fetch("https://api.igdb.com/v4/games", {
          method: "POST",
          headers: {
            "Client-ID": CLIENT_ID,
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/plain",
          },
          body: `
            fields name, rating, cover.image_id;
            sort rating desc;
            where rating != null;
            limit 20;
          `,
        });

        const data = await response.json();
        res.json(data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar populares" });
      }
    });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Rodando"));

app.get("/", (req, res) => {
  res.send("API rodando 🚀");
});
