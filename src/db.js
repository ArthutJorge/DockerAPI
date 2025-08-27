import mysql from "mysql2/promise";

export async function initDatabase(config) {
  const { host, port, user, password, database } = config;

  const maxAttempts = Number(config.dbInitMaxAttempts ?? 20);
  const baseDelayMs = Number(config.dbInitBaseDelayMs ?? 500);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        multipleStatements: true,
      });

      try {
        await conn.execute(
          `CREATE DATABASE IF NOT EXISTS \`${database}\`
           CHARACTER SET utf8mb4
           COLLATE utf8mb4_0900_ai_ci;`
        );

        await conn.query(`USE \`${database}\`;`);

        await conn.execute(`
          CREATE TABLE IF NOT EXISTS Usuario (
            login CHAR(8) NOT NULL,
            password CHAR(8) NOT NULL,
            PRIMARY KEY (login)
          ) ENGINE=InnoDB;
        `);
      } finally {
        await conn.end();
      }

      const pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      return pool;
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }
      const delay = baseDelayMs * Math.min(10, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
