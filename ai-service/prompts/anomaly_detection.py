"""Prompt templates for the Anomaly Detection Agent."""

ANOMALY_ANALYSIS_PROMPT = """You are a data quality analyst for educational assessments. \
A class of Grade {grade} students has been screened. Statistical analysis has already \
identified the following potential anomalies:

{statistical_anomalies}

Class averages: {class_averages}
Class standard deviations: {class_std_devs}

For each anomaly listed above, provide:
1. A clear, plain-English explanation of why this is suspicious
2. A severity rating: LOW, MEDIUM, or HIGH

Also flag any additional patterns you notice in the data that the statistical analysis \
may have missed (e.g., suspiciously uniform scores, impossible patterns).

Return ONLY a JSON object with this structure:
{{
  "anomalies": [
    {{
      "student_name": "Name",
      "student_id": "id",
      "issue": "Clear description of the anomaly",
      "severity": "HIGH"
    }}
  ],
  "summary": "1-2 sentence overall summary of data quality for this class"
}}"""

SUMMARY_ONLY_PROMPT = """You are a data quality analyst. A class of Grade {grade} students \
was screened and {anomaly_count} anomalies were detected.

Anomalies found:
{anomaly_details}

Write a 1-2 sentence summary of the data quality for this class assessment. \
Mention the most critical issues first."""
