/**
 * Bull Queue Setup — Redis-backed job queues for AI processing
 */

import Queue from "bull";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// ─── Queue Instances ────────────────────────────────

export const tierRationaleQueue = new Queue("tier-rationale", REDIS_URL, {
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
        timeout: 60000, // 60s per student
    },
});

export const anomalyDetectionQueue = new Queue("anomaly-detection", REDIS_URL, {
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 50,
        removeOnFail: 50,
        timeout: 120000, // 2 min per session
    },
});

export const reportGenerationQueue = new Queue("report-generation", REDIS_URL, {
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 50,
        timeout: 180000, // 3 min per session
    },
});

// ─── Clean up on shutdown ───────────────────────────

export async function closeQueues() {
    await tierRationaleQueue.close();
    await anomalyDetectionQueue.close();
    await reportGenerationQueue.close();
}
