import express from "express";
import authenticate from "../../../shared/middlewares/authenticate.js";
import clientDependencies from "../Dependencies/dependencies.js";

const router = express.Router();

const { clientController } = clientDependencies.controllers;

router.use(authenticate)

router.post('/admin/client/onboard', (req, res, next) => clientController.createClient(req, res, next))
router.post('/admin/client/:clientId/users', (req, res, next) => clientController.createClientUser(req, res, next))
router.post('/admin/client/:clientId/api/keys', (req, res, next) => clientController.createApiKey(req, res, next))
router.get('/admin/client/:clientId/api/keys', (req, res, next) => clientController.getClientApiKeys(req, res, next))

export default router

