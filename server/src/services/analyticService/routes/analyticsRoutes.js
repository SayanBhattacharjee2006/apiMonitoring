import {Router} from "express";
import analyticsContainer from "../Dependencies/dependencies.js";
const analyticController = analyticsContainer.controllers.analyticController;
import authenticate from "../../../shared/middlewares/authenticate.js";
const router = Router();

router.use(authenticate);

router.get("/stats", (req, res, next) => analyticController.getStats(req, res, next));
router.get("/dashboard", (req, res, next) => analyticController.getDashboard(req, res, next));

export default router