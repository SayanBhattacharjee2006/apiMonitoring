import logger from "../config/logger.js";

/**
 * Request logger middleware - centralizes request logging.
 */

const requestLogger  = (req, res, next) => {
    const dateStart = Date.now();

    res.on('finish',()=>{
        const dateEnd = Date.now();
        const duration = dateEnd - dateStart;
        logger.info('HTTP %s %s %s %dms', req.method, req.originalUrl || req.url, req.ip || req.socket.remoteAddress, duration, {
            method: req.method,
            path: req.originalUrl || req.url,
            status: res.statusCode,
            duration,
        });
    })

    next();
}

export default requestLogger