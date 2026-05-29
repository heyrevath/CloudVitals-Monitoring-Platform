import express from "express";
import { getMetrics } from "../controllers/metricsController.js";

const router = express.Router();

router.get("/", getMetrics);

export default router;
