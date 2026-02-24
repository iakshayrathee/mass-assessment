import { TierLevel } from "@prisma/client";
import { DomainScoreInput, DomainPercentages } from "../types";

// Domain weights from FRD §7.2
const WEIGHTS = {
    reading: 0.25,
    readingComp: 0.25,
    spelling: 0.15,
    numeracy: 0.25,
    writing: 0.10,
};

/**
 * Calculate % mastery for a single domain
 */
export function calculatePercentMastery(raw: number, max: number): number {
    if (max <= 0) return 0;
    return Math.round((raw / max) * 10000) / 100; // 2 decimal places
}

/**
 * Calculate weighted average across all 5 domains
 */
export function calculateWeightedAverage(pcts: DomainPercentages): number {
    const avg =
        pcts.readingPct * WEIGHTS.reading +
        pcts.readingCompPct * WEIGHTS.readingComp +
        pcts.spellingPct * WEIGHTS.spelling +
        pcts.numeracyPct * WEIGHTS.numeracy +
        pcts.writingPct * WEIGHTS.writing;

    return Math.round(avg * 100) / 100;
}

/**
 * Deterministic tier allocation — FRD §8.2 rules
 *
 * TIER 3 (High Risk) if:
 *   - Any domain < 40%
 *   - OR 3+ domains < 70%
 *   - OR weighted average < 50%
 *
 * TIER 2 (At Risk) if:
 *   - 1–2 domains between 40–70%
 *   - OR weighted average between 50–70%
 *
 * TIER 1 (On Track) if:
 *   - All domains ≥ 70%
 */
export function allocateTier(
    pcts: DomainPercentages,
    flags: { attentionFlag: boolean; behaviouralFlag: boolean }
): TierLevel {
    const domainValues = [
        pcts.readingPct,
        pcts.readingCompPct,
        pcts.spellingPct,
        pcts.numeracyPct,
        pcts.writingPct,
    ];

    const weightedAvg = calculateWeightedAverage(pcts);

    // Count domains in risk zones
    const domainsBelow40 = domainValues.filter((v) => v < 40).length;
    const domainsBelow70 = domainValues.filter((v) => v < 70).length;
    const domainsBetween40and70 = domainValues.filter((v) => v >= 40 && v < 70).length;

    // --- TIER 3 checks ---
    if (domainsBelow40 > 0) return "TIER_3";
    if (domainsBelow70 >= 3) return "TIER_3";
    if (weightedAvg < 50) return "TIER_3";
    // Strong behavioural red flags + academic difficulties
    if (flags.behaviouralFlag && domainsBelow70 >= 2) return "TIER_3";

    // --- TIER 2 checks ---
    if (domainsBetween40and70 >= 1) return "TIER_2";
    if (weightedAvg < 70) return "TIER_2";
    if (flags.attentionFlag && domainsBelow70 >= 1) return "TIER_2";

    // --- TIER 1 ---
    return "TIER_1";
}

/**
 * Process raw score input → computed percentages + weighted avg + tier
 */
export function processScores(input: DomainScoreInput) {
    const pcts: DomainPercentages = {
        readingPct: calculatePercentMastery(input.readingRaw, input.readingMax),
        readingCompPct: calculatePercentMastery(input.readingCompRaw, input.readingCompMax),
        spellingPct: calculatePercentMastery(input.spellingRaw, input.spellingMax),
        numeracyPct: calculatePercentMastery(input.numeracyRaw, input.numeracyMax),
        writingPct: calculatePercentMastery(input.writingRaw, input.writingMax),
    };

    const weightedAverage = calculateWeightedAverage(pcts);

    const tier = allocateTier(pcts, {
        attentionFlag: input.attentionFlag ?? false,
        behaviouralFlag: input.behaviouralFlag ?? false,
    });

    return { pcts, weightedAverage, tier };
}
