"""
Configuration file for Thermal Bag Quality Checker
Professional courier assessment system
"""

# Gemini API Configuration
import os

try:  # optional: load a local .env file if python-dotenv is installed
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

# The key is read from the environment so it never ends up in the repository.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.0-flash-exp"

# Application Configuration
APP_NAME = "Thermal Bag Quality Checker"
APP_VERSION = "1.0.0"
DEBUG_MODE = False

# Evaluation Thresholds
MINIMUM_PASS_SCORE = 7.0  # Out of 10
CONFIDENCE_THRESHOLD = 0.7

# Evaluation Criteria Weights
CRITERIA_WEIGHTS = {
    "structural_integrity": 0.30,  # Tears, holes, shape
    "zipper_functionality": 0.25,   # Zipper condition
    "cleanliness": 0.20,            # Stains, dirt
    "insulation_condition": 0.15,   # Foam, lining
    "overall_wear": 0.10            # General wear and tear
}

# Quality Standards
EVALUATION_CRITERIA = """
Evaluate this thermal delivery bag for courier shift readiness using professional standards:

CRITICAL DEFECTS (Automatic Fail):
- Any tears or holes compromising insulation
- Broken, missing, or non-functional zippers
- Severe structural damage preventing proper closure
- Exposed or damaged insulation material
- Heavy contamination or unhygienic conditions

QUALITY ASSESSMENT CRITERIA:
1. STRUCTURAL INTEGRITY (30%)
   - No tears, rips, or holes in exterior/interior
   - Maintains proper shape and structure
   - Seams are intact and secure
   - Handles/straps are functional

2. ZIPPER FUNCTIONALITY (25%)
   - All zippers operate smoothly
   - No missing teeth or separations
   - Zipper pulls are present and functional
   - Proper closure along all edges

3. CLEANLINESS & HYGIENE (20%)
   - Free from significant stains or dirt
   - No food residue or contamination
   - Acceptable level of wear marks
   - Professional appearance maintained

4. INSULATION CONDITION (15%)
   - Interior lining is intact
   - No exposed foam or insulation
   - Thermal properties maintained
   - No significant degradation

5. OVERALL WEAR & TEAR (10%)
   - Age-appropriate condition
   - Minor scuffs acceptable
   - Logo/branding visible (if applicable)
   - Professional presentation

SCORING GUIDE:
9.0-10.0 = Excellent - Like new condition
7.0-8.9  = Good - Acceptable for shifts
5.0-6.9  = Fair - Needs monitoring/replacement soon
0.0-4.9  = Poor - Not acceptable for shifts

Provide your assessment in the following JSON format:
{
    "approved": boolean,
    "overall_score": float (0-10),
    "category_scores": {
        "structural_integrity": float (0-10),
        "zipper_functionality": float (0-10),
        "cleanliness": float (0-10),
        "insulation_condition": float (0-10),
        "overall_wear": float (0-10)
    },
    "findings": {
        "positive": [list of good conditions],
        "concerns": [list of issues found],
        "critical_defects": [list of disqualifying issues if any]
    },
    "recommendation": "string (clear decision with reasoning)",
    "confidence": float (0-1)
}
"""
