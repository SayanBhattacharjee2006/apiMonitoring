import { EventEmitter } from "node:events";

/**
 * Manages a single RabbitMQ confirm channel, ensuring it is recreated if it closes or encounters an error.
 * Provides a getChannel() method that returns a promise which resolves to a ready-to-use confirm channel.
 * If the channel is currently being established, additional calls to getChannel() will wait for the same channel to be ready.
 * Emits 'drain' event when the channel's write buffer is drained, and 'error' event if the channel encounters an error.
 */

export class ConfirmChannelManager extends EventEmitter {
    /**
     *
     * @param {{ rabbitmq: any, logger?: any }} param0 - Configuration object containing the RabbitMQ connection manager and an optional logger.
     * @throws Will throw an error if the rabbitmq connection manager is not provided.
     */

    constructor({ rabbitmq, logger }) {
        super(); // Initialize the parent class (EventEmitter)

        if (!rabbitmq)
            throw new Error(
                "Confirm Channel Manager requires rabbitmq connection manager",
            );

        this._rabbitmq = rabbitmq;
        this._logger = logger ?? console;
        this._channel = null;
        this._isConnecting = false;
        this._connectWaiters = [];
    }

    /**
     * Returns a promise that resolves to a RabbitMQ confirm channel. If the channel is already established, it returns it immediately.
     * If the channel is in the process of being established, it waits for that process to complete and then returns the channel.
     * If no channel exists and one is not currently being established, it initiates the creation of a new confirm channel.
     * @returns {Promise<any>} A promise that resolves to a RabbitMQ confirm channel.
     * @throws Will throw an error if the channel cannot be established after retrying.
     */

    getChannel() {
        if (this._channel) return this._channel;
        if (this._isConnecting) {
            return new Promise((resolve, reject) =>
                this._connectWaiters.push({ resolve, reject }),
            );
        }

        return this._connect();
    }


     /**
     * Establishes a new RabbitMQ confirm channel. If a channel is already being established, it waits for that process to complete. 
     * If the channel is successfully established, it resolves any pending promises waiting for the channel. If an error occurs during channel creation, it rejects any pending promises and throws the error.
     * @returns {Promise<any>} A promise that resolves to a RabbitMQ confirm channel.
     * @throws Will throw an error if the channel cannot be established.
     */

     async _connect(){
        this._isConnecting = true;

        try{

            let connection;

            if(this._rabbitmq.connection){
                connection = this._rabbitmq.connection;
            }else {
                await this._rabbitmq.connect();

                if(!this._rabbitmq.connection){
                    throw new Error("failed to obtain rabbitmq connection");
                }

                connection = this._rabbitmq.connection;
            }

            const confirmChannel = await connection.createConfirmChannel();

            confirmChannel.on("drain", () => {
                this.emit("drain");
            })

            confirmChannel.on("close", () => {
                this._logger.warn('[ChannelManager] confirm channel closed unexpectedly');
                this._channel = null;
            })
            
            confirmChannel.on("error", (err) => {
                this._logger.error('[ChannelManager] confirm channel error', {
                    error: err.message,
                    stack: err.stack,
                    code: err.code,
                });
                this._channel = null;
                this.emit('error',err);
            })


            this._channel = confirmChannel;
            this._logger.info('[ChannelManager] confirm channel ready');

            this._connectWaiters.forEach(({resolve}) => resolve(this._channel));
            this._connectWaiters = [];

            return this._channel;

        } catch (error) {
            this._connectWaiters.forEach(({reject}) => reject(error));
            this._connectWaiters = []
            this._logger.error("Failed to connect to RabbitMQ:", error);
            throw error;
        } finally {
            this._isConnecting = false;
        }
     }
}
