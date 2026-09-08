import mongoose from "mongoose";

/**
 * MongoDB schema for raw API hits
 * Stores every individual API calls
 */

const apiHitSchema = new mongoose.Schema(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        timestamp: {
            type: Date,
            required: true,
        },
        serviceName: {
            type: String,
            required: true,
            index: true,
        },
        endpoint: {
            type: String,
            required: true,
            index: true,
        },
        method: {
            type: String,
            required: true,
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        },
        statusCode: {
            type: Number,
            required: true,
            index: true,
        },
        latencyMs: {
            type: Number,
            required: true,
        },
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
            index: true,
        },
        apiKeyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ApiKey",
            required: true,
            index: true,
        },
        ip: {
            type: String,
            required: true,
        },
        userAgent: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
        collection: "api_hits",
    },
);

// create compund indexes for common queries
apiHitSchema.index({
    clientId: 1,
    serviceName: 1,
    endpoint: 1,
    timestamp: -1,
});

apiHitSchema.index({
    clientId: 1,
    timestamp: -1,
    statusCode: 1,
});

apiHitSchema.index({
    apiKeyId: 1,
    timestamp: -1,
});

apiKeySchema.index(
    {
        timestamp: 1,
    },
    {
        expireAfterSeconds: 2592000,
    },
);

const ApiHits = mongoose.model("ApiHits", apiHitSchema);

export default ApiHits;
