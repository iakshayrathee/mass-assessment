"""Prompt templates for the Report Generation Agent."""

CLASS_NARRATIVE_PROMPT = """You are an educational report writer. Generate a 3-4 paragraph class \
assessment narrative report based on the following data.

Write for a Special Educator audience. Be professional but clear. Include specific numbers \
and percentages. Highlight both strengths and areas of concern.

School: {school_name}
Class: Grade {grade}, Section {section}
Assessment Date: {assessment_date}
Total Students: {total_students}

Tier Distribution:
- Tier 1 (On Track): {tier_1} students ({tier_1_pct}%)
- Tier 2 (At Risk): {tier_2} students ({tier_2_pct}%)
- Tier 3 (High Risk): {tier_3} students ({tier_3_pct}%)

Domain Averages:
- Reading: {reading_avg}%
- Reading Comprehension: {reading_comp_avg}%
- Spelling: {spelling_avg}%
- Numeracy: {numeracy_avg}%
- Writing: {writing_avg}%

Strongest Domain: {strongest_domain}
Weakest Domain: {weakest_domain}

Anomalies Found: {anomalies_summary}

Write the class narrative report:"""

PRIORITY_ACTIONS_PROMPT = """Based on the following class assessment data, recommend the top 3 \
most impactful actions the educator should take immediately.

Each action should be specific, actionable, and prioritised by urgency.

Tier Distribution: Tier 1: {tier_1}, Tier 2: {tier_2}, Tier 3: {tier_3}
Weakest Domain: {weakest_domain} (class average: {weakest_avg}%)
Students needing escalation: {tier_3} (Tier 3)

Return ONLY a JSON array of 3 strings, each being one priority action. Example:
["Action 1", "Action 2", "Action 3"]"""

SCHOOL_SUMMARY_PROMPT = """Write a 1-paragraph privacy-safe summary of this class assessment \
for a School Viewer (principal/administrator). Do NOT include any individual student names, \
scores, or tier labels. Only use aggregate data.

School: {school_name}
Class: Grade {grade}, Section {section}
Total Students: {total_students}
Students performing at grade level: {tier_1} ({tier_1_pct}%)
Students showing mild difficulties: {tier_2} ({tier_2_pct}%)
Students needing urgent support: {tier_3} ({tier_3_pct}%)
Weakest domain across the class: {weakest_domain}

Write the summary:"""
