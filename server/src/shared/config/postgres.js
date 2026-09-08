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

    async testConnection(){
        try{
            const pool = this.getPool();
            const client = await pool.connect();
            const result = await client.query("SELECT NOW()");
            client.release();

            logger.info("Postgres connected successfully at ", result.rows[0].now);
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