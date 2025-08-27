import 'dotenv/config';
import express from 'express';
import { initDatabase } from './db.js';

function getConfigFromEnv() {
    return {
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      dbInitMaxAttempts: process.env.DB_INIT_MAX_ATTEMPTS,
      dbInitBaseDelayMs: process.env.DB_INIT_BASE_DELAY_MS,
      apiPort: Number(process.env.PORT || 4040)
    };
  }
  

(async () => {
  ['MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'].forEach((name) => {
    if (!process.env[name]) {
      process.exit(1);
    }
  });

  const config = getConfigFromEnv();
  const pool = await initDatabase(config);

  const app = express();
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.status(200).json({ mensagem: "Olá, mundo" });
  });

  // GET: verifica se usuário existe
  app.get('/login', async (req, res) => {
    const { login } = req.query || {};

    try {
      const [rows] = await pool.execute(
        'SELECT 1 FROM Usuario WHERE login = ? LIMIT 1',
        [login]
      );

      if (rows.length > 0) {
        return res.status(200).json({ existe: true, mensagem: 'Usuário já existe' });
      }

      return res.status(200).json({ existe: false, mensagem: 'Usuário não encontrado' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ erro: 'Erro interno no server' });
    }
  });

  // POST: cria usuário 
  app.post('/login', async (req, res) => {
    const { login, password } = req.body || {};

    if (typeof login !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ erro: 'login e senha devem ser strings' });
    }
    if (login.length < 1 || login.length > 8 || password.length < 1 || password.length > 8) {
      return res.status(400).json({ erro: 'login e senha devem ter 1-8 caracteres' });
    }

    try {
      const [rows] = await pool.execute(
        'SELECT 1 FROM Usuario WHERE login = ? LIMIT 1',
        [login]
      );

      if (rows.length > 0) {
        return res.status(200).json({ existe: true, mensagem: 'Usuário já existe' });
      }

      await pool.execute(
        'INSERT INTO Usuario (login, password) VALUES (?, ?)',
        [login, password]
      );

      return res.status(201).json({ existe: false, mensagem: 'Usuário criado' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ erro: 'Erro interno no server' });
    }
  });

  app.listen(config.apiPort, () => {
    console.log(`API ouvindo na porta ${config.apiPort}...`);
  });
  
})().catch((err) => {
  console.error('Erro ao iniciar o server: ', err);
  process.exit(1);
});
