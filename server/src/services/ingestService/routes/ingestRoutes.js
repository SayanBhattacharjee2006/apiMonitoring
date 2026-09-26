import express from "express";
import IngestContainer from "../Dependencies/dependencies.js";
import validateApiKey from "../../../shared/middlewares/validateApiKey.js";
import rateLimit from "express-rate-limit";
import config from "../../../shared/config/index.js";

const {ingestController} = IngestContainer
const router  = express.Router();

const ingestRateLimit = rateLimit({
    windowMs : config.rateLimiter.windowMs,
    limit : config.rateLimiter.maxRequests,
    message : {
        success: false,
        message : 'Too many requests, try again later',
        statusCode : 429
    },
    standardHeaders : true,
    legacyHeaders : false,
})

router.post("/", validateApiKey,ingestRateLimit, (req, res, next) => ingestController.ingestHit(req,res, next));


export default router;
