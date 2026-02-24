"""Prompt templates for the Escalation Agent."""

REFERRAL_NOTE_PROMPT = """You are drafting a professional referral note for a student being \
escalated from Mass Assessment (screening) to the Targeted Assessment Tool (detailed diagnostic).

Write a structured, clinical referral note. Be specific about which domains are critical \
and why. Include relevant behavioural observations. The note should help the receiving \
specialist understand the student's needs quickly.

Student Profile:
- Name: {student_name}
- Grade: {grade}, Section: {section}
- DOB: {dob}
- School: {school_name}
- Student ID: {student_ref}
- Gender: {gender}
- Parent/Guardian: {parent_name}
- Contact: {contact_number}

Screening Results:
- Reading: {reading}%
- Reading Comprehension: {reading_comp}%
- Spelling: {spelling}%
- Numeracy: {numeracy}%
- Writing: {writing}%
- Weighted Average: {weighted_avg}%
- Tier Assigned: {tier}

Tier Rationale: {tier_rationale}

Behavioural Observations:
- Attention Flag: {attention_flag}
- Behavioural Flag: {behavioural_flag}

{override_section}

Critical Domains: {critical_domains}

Write the referral note in this format:

REFERRAL NOTE — Mass Assessment Screening
Date: [today] | Referred by: Mass Assessment System

Student: [name] | [grade] | DOB: [dob] | ID: [id]

SCREENING SUMMARY:
[2-3 sentences]

PRIORITY AREAS FOR TARGETED ASSESSMENT:
[numbered list of 2-4 areas]

ADDITIONAL NOTES:
[any relevant behavioural or contextual notes]"""

PRIORITY_AREAS_PROMPT = """Based on the following screening scores for a student being referred \
for targeted assessment, identify the 2-4 most critical areas that the receiving specialist \
should focus on. For each area, briefly explain why it's a priority.

Scores:
- Reading: {reading}%
- Reading Comprehension: {reading_comp}%
- Spelling: {spelling}%
- Numeracy: {numeracy}%
- Writing: {writing}%
Weighted Average: {weighted_avg}%

Return ONLY a JSON array of strings. Example:
["Numeracy — Significant difficulty at 30%; recommend full diagnostic battery",
 "Reading Comprehension — Below critical 40% threshold; assess decoding vs comprehension"]"""
