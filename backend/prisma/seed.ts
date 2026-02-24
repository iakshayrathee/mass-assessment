/**
 * Comprehensive seed file for Mass Assessment System.
 *
 * Logins:
 *   educator@test.com   / password123  (SPECIAL_EDUCATOR)
 *   viewer@test.com     / password123  (SCHOOL_VIEWER)
 *   admin@test.com      / password123  (CENTER_ADMIN)
 *
 * Data created:
 *   - 3 Centers, 6 Schools
 *   - 3 Educators, 2 School Viewers, 2 Center Admins
 *   - 6 Screening Sessions (various grades, statuses)
 *   - 60+ Students across sessions
 *   - Scores, Tier Allocations (with rationale & interventions)
 *   - Anomaly Flags, Escalations
 *   - Assessment Questions & Student Quiz Responses
 */

import { PrismaClient, Gender, TierLevel, SessionStatus, AiStatus, AnomalySeverity, EscalationStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const PASSWORD = hash("password123");

const dob = (yearsAgo: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - yearsAgo);
    return d;
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomPct = (min: number, max: number) =>
    Math.round((min + Math.random() * (max - min)) * 10) / 10;

function determineTier(avg: number): TierLevel {
    if (avg >= 60) return TierLevel.TIER_1;
    if (avg >= 35) return TierLevel.TIER_2;
    return TierLevel.TIER_3;
}

function generateRationale(name: string, tier: TierLevel, avg: number): string {
    if (tier === TierLevel.TIER_1)
        return `${name} demonstrates strong foundational skills across all assessed domains with a weighted average of ${avg}%. Performance is consistent and meets grade-level expectations. No immediate intervention is required; continue with the current instructional approach.`;
    if (tier === TierLevel.TIER_2)
        return `${name} shows emerging skills but scored a weighted average of ${avg}%, indicating moderate risk. Specific areas of weakness were noted in one or more domains. Targeted small-group interventions are recommended to support skill development.`;
    return `${name} scored a weighted average of ${avg}%, well below grade-level benchmarks. Significant difficulties were observed across multiple domains. Immediate intensive individualized support is strongly recommended.`;
}

function generateInterventions(tier: TierLevel): string[] {
    if (tier === TierLevel.TIER_1)
        return [
            "Continue grade-level instruction with enrichment activities",
            "Monitor progress through regular classroom assessments",
            "Encourage independent reading and creative writing"
        ];
    if (tier === TierLevel.TIER_2)
        return [
            "Implement small-group reading sessions 3x per week",
            "Use phonics-based spelling intervention programme",
            "Provide manipulatives for numeracy concept building",
            "Schedule bi-weekly progress monitoring assessments"
        ];
    return [
        "Begin one-on-one intensive reading intervention daily",
        "Use multi-sensory spelling approach (visual, auditory, kinesthetic)",
        "Implement structured numeracy intervention with concrete materials",
        "Refer for comprehensive psycho-educational evaluation",
        "Coordinate with parents for home support strategies"
    ];
}

// ──────────────────────────────────────────────
// Student name pools
// ──────────────────────────────────────────────

const FIRST_NAMES_M = [
    "Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Reyansh", "Karthik",
    "Darsh", "Om", "Ishaan", "Pranav", "Rohan", "Dhruv", "Vikram",
    "Yash", "Manav", "Krish", "Rudra", "Ritvik", "Atharv", "Harsh",
    "Parth", "Shaurya", "Tanmay", "Aniket", "Sahil", "Nikhil", "Kunal",
    "Dev", "Ravi", "Suresh", "Venkat", "Akshay", "Bhavesh", "Chirag"
];
const FIRST_NAMES_F = [
    "Ananya", "Diya", "Priya", "Saanvi", "Kavya", "Isha", "Meera",
    "Riya", "Aisha", "Nandini", "Pooja", "Shruti", "Neha", "Swathi",
    "Lavanya", "Divya", "Sneha", "Tanvi", "Avni", "Kiara", "Jhanvi",
    "Simran", "Kritika", "Trisha", "Bhavna", "Gauri", "Riddhi", "Siya",
    "Tara", "Vedika", "Charvi", "Mahi", "Radhika", "Payal", "Aarohi"
];
const LAST_NAMES = [
    "Sharma", "Patel", "Reddy", "Kumar", "Singh", "Gupta", "Verma",
    "Iyer", "Nair", "Joshi", "Mehta", "Shah", "Rao", "Das", "Bhat",
    "Pillai", "Chauhan", "Pandey", "Agarwal", "Mishra", "Sinha",
    "Chopra", "Malhotra", "Kapoor", "Bansal", "Saxena", "Kulkarni"
];
const PARENT_FIRST = [
    "Rajesh", "Sunil", "Anil", "Vijay", "Amit", "Sanjay", "Ravi",
    "Deepak", "Manoj", "Prakash", "Sunita", "Rekha", "Kavita", "Meena",
    "Geeta", "Shobha", "Leela", "Usha", "Padma", "Savita"
];

let nameCounter = 0;

function makeStudent(sessionId: string, grade: string, section: string, schoolName: string, gender?: Gender) {
    nameCounter++;
    const g = gender || (Math.random() > 0.5 ? Gender.MALE : Gender.FEMALE);
    const first = g === Gender.MALE ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
    const last = pick(LAST_NAMES);
    const parentLast = last;
    const parentFirst = pick(PARENT_FIRST);
    const age = 5 + Math.floor(Math.random() * 9); // 5-13

    return {
        studentName: `${first} ${last}`,
        dateOfBirth: dob(age),
        age,
        grade,
        section,
        gender: g,
        schoolName,
        parentName: `${parentFirst} ${parentLast}`,
        contactNumber: `98${String(Math.floor(10000000 + Math.random() * 90000000))}`,
        studentRef: `STU-${String(nameCounter).padStart(4, "0")}`,
        motherTongue: pick(["Hindi", "Telugu", "Kannada", "Tamil", "Marathi", "Malayalam", "Bengali"]),
        healthNotes: Math.random() > 0.85 ? pick(["Wears glasses", "Mild hearing difficulty", "ADHD diagnosis", "Speech therapy ongoing"]) : null,
        notes: Math.random() > 0.9 ? pick(["New transfer student", "Repeated grade once", "Sibling also enrolled"]) : null,
        sessionId,
    };
}

interface ScoreData {
    readingPct: number; readingCompPct: number; spellingPct: number;
    numeracyPct: number; writingPct: number; weightedAverage: number;
    attentionFlag: boolean; behaviouralFlag: boolean;
}

type ScoreProfile = "high" | "mid" | "low" | "mixed";

function makeScores(profile: ScoreProfile): ScoreData {
    let r: number, rc: number, sp: number, n: number, w: number;
    const attn = Math.random() < 0.12;
    const behav = Math.random() < 0.08;

    switch (profile) {
        case "high":
            r = randomPct(70, 100); rc = randomPct(65, 100); sp = randomPct(70, 100);
            n = randomPct(65, 100); w = randomPct(60, 95);
            break;
        case "mid":
            r = randomPct(35, 70); rc = randomPct(30, 70); sp = randomPct(35, 70);
            n = randomPct(30, 70); w = randomPct(30, 65);
            break;
        case "low":
            r = randomPct(5, 40); rc = randomPct(5, 35); sp = randomPct(5, 40);
            n = randomPct(5, 35); w = randomPct(5, 30);
            break;
        case "mixed":
            r = randomPct(50, 90); rc = randomPct(10, 50); sp = randomPct(40, 80);
            n = randomPct(15, 55); w = randomPct(20, 60);
            break;
    }

    const avg = Math.round((r * 0.2 + rc * 0.2 + sp * 0.2 + n * 0.2 + w * 0.2) * 10) / 10;

    return {
        readingPct: r, readingCompPct: rc, spellingPct: sp,
        numeracyPct: n, writingPct: w, weightedAverage: avg,
        attentionFlag: attn, behaviouralFlag: behav,
    };
}

function rawFromPct(pct: number, max: number) {
    return Math.round((pct / 100) * max);
}

// ──────────────────────────────────────────────
// Assessment question templates
// ──────────────────────────────────────────────

const READING_WORDS = [
    "cat", "dog", "sun", "ball", "tree", "fish", "lamp", "rain", "bird", "milk",
    "elephant", "beautiful", "mountain", "chocolate", "adventure", "bicycle",
    "butterfly", "strawberry", "computer", "umbrella"
];

const SPELLING_WORDS = [
    "apple", "house", "water", "green", "happy", "school", "friend", "family",
    "garden", "animal", "because", "together", "different", "important", "wonderful",
    "scissors", "knowledge", "necessary", "restaurant", "environment"
];

const MATH_QUESTIONS = [
    "What is 3 + 4?", "What is 8 - 5?", "What is 6 × 2?", "What is 12 ÷ 3?",
    "What is 15 + 27?", "What is 50 - 18?", "What is 7 × 8?", "What is 45 ÷ 9?",
    "What is 125 + 376?", "What is 500 - 237?", "What is 24 × 6?", "What is 144 ÷ 12?",
    "What is 1/2 + 1/4?", "If a rectangle has length 8 and width 5, what is its area?",
    "What is the next number in the pattern: 2, 5, 8, 11, __?"
];

const COMPREHENSION_PASSAGE = `Ravi lived in a small village near a river. Every morning, he would walk to school along the riverbank. One day, he found a small injured bird by the path. He carefully picked it up and took it home. His mother helped him make a small nest with cotton and twigs. They fed the bird water and seeds. After a week, the bird was strong enough to fly. Ravi was sad to see it go, but happy that it was healthy again.`;

const COMP_QUESTIONS = [
    "Where did Ravi live?",
    "What did Ravi find on his way to school?",
    "How did Ravi's mother help?",
    "How long did it take for the bird to recover?",
    "How did Ravi feel when the bird flew away?"
];

const WRITING_PROMPTS = [
    "Write 3 sentences about your favourite animal.",
    "Describe what you see outside your classroom window.",
    "Write about what you did last weekend.",
    "If you could have any superpower, what would it be and why?",
    "Describe your best friend in 3-4 sentences."
];

// ──────────────────────────────────────────────
// Educator observation templates
// ──────────────────────────────────────────────
const OBSERVATIONS = [
    "Student appears to struggle with sustained attention during reading tasks. Frequently looks away from the text and loses place. Shows better engagement during hands-on numeracy activities.",
    "Noticeable difficulty with letter-sound correspondence. Tends to guess words based on first letter only. Shows strong verbal communication skills in conversation.",
    "Very quiet and withdrawn during group activities. Seems to understand concepts when explained one-on-one but freezes during independent work. May have test anxiety.",
    "Excellent participation and enthusiasm but rushes through tasks. Makes careless errors in spelling and numeracy that don't reflect actual ability. Needs strategies for self-checking.",
    "Student was observed holding the booklet very close to face — may need vision screening. Handwriting is laboured and letter formation is inconsistent.",
];

const OBSERVATION_SUGGESTIONS = [
    [
        "Use a reading tracker or ruler to help maintain place while reading",
        "Break reading passages into smaller chunks with comprehension checks",
        "Incorporate movement-based activities into literacy lessons",
        "Allow the student to stand or use a wobble cushion during reading time",
        "Pair reading with visual aids like picture cards"
    ],
    [
        "Implement systematic phonics instruction focusing on CVC words",
        "Use letter tiles for word building exercises",
        "Practice blending and segmenting with familiar words daily",
        "Create a personal word wall for frequently confused words"
    ],
    [
        "Provide assessment accommodations such as extra time and quiet space",
        "Build confidence through graduated difficulty tasks",
        "Use think-pair-share before independent work to scaffold responses",
        "Implement a buddy system for collaborative learning"
    ],
    [
        "Teach the STOP strategy: Stop, Think, Operate, Perfect",
        "Use checklists for self-monitoring before submission",
        "Provide graph paper for math to maintain column alignment",
        "Practice timed vs untimed tasks to build awareness of pacing"
    ],
    [
        "Recommend immediate vision screening referral",
        "Provide large-print materials until vision is assessed",
        "Use raised-line paper for handwriting practice",
        "Implement fine motor exercises before writing tasks",
        "Consider occupational therapy referral for handwriting support"
    ],
];

// ──────────────────────────────────────────────
// MAIN SEED
// ──────────────────────────────────────────────

async function main() {
    console.log("🌱 Seeding database...\n");

    // Wipe in dependency order
    console.log("  Clearing existing data...");
    await prisma.studentQuizResponse.deleteMany();
    await prisma.assessmentQuestion.deleteMany();
    await prisma.escalation.deleteMany();
    await prisma.anomalyFlag.deleteMany();
    await prisma.tierAllocation.deleteMany();
    await prisma.screeningScore.deleteMany();
    await prisma.screeningStudent.deleteMany();
    await prisma.screeningSession.deleteMany();
    await prisma.educatorProfile.deleteMany();
    await prisma.schoolViewerProfile.deleteMany();
    await prisma.centerAdminProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.school.deleteMany();
    await prisma.center.deleteMany();

    // ─── Centers ───────────────────────────────
    console.log("  Creating centers...");
    const center1 = await prisma.center.create({ data: { name: "Inclusive Education Resource Center — Hyderabad" } });
    const center2 = await prisma.center.create({ data: { name: "District Special Education Hub — Bangalore" } });
    const center3 = await prisma.center.create({ data: { name: "National Learning Support Center — Mumbai" } });

    // ─── Schools ───────────────────────────────
    console.log("  Creating schools...");
    const schoolData = [
        { name: "Delhi Public School — Miyapur", centerId: center1.id },
        { name: "Kendriya Vidyalaya — Secunderabad", centerId: center1.id },
        { name: "St. Mary's High School — Banjara Hills", centerId: center1.id },
        { name: "Greenwood International School", centerId: center2.id },
        { name: "Bishop Cotton Boys' School", centerId: center2.id },
        { name: "Ryan International School — Andheri", centerId: center3.id },
    ];
    const schools = [];
    for (const s of schoolData) {
        schools.push(await prisma.school.create({ data: s }));
    }

    // ─── Users ─────────────────────────────────
    console.log("  Creating users & profiles...");

    // 3 Educators
    const eduUser1 = await prisma.user.create({
        data: { email: "educator@test.com", passwordHash: PASSWORD, role: "SPECIAL_EDUCATOR" },
    });
    const eduProfile1 = await prisma.educatorProfile.create({
        data: { userId: eduUser1.id, name: "Priya Sharma", schoolId: schools[0].id, centerId: center1.id },
    });

    const eduUser2 = await prisma.user.create({
        data: { email: "educator2@test.com", passwordHash: PASSWORD, role: "SPECIAL_EDUCATOR" },
    });
    const eduProfile2 = await prisma.educatorProfile.create({
        data: { userId: eduUser2.id, name: "Anita Desai", schoolId: schools[3].id, centerId: center2.id },
    });

    const eduUser3 = await prisma.user.create({
        data: { email: "educator3@test.com", passwordHash: PASSWORD, role: "SPECIAL_EDUCATOR" },
    });
    const eduProfile3 = await prisma.educatorProfile.create({
        data: { userId: eduUser3.id, name: "Kavita Menon", schoolId: schools[5].id, centerId: center3.id },
    });

    // 2 School Viewers
    const viewerUser1 = await prisma.user.create({
        data: { email: "viewer@test.com", passwordHash: PASSWORD, role: "SCHOOL_VIEWER" },
    });
    await prisma.schoolViewerProfile.create({
        data: { userId: viewerUser1.id, name: "Rahul Verma (Principal)", schoolId: schools[0].id },
    });
    const viewerUser2 = await prisma.user.create({
        data: { email: "viewer2@test.com", passwordHash: PASSWORD, role: "SCHOOL_VIEWER" },
    });
    await prisma.schoolViewerProfile.create({
        data: { userId: viewerUser2.id, name: "Sunita Kapoor (VP)", schoolId: schools[3].id },
    });

    // 2 Center Admins
    const adminUser1 = await prisma.user.create({
        data: { email: "admin@test.com", passwordHash: PASSWORD, role: "CENTER_ADMIN" },
    });
    await prisma.centerAdminProfile.create({
        data: { userId: adminUser1.id, name: "Dr. Ramesh Iyer", centerId: center1.id },
    });
    const adminUser2 = await prisma.user.create({
        data: { email: "admin2@test.com", passwordHash: PASSWORD, role: "CENTER_ADMIN" },
    });
    await prisma.centerAdminProfile.create({
        data: { userId: adminUser2.id, name: "Dr. Meera Kulkarni", centerId: center2.id },
    });

    // ─── Sessions ──────────────────────────────
    console.log("  Creating screening sessions...");

    const sessionDefs = [
        // Educator 1 — 3 sessions
        { educatorId: eduProfile1.id, schoolId: schools[0].id, grade: "GRADE_3", section: "A", status: SessionStatus.SUBMITTED, aiStatus: AiStatus.COMPLETED, studentCount: 12, date: new Date("2026-01-15") },
        { educatorId: eduProfile1.id, schoolId: schools[0].id, grade: "GRADE_3", section: "B", status: SessionStatus.SUBMITTED, aiStatus: AiStatus.COMPLETED, studentCount: 10, date: new Date("2026-01-20") },
        { educatorId: eduProfile1.id, schoolId: schools[1].id, grade: "GRADE_5", section: "A", status: SessionStatus.REPORT_READY, aiStatus: AiStatus.COMPLETED, studentCount: 14, date: new Date("2026-02-01") },
        // Educator 2 — 2 sessions
        { educatorId: eduProfile2.id, schoolId: schools[3].id, grade: "GRADE_2", section: "A", status: SessionStatus.SUBMITTED, aiStatus: AiStatus.COMPLETED, studentCount: 11, date: new Date("2026-02-05") },
        { educatorId: eduProfile2.id, schoolId: schools[4].id, grade: "GRADE_4", section: "A", status: SessionStatus.IN_PROGRESS, aiStatus: AiStatus.PENDING, studentCount: 8, date: new Date("2026-02-18") },
        // Educator 3 — 1 session
        { educatorId: eduProfile3.id, schoolId: schools[5].id, grade: "GRADE_1", section: "A", status: SessionStatus.SUBMITTED, aiStatus: AiStatus.COMPLETED, studentCount: 10, date: new Date("2026-02-10") },
    ];

    const sessions = [];
    for (const sd of sessionDefs) {
        const sess = await prisma.screeningSession.create({
            data: {
                educatorId: sd.educatorId,
                schoolId: sd.schoolId,
                grade: sd.grade,
                section: sd.section,
                assessmentDate: sd.date,
                totalStudents: sd.studentCount,
                status: sd.status,
                aiStatus: sd.aiStatus,
                classNarrative: sd.aiStatus === AiStatus.COMPLETED
                    ? `This class of ${sd.studentCount} students in ${sd.grade.replace("_", " ")} Section ${sd.section} showed a diverse range of academic readiness. The majority of students demonstrated adequate foundational skills, but several learners require targeted interventions in reading comprehension and numeracy.`
                    : undefined,
                ...(sd.aiStatus === AiStatus.COMPLETED ? {
                    priorityActions: [
                        "Establish small-group reading intervention for Tier 2 students",
                        "Schedule parent-teacher conferences for Tier 3 students",
                        "Implement weekly progress monitoring for at-risk learners",
                        "Coordinate with school counselor for behavioural flag students"
                    ],
                } : {}),
                anomalySummary: sd.aiStatus === AiStatus.COMPLETED
                    ? "2 students flagged for score pattern anomalies requiring educator review."
                    : undefined,
            },
        });
        sessions.push({ ...sess, ...sd });
    }

    // ─── Students, Scores, Tiers ───────────────
    console.log("  Creating students, scores, and tier allocations...");

    const allStudentRecords: Array<{
        id: string; sessionIdx: number; sessionId: string; name: string;
        tier: TierLevel; scores: ScoreData;
    }> = [];

    // Score distribution per session: ~40% high, ~35% mid, ~15% low, ~10% mixed
    const profileWeights: ScoreProfile[] = [
        "high", "high", "high", "high",
        "mid", "mid", "mid",
        "low", "low",
        "mixed"
    ];

    for (let si = 0; si < sessions.length; si++) {
        const sess = sessions[si];
        const schoolObj = schools.find(s => s.id === sess.schoolId)!;
        const count = sess.studentCount;

        for (let j = 0; j < count; j++) {
            const studentData = makeStudent(sess.id, sess.grade, sess.section, schoolObj.name);
            const student = await prisma.screeningStudent.create({ data: studentData });

            // Only scored sessions get scores
            if (sess.status === SessionStatus.IN_PROGRESS && j >= count - 3) {
                // Last 3 students in IN_PROGRESS session don't have scores yet
                allStudentRecords.push({
                    id: student.id, sessionIdx: si, sessionId: sess.id,
                    name: student.studentName, tier: TierLevel.TIER_1,
                    scores: makeScores("high"),
                });
                continue;
            }

            const profile = profileWeights[j % profileWeights.length];
            const scoreData = makeScores(profile);

            const readingMax = 20, readingCompMax = 15, spellingMax = 20, numeracyMax = 20, writingMax = 10;

            await prisma.screeningScore.create({
                data: {
                    studentId: student.id,
                    readingRaw: rawFromPct(scoreData.readingPct, readingMax),
                    readingMax,
                    readingPct: scoreData.readingPct,
                    readingCompRaw: rawFromPct(scoreData.readingCompPct, readingCompMax),
                    readingCompMax,
                    readingCompPct: scoreData.readingCompPct,
                    spellingRaw: rawFromPct(scoreData.spellingPct, spellingMax),
                    spellingMax,
                    spellingPct: scoreData.spellingPct,
                    numeracyRaw: rawFromPct(scoreData.numeracyPct, numeracyMax),
                    numeracyMax,
                    numeracyPct: scoreData.numeracyPct,
                    writingRaw: rawFromPct(scoreData.writingPct, writingMax),
                    writingMax,
                    writingPct: scoreData.writingPct,
                    weightedAverage: scoreData.weightedAverage,
                    attentionFlag: scoreData.attentionFlag,
                    behaviouralFlag: scoreData.behaviouralFlag,
                },
            });

            const tier = determineTier(scoreData.weightedAverage);
            const isOverridden = Math.random() < 0.06; // ~6% overridden
            const obsIdx = Math.random() < 0.15 ? Math.floor(Math.random() * OBSERVATIONS.length) : -1;

            await prisma.tierAllocation.create({
                data: {
                    studentId: student.id,
                    tier,
                    rationale: generateRationale(student.studentName, tier, scoreData.weightedAverage),
                    interventions: generateInterventions(tier),
                    isOverridden,
                    overrideTier: isOverridden ? (tier === TierLevel.TIER_3 ? TierLevel.TIER_2 : TierLevel.TIER_1) : undefined,
                    overrideReason: isOverridden ? "Student was unwell during assessment; classroom performance is significantly better" : undefined,
                    overriddenAt: isOverridden ? new Date() : undefined,
                    overriddenByEducator: isOverridden ? "Educator" : undefined,
                    educatorObservations: obsIdx >= 0 ? OBSERVATIONS[obsIdx] : undefined,
                    ...(obsIdx >= 0 ? { observationSuggestions: OBSERVATION_SUGGESTIONS[obsIdx] } : {}),
                },
            });

            allStudentRecords.push({
                id: student.id, sessionIdx: si, sessionId: sess.id,
                name: student.studentName, tier, scores: scoreData,
            });
        }
    }

    // ─── Anomaly Flags ─────────────────────────
    console.log("  Creating anomaly flags...");

    const anomalyTemplates = [
        { issue: "Reading score significantly higher than comprehension — may indicate word-calling without understanding", severity: AnomalySeverity.MEDIUM },
        { issue: "All domain scores below 20% — verify if student understood test instructions", severity: AnomalySeverity.HIGH },
        { issue: "Numeracy score 40+ points above all literacy scores — unusual profile warrants further assessment", severity: AnomalySeverity.LOW },
        { issue: "Attention and behavioural flags both raised — consider classroom observation before next assessment", severity: AnomalySeverity.MEDIUM },
        { issue: "Perfect score in reading but 0% in writing — possible motor skills issue", severity: AnomalySeverity.HIGH },
        { issue: "Spelling above 90% with reading below 40% — inconsistent pattern, may need re-assessment", severity: AnomalySeverity.MEDIUM },
        { issue: "Student completed assessment in unusually short time — responses may not reflect true ability", severity: AnomalySeverity.HIGH },
        { issue: "Significant decline from previous assessment scores — investigate possible external factors", severity: AnomalySeverity.MEDIUM },
    ];

    // Add 2-3 anomalies per completed session
    for (const sess of sessions) {
        if (sess.aiStatus !== AiStatus.COMPLETED) continue;

        const sessStudents = allStudentRecords.filter(s => s.sessionId === sess.id);
        const anomalyCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < Math.min(anomalyCount, sessStudents.length); i++) {
            const student = sessStudents[i];
            const tmpl = anomalyTemplates[Math.floor(Math.random() * anomalyTemplates.length)];
            await prisma.anomalyFlag.create({
                data: {
                    sessionId: sess.id,
                    studentName: student.name,
                    issue: tmpl.issue,
                    severity: tmpl.severity,
                },
            });
        }
    }

    // ─── Escalations ───────────────────────────
    console.log("  Creating escalations...");

    // Escalate some Tier 3 students
    const tier3Students = allStudentRecords.filter(s => s.tier === TierLevel.TIER_3);
    const escalateCount = Math.min(6, tier3Students.length);
    for (let i = 0; i < escalateCount; i++) {
        const student = tier3Students[i];
        const sessIdx = student.sessionIdx;
        const educator = [eduUser1, eduUser2, eduUser3][Math.min(sessIdx, 2)];
        await prisma.escalation.create({
            data: {
                studentId: student.id,
                escalatedBy: educator.id,
                referralNote: `${student.name} has been referred for further assessment based on screening results indicating significant difficulties across multiple academic domains. The student scored a weighted average of ${student.scores.weightedAverage}%, placing them in Tier 3. Immediate comprehensive evaluation is recommended to determine the nature and extent of learning difficulties and to develop an appropriate Individualized Education Plan (IEP).`,
                priorityAreas: [
                    "Reading fluency and decoding skills",
                    "Mathematical reasoning and number sense",
                    "Written expression and fine motor coordination",
                    "Attention and executive function skills"
                ],
                status: i < 2 ? EscalationStatus.TRANSFERRED : EscalationStatus.PENDING,
            },
        });
    }

    // ─── Assessment Questions ──────────────────
    console.log("  Creating assessment questions...");

    // Create questions for sessions 0, 2, 3, 5 (the completed/submitted ones)
    const questionSessions = [sessions[0], sessions[2], sessions[3], sessions[5]];

    for (const sess of questionSessions) {
        let qIdx = 0;

        // Reading words (10 questions)
        const wordCount = 10;
        for (let i = 0; i < wordCount; i++) {
            await prisma.assessmentQuestion.create({
                data: {
                    sessionId: sess.id,
                    domain: "reading",
                    sectionTitle: "Section 1: Word Reading",
                    partLabel: i < 5 ? "Part A: Simple Words" : "Part B: Complex Words",
                    questionIdx: qIdx++,
                    questionText: `Read the word: ${READING_WORDS[i]}`,
                    questionType: "word_read",
                    maxScore: 1,
                    correctAnswer: READING_WORDS[i],
                },
            });
        }

        // Reading comprehension (5 questions)
        for (let i = 0; i < COMP_QUESTIONS.length; i++) {
            await prisma.assessmentQuestion.create({
                data: {
                    sessionId: sess.id,
                    domain: "readingComp",
                    sectionTitle: "Section 2: Reading Comprehension",
                    questionIdx: qIdx++,
                    questionText: COMP_QUESTIONS[i],
                    questionType: "comprehension",
                    maxScore: 1,
                    passageText: COMPREHENSION_PASSAGE,
                    instructions: "Read the passage carefully and answer the question.",
                },
            });
        }

        // Spelling (10 questions)
        const spellCount = 10;
        for (let i = 0; i < spellCount; i++) {
            await prisma.assessmentQuestion.create({
                data: {
                    sessionId: sess.id,
                    domain: "spelling",
                    sectionTitle: "Section 3: Spelling",
                    questionIdx: qIdx++,
                    questionText: `Spell the word: ${SPELLING_WORDS[i]}`,
                    questionType: "spelling",
                    maxScore: 1,
                    correctAnswer: SPELLING_WORDS[i],
                },
            });
        }

        // Numeracy (10 questions)
        const mathCount = 10;
        for (let i = 0; i < mathCount; i++) {
            await prisma.assessmentQuestion.create({
                data: {
                    sessionId: sess.id,
                    domain: "numeracy",
                    sectionTitle: "Section 4: Numeracy",
                    partLabel: i < 5 ? "Part A: Basic Operations" : "Part B: Problem Solving",
                    questionIdx: qIdx++,
                    questionText: MATH_QUESTIONS[i],
                    questionType: "math",
                    maxScore: 1,
                    correctAnswer: ["7", "3", "12", "4", "42", "32", "56", "5", "501", "263", "144", "12", "3/4", "40", "14"][i],
                },
            });
        }

        // Writing (3 questions)
        const writeCount = 3;
        for (let i = 0; i < writeCount; i++) {
            await prisma.assessmentQuestion.create({
                data: {
                    sessionId: sess.id,
                    domain: "writing",
                    sectionTitle: "Section 5: Writing",
                    questionIdx: qIdx++,
                    questionText: WRITING_PROMPTS[i],
                    questionType: "writing",
                    maxScore: 2,
                    instructions: "Write your answer in complete sentences.",
                },
            });
        }
    }

    // ─── Student Quiz Responses ────────────────
    console.log("  Creating student quiz responses...");

    // For each session with questions, add quiz responses for some students
    for (const sess of questionSessions) {
        const questions = await prisma.assessmentQuestion.findMany({
            where: { sessionId: sess.id },
            orderBy: { questionIdx: "asc" },
        });

        const sessStudents = allStudentRecords.filter(s => s.sessionId === sess.id);

        // Create responses for first 5 students in each session
        const respondents = sessStudents.slice(0, 5);

        for (const student of respondents) {
            const tier = student.tier;
            const correctProb = tier === TierLevel.TIER_1 ? 0.85 : (tier === TierLevel.TIER_2 ? 0.55 : 0.25);

            for (const q of questions) {
                const isCorrect = Math.random() < correctProb;
                let response: string;

                if (q.questionType === "word_read") {
                    response = isCorrect ? (q.correctAnswer || q.questionText.replace("Read the word: ", "")) : pick(["dob", "cet", "snu", "bul", "tre"]);
                } else if (q.questionType === "spelling") {
                    const word = q.correctAnswer || "";
                    response = isCorrect ? word : (word.length > 3 ? word.slice(0, -2) + pick(["le", "er", "ly"]) : word + "e");
                } else if (q.questionType === "math") {
                    response = isCorrect ? (q.correctAnswer || "0") : String(parseInt(q.correctAnswer || "0") + pick([-2, -1, 1, 2, 3]));
                } else if (q.questionType === "comprehension") {
                    const answers: Record<string, string[]> = {
                        "Where did Ravi live?": ["In a small village near a river", "in a village", "He lived near the river"],
                        "What did Ravi find on his way to school?": ["A small injured bird", "a bird", "He found a baby bird"],
                        "How did Ravi's mother help?": ["She helped make a nest with cotton and twigs", "made a nest", "His mother helped him"],
                        "How long did it take for the bird to recover?": ["A week", "one week", "After a week"],
                        "How did Ravi feel when the bird flew away?": ["Sad but happy it was healthy", "sad and happy", "He was sad"],
                    };
                    const opts = answers[q.questionText] || ["I don't know"];
                    response = isCorrect ? opts[0] : "The boy went to school";
                } else {
                    // Writing
                    response = isCorrect
                        ? "I like dogs because they are loyal and playful. My dog's name is Tommy. He loves to play fetch in the garden."
                        : "dog good. i like.";
                }

                await prisma.studentQuizResponse.create({
                    data: {
                        studentId: student.id,
                        questionId: q.id,
                        response,
                        isCorrect,
                        score: isCorrect ? q.maxScore : 0,
                    },
                });
            }
        }
    }

    // ─── Summary ───────────────────────────────
    const totalStudents = await prisma.screeningStudent.count();
    const totalScores = await prisma.screeningScore.count();
    const totalTiers = await prisma.tierAllocation.count();
    const totalAnomalies = await prisma.anomalyFlag.count();
    const totalEsc = await prisma.escalation.count();
    const totalQuestions = await prisma.assessmentQuestion.count();
    const totalResponses = await prisma.studentQuizResponse.count();

    console.log(`
✅ Seed complete!

╔══════════════════════════════════════════════╗
║  DATA SUMMARY                                ║
╠══════════════════════════════════════════════╣
║  Centers .............. 3                     ║
║  Schools .............. 6                     ║
║  Users ................ 9                     ║
║    Educators .......... 3                     ║
║    School Viewers ..... 2                     ║
║    Center Admins ...... 2                     ║
║  Sessions ............. ${sessions.length}                     ║
║  Students ............. ${totalStudents}                    ║
║  Scores ............... ${totalScores}                    ║
║  Tier Allocations ..... ${totalTiers}                    ║
║  Anomaly Flags ........ ${totalAnomalies}                    ║
║  Escalations .......... ${totalEsc}                     ║
║  Questions ............ ${totalQuestions}                   ║
║  Quiz Responses ....... ${totalResponses}                  ║
╠══════════════════════════════════════════════╣
║  LOGIN CREDENTIALS                           ║
╠══════════════════════════════════════════════╣
║  educator@test.com  / password123            ║
║  educator2@test.com / password123            ║
║  educator3@test.com / password123            ║
║  viewer@test.com    / password123            ║
║  viewer2@test.com   / password123            ║
║  admin@test.com     / password123            ║
║  admin2@test.com    / password123            ║
╚══════════════════════════════════════════════╝
`);
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
