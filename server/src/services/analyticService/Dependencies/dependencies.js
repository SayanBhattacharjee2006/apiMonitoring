import clientRepository from "../../../services/clientService/repositories/ClientRepository.js";
import processorContainer from "../../../services/processorService/Dependencies/dependencies.js";
import authContainer from "../../authService/Dependencies/dependencies.js";

import { AnalyticService } from "../services/analyticService.js";
import { AnalyticsController } from "../controller/analyticsController.js";


/**
 * Container initializer for the Analytics module.
 * Provides consistent access to repositories, services, and controllers.
 */


class Container {
    static init(){
        const repositories = {
            clientRepository,
            metricsRepository:
                processorContainer.repositories.metricsRepository,
        };

        const analyticService = new AnalyticService({
            metricRepo: repositories.metricsRepository,
        });
        
        const services = {
            analyticService,
            authService: authContainer.services && authContainer.services.authService,
        }

        const analyticController = new AnalyticsController({
            analyticService: analyticService,
            authService: services.authService,
            clientRepository: repositories.clientRepository
        })

        const controllers = {
            analyticController
        }

        return {
            repositories,
            services,
            controllers
        }
    }
}


const initialized = Container.init();
export {Container}
export default initialized;
