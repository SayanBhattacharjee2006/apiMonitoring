import amqp from "amqplib";
import config from "./index.js";
import logger from "./logger.js";

class RabbitMQConnection {
    constructor(){
        this.connection = null;
        this.channel = null;
        this.isConnecting = false;
    }

    async connect() {
        if(this.channel){
            return this.channel;
        }

        if(this.isConnecting){
            await new Promise((resolve) => {
                const checkInterval = setInterval(()=>{
                    if(!this.isConnecting){
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100)
            })

            return this.channel;
        }
            
        try {
            this.isConnecting = true;
            logger.info("Connecting to RabbitMQ at", config.rabbitMQ.url);
            this.connection = await amqp.connect(config.rabbitMQ.url);
            this.channel = await this.connection.createChannel();

            const dlqName = `${config.rabbitMQ.queue}.dlq`;

            // DL queue
            await this.channel.assertQueue(dlqName, { durable: true });

            // Normal Queue
            await this.channel.assertQueue(config.rabbitMQ.queue, { 
                durable: true,
                arguments: {
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": dlqName
                }
            });

            logger.info("RabbitMQ connected successfully at", config.rabbitMQ.url);

            this.connection.on("error", (error) => {
                this.connection = null;
                this.channel = null;
                logger.error("RabbitMQ connection error:", error);
            });

            this.connection.on("close", () => {
                this.channel = null;
                this.connection = null;
                logger.info("RabbitMQ connection closed");
            });

            this.isConnecting = false;
            return this.channel;

        } catch(error){
            this.isConnecting = false;
            logger.error("Failed to connect to RabbitMQ:", error);
            throw error;
        }
        
    }

    getChannel(){
        if(!this.connection || !this.channel)return "disconnected";
        if(this.connection.closing)return "closing";
        return "connected";
    }

    async close() {
        if(this.connection){
            await this.channel.close();
            this.channel = null;
        }

        if(this.connection){
            await this.connection.close();
            this.connection = null;
        }

        logger.info("RabbitMQ connection closed");
    } catch (error) {
        logger.error("Failed to close RabbitMQ connection:", error);
    }
}


export default new RabbitMQConnection();