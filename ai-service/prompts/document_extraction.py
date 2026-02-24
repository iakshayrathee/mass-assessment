"""Prompts for document extraction agent."""

ASSESSMENT_EXTRACTION_PROMPT = """You are an assessment document parser. Analyze this screening booklet and extract its structure.

The document is a mass screening assessment booklet used by special educators.
Extract ALL sections, their sub-parts, maximum marks, and questions/content.

Map each section to one of these standard domains:
- reading (word reading, letter recognition, reading fluency)
- readingComp (passage comprehension, comprehension questions)
- spelling (dictation, spelling tests)
- numeracy (math computation, word problems, number recognition)
- writing (written expression, sentence formation, handwriting)
- attention (observation checklist, behavioural observation - NOT scored, just flagged)

DOCUMENT TEXT:
{document_text}

Respond in EXACTLY this JSON format, nothing else:
{{
  "title": "Assessment booklet title",
  "grade": "The grade level (e.g. '3', 'K', '5')",
  "totalMaxScore": 70,
  "sections": [
    {{
      "sectionNumber": 1,
      "sectionTitle": "READING ASSESSMENT",
      "domain": "reading",
      "parts": [
        {{
          "partLabel": "Part A",
          "partTitle": "Word Reading",
          "maxScore": 20,
          "instructions": "Please read these words aloud",
          "questionCount": 20,
          "questions": ["plant", "window", "basket"]
        }}
      ]
    }},
    {{
      "sectionNumber": 1,
      "sectionTitle": "READING ASSESSMENT",
      "domain": "readingComp",
      "parts": [
        {{
          "partLabel": "Part B",
          "partTitle": "Passage Reading",
          "maxScore": 10,
          "instructions": "Read the passage aloud",
          "questionCount": 3,
          "questions": ["Why did Riya wake up early?"],
          "passageText": "Riya woke up early..."
        }}
      ]
    }}
  ],
  "domainMaxScores": {{
    "reading": 20,
    "readingComp": 10,
    "spelling": 10,
    "numeracy": 20,
    "writing": 10
  }},
  "hasAttentionObservation": true,
  "attentionBehaviours": ["Easily distracted", "Leaves seat"],
  "riskGuideline": {{
    "lowRisk": "55-70",
    "moderateRisk": "40-54",
    "highRisk": "Below 40"
  }}
}}

IMPORTANT:
- If a section contains BOTH word reading AND comprehension, split them into separate domain entries
- "readingComp" is specifically for COMPREHENSION questions (not word reading)
- Dictation maps to "spelling", NOT "writing"
- Written Expression maps to "writing"
- Math (computation + word problems) maps to "numeracy"
- The domainMaxScores should sum up the max scores for each domain across all parts
- Extract actual question content where visible in the document
"""
