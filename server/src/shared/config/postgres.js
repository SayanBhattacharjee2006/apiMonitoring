import pg from "pg";
import config from "./index.js";
import logger from "./logger.js";

const {Pool} = pg;

class PostgresConnection{
    constructor(){
        this.pool = null;
    }

    getPool(){
        if(!this.pool){
            this.pool = new Pool({
                host: config.postgres.host,
                port: config.postgres.port,
                database: config.postgres.database,
                user: config.postgres.user,
                password: config.postgres.password,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000
            })

            this.pool.on("error", err => {
                logger.error("Postgres connection error:", err);
            })

            logger.info("PG pool created");
        }
        return this.pool;
    }

    async ensureSchema(){
        try {
            await this.query(`
                CREATE TABLE IF NOT EXISTS processed_events (
                    event_id VARCHAR(255) PRIMARY KEY,
                    client_id VARCHAR(24) NOT NULL,
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_processed_events_client_id ON processed_events (client_id);
                CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events (processed_at);
            `);
        } catch(error){
            logger.error("Failed to ensure PostgreSQL schema:", error);
            throw error;
        }
    }

    async testConnection(){
        try{
            const pool = this.getPool();
            const client = await pool.connect();
            const result = await client.query("SELECT NOW()");
            client.release();

            logger.info("Postgres connected successfully at  ", result.rows[0].now);
            await this.ensureSchema();
        } catch(error){
            logger.error("Failed to connect to Postgres:", error);
            throw error;
        }
    }

    async query(text, params){
        const pool = this.getPool();
        const start = Date.now();

        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug("Executed query", { text, duration, rows: result.rowCount });
            return result;
        } catch(error){
            logger.error("Postgres query error:", error);
            throw error;
        }
    }

    async close(){
        if(this.pool){
            await this.pool.end();
            this.pool = null;
            logger.info("PG pool closed");
        }
    }
}

export default new PostgresConnection();
