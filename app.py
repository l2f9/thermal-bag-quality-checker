"""
Thermal Bag Quality Checker - Flask Application
Professional courier assessment system using Google Gemini Vision AI
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from PIL import Image
import io
import base64
import json
import logging
from datetime import datetime
import config

# Initialize Flask application
app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
if not config.GEMINI_API_KEY:
    raise SystemExit(
        "GEMINI_API_KEY is not set. Copy .env.example to .env and add your key, "
        "or set the GEMINI_API_KEY environment variable."
    )
genai.configure(api_key=config.GEMINI_API_KEY)
model = genai.GenerativeModel(config.GEMINI_MODEL)

class BagEvaluator:
    """Professional thermal bag quality evaluator using AI vision"""

    def __init__(self):
        self.model = model
        self.evaluation_prompt = config.EVALUATION_CRITERIA

    def evaluate_bag(self, image_data):
        """
        Evaluate thermal bag quality from image

        Args:
            image_data: PIL Image object or image bytes

        Returns:
            dict: Evaluation results with scores and recommendations
        """
        try:
            # Convert image if needed
            if isinstance(image_data, bytes):
                image = Image.open(io.BytesIO(image_data))
            else:
                image = image_data

            # Ensure image is in RGB format
            if image.mode != 'RGB':
                image = image.convert('RGB')

            logger.info(f"Evaluating image: {image.size}, mode: {image.mode}")

            # Generate evaluation using Gemini Vision
            response = self.model.generate_content([
                self.evaluation_prompt,
                image
            ])

            # Parse response
            result = self._parse_evaluation(response.text)

            # Add metadata
            result['timestamp'] = datetime.now().isoformat()
            result['model'] = config.GEMINI_MODEL

            logger.info(f"Evaluation complete: Approved={result['approved']}, Score={result['overall_score']}")

            return result

        except Exception as e:
            logger.error(f"Evaluation error: {str(e)}")
            raise Exception(f"Failed to evaluate bag: {str(e)}")

    def _parse_evaluation(self, response_text):
        """Parse AI response into structured format"""
        try:
            # Try to extract JSON from response
            # Look for JSON block in markdown or plain text
            text = response_text.strip()

            # Remove markdown code blocks if present
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0]
            elif '```' in text:
                text = text.split('```')[1].split('```')[0]

            # Find JSON object
            start_idx = text.find('{')
            end_idx = text.rfind('}') + 1

            if start_idx != -1 and end_idx > start_idx:
                json_str = text[start_idx:end_idx]
                result = json.loads(json_str)

                # Validate required fields
                required_fields = ['approved', 'overall_score', 'category_scores', 'findings', 'recommendation']
                for field in required_fields:
                    if field not in result:
                        raise ValueError(f"Missing required field: {field}")

                # The model reports its own confidence. If it leaves it out, say so instead of inventing a number.
                if 'confidence' not in result:
                    result['confidence'] = None

                return result
            else:
                raise ValueError("No JSON object found in response")

        except Exception as e:
            logger.error(f"Failed to parse evaluation: {str(e)}")
            logger.error(f"Response text: {response_text}")

            # Return fallback response
            return {
                "approved": False,
                "overall_score": 0.0,
                "category_scores": {
                    "structural_integrity": 0.0,
                    "zipper_functionality": 0.0,
                    "cleanliness": 0.0,
                    "insulation_condition": 0.0,
                    "overall_wear": 0.0
                },
                "findings": {
                    "positive": [],
                    "concerns": ["Unable to properly analyze image"],
                    "critical_defects": ["Analysis failed - please try again"]
                },
                "recommendation": "Unable to evaluate. Please ensure image is clear and shows the bag properly.",
                "confidence": 0.0,
                "error": str(e)
            }

# Initialize evaluator
evaluator = BagEvaluator()

@app.route('/')
def index():
    """Render main application page"""
    return render_template('index.html',
                         app_name=config.APP_NAME,
                         version=config.APP_VERSION)

@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    """
    API endpoint for bag evaluation
    Accepts image upload and returns quality assessment
    """
    try:
        # Validate request
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image provided'
            }), 400

        file = request.files['image']

        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No image selected'
            }), 400

        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''

        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'
            }), 400

        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))

        # Evaluate bag
        result = evaluator.evaluate_bag(image)

        return jsonify({
            'success': True,
            'evaluation': result
        })

    except Exception as e:
        logger.error(f"API error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'app': config.APP_NAME,
        'version': config.APP_VERSION,
        'timestamp': datetime.now().isoformat()
    })

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({
        'success': False,
        'error': 'File too large. Maximum size is 16MB.'
    }), 413

@app.errorhandler(500)
def internal_error(e):
    """Handle internal server errors"""
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    logger.info(f"Starting {config.APP_NAME} v{config.APP_VERSION}")
    logger.info(f"Using model: {config.GEMINI_MODEL}")
    app.run(debug=config.DEBUG_MODE, host='127.0.0.1', port=5000)
