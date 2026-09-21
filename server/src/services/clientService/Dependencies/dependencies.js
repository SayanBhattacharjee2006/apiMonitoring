import MongoClientRepository from "../repositories/ClientRepository.js";
import MongoApiKeyRepository from "../repositories/ApiKeyRepository.js";
import { ClientService } from "../services/clientService.js";
import { ClientController } from "../controllers/clientController.js";
import MongoUserRepository from "../../authService/repositories/UserRepository.js";
import authContainer from "../../authService/Dependencies/dependencies.js";

/**
 * Container class to initialize and manage dependencies for the client service
 * This class is responsible for creating instances of repositories, services, and controllers, and ensuring that all dependencies are properly injected. It provides a centralized location for managing the dependencies of the client service, making it easier to maintain and scale the application.
 */


class Container {
    /**
     * Initialize the container by creating instances of repositories, services, and controllers
     * @returns {Object} - An object containing the initialized repositories, services, and controllers
     */

    static init(){
        //Initialize Repositories
        const repositories = {
            authRepository : MongoUserRepository,
            clientRepository : MongoClientRepository,
            apiKeyRepository : MongoApiKeyRepository
        }

        // Initialize Services with the required dependencies
        const services = {
            clientServices : new ClientService({
                clientService: repositories.clientRepository,
                apiKeyService: repositories.apiKeyRepository,
                userService: repositories.authRepository
            })
        }
        // Initialize Controller with the required services
        const controllers = {
            clientController : new ClientController(services.clientServices, authContainer.services.authService)
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
export default initialized






