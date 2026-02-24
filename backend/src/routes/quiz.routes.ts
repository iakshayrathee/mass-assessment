/**
 * Quiz Routes — public (no auth required).
 * Students access these endpoints via shared quiz links.
 */

import { Router } from "express";
import { quizController } from "../controllers/quiz.controller";

const router = Router();

// Public — no authentication required for students

// Get quiz questions (grouped by section)
router.get("/:sessionId", quizController.getQuiz);

// Register student to take the quiz
router.post("/:sessionId/register", quizController.registerStudent);

// Submit quiz answers
router.post("/:sessionId/submit", quizController.submitQuiz);

// Get student results
router.get("/:sessionId/results/:studentId", quizController.getResults);

export default router;
