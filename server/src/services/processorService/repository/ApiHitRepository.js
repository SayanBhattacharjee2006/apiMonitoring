import { BaseRepository } from './BaseRepository.js';

export class ApiHitRepository extends BaseRepository {
    constructor({model, logger : l} = {}){
        super({logger : l});
        if(!model)throw new Error("ApiHitRepsository requires mongoose model");
        this.model = model;
    }

    /**
     * Persists a raw API hit event into MongoDB.
     * Distinguishes newly inserted documents from duplicates and validates tenant integrity.
     *
     * @param {Object} eventData
     * @returns {Promise<{ doc: Object, isDuplicate: boolean }>}
     */
    async save(eventData){
        try {
            const doc = new this.model(eventData);
            await doc.save();
            this.logger.info("API hit saved to MongoDB", { eventId: eventData.eventId });
            return { doc, isDuplicate: false };
        } catch(err){
            if(err && err?.code === 11000){
                this.logger.warn('Duplicate event ID in MongoDB, inspecting existing record', { eventId: eventData.eventId });
                const existingDoc = await this.model.findOne({ eventId: eventData.eventId }).lean();
                if (existingDoc && eventData.clientId && existingDoc.clientId) {
                    if (existingDoc.clientId.toString() !== eventData.clientId.toString()) {
                        this.logger.error("MongoDB event integrity error: cross-tenant event ID conflict", {
                            eventId: eventData.eventId,
                            incomingClientId: eventData.clientId.toString(),
                            recordedClientId: existingDoc.clientId.toString(),
                        });
                        const integrityErr = new Error(`Event integrity error: eventId '${eventData.eventId}' already exists for another client in MongoDB`);
                        integrityErr.code = "EVENT_INTEGRITY_MISMATCH";
                        throw integrityErr;
                    }
                }
                return { doc: existingDoc, isDuplicate: true };
            }
            this.logger.error('Error saving API hit:', err);
            throw err;
        }
    }

    async find(query, options = {}) {
        try{ 
            const { limit = 100,skip = 0, sort = { timestamp: -1 } } = options;
            const hits = await this.model.find(query).sort(sort).skip(skip).limit(limit).lean();
            return hits;
        } catch(err){
            this.logger.error('Error finding API hits:', err);
            throw err;
        }
    }

    async count(filters = {}){
        try{
            const count = await this.model.countDocuments(filters);
            return count;
        }catch(err){
            this.logger.error('Error counting API hits:', err);
            throw err;
        }
    }

    async deleteOldHits(cutoffDate){
        try {
            const result = await this.model.deleteMany({
                timestamp: {
                    $lt: cutoffDate
                }
            })

            this.logger.info(`Deleted ${result.deletedCount} old API hits from MongoDB`, { cutoffDate });
            return result;
        } catch(err){
            this.logger.error('Error deleting old API hits:', err);
            throw err;
        }
    }
}
