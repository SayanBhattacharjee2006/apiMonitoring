
import MongoUserRepository from "../repositories/UserRepository.js";
import {AuthController} from "../controllers/authController.js";
import {AuthService} from "../services/authService.js";

/**
 * Dependency Injection Container for the Auth module.
 * This container initializes and manages the dependencies for the Auth module,
 * including repositories, services, and controllers.
 */

class container {
    static init() {
        // initialize repositories
        const repositories = {
            userRepository : MongoUserRepository
        }
        
        // initialize services with their respective repositories
        const services = {
            authService : new AuthService(repositories.userRepository)
        }
        // initialize controllers with their respective services
        const controllers = {
            authController : new AuthController(services.authService)
        }

        return {
            repositories,
            services,
            controllers
        }

    }
}

const initalized = container.init();
export {container}
export default initalized