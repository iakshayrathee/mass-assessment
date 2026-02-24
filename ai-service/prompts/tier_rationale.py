"""Prompt templates for the Tier Rationale Agent."""

RATIONALE_PROMPT = """You are an educational assessment specialist. A student has been assessed \
across 5 academic domains in a mass screening. Based on the scores below, explain in 2-3 clear, \
professional sentences why this student has been placed in {tier}.
Write for a Special Educator audience. Be specific about which scores triggered the tier placement. \
Do not use jargon. Do not repeat the raw numbers — interpret them.

Student: {student_name}, Grade {grade}
Domain Scores:
- Reading: {reading}%
- Reading Comprehension: {reading_comp}%
- Spelling: {spelling}%
- Numeracy: {numeracy}%
- Writing: {writing}%
Weighted Average: {weighted_avg}%
Tier Assigned: {tier}
Behavioural Flags: {flags}

Weak domains identified: {weak_domains}
Tier trigger rules: {trigger_rules}

Write the rationale:"""

INTERVENTIONS_PROMPT = """You are an educational intervention specialist. Based on the student's \
screening results below, suggest 3-5 specific, practical classroom interventions that can be \
implemented immediately by a special educator.

Each suggestion should be:
- Actionable (something the educator can do tomorrow)
- Specific to the student's weak domains
- Appropriate for Grade {grade}

Student: {student_name}, Grade {grade}
Tier: {tier}
Weak Domains: {weak_domains}
Domain Scores:
- Reading: {reading}%
- Reading Comprehension: {reading_comp}%
- Spelling: {spelling}%
- Numeracy: {numeracy}%
- Writing: {writing}%

Return ONLY a JSON array of strings, each being one intervention suggestion. Example:
["Intervention 1", "Intervention 2", "Intervention 3"]"""

OBSERVATION_SUGGESTIONS_PROMPT = """You are an experienced special education consultant. A special educator has observed \
a student during a mass screening assessment and recorded their observations below. Based on these observations \
combined with the student's assessment scores, suggest 3-5 specific, practical strategies that the educator can \
implement immediately.

Each suggestion should be:
- Directly informed by the educator's observations (not just the scores)
- Actionable (something the educator can do in the next class session)
- Specific to the student's observed behaviours and needs
- Appropriate for Grade {grade}

Student: {student_name}, Grade {grade}
Tier: {tier}
Domain Scores:
- Reading: {reading}%
- Reading Comprehension: {reading_comp}%
- Spelling: {spelling}%
- Numeracy: {numeracy}%
- Writing: {writing}%
Weighted Average: {weighted_avg}%

Educator's Observations:
{observations}

Return ONLY a JSON array of strings, each being one actionable suggestion based on these observations. Example:
["Suggestion 1", "Suggestion 2", "Suggestion 3"]"""
