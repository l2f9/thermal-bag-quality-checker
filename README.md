# Thermal Bag Quality Checker

A small Flask web app that uses Google Gemini vision to decide, from a single photo, whether a courier's insulated delivery bag is fit for a shift.

> Built as a take-home technical assessment for a hiring process. It is a working prototype, not a production system, and its scores have not been validated against labelled data (see [Limitations](#limitations)).

## What it does

1. You upload a photo of a thermal bag (PNG, JPG, GIF, BMP or WebP, up to 16 MB).
2. The server sends the image to Gemini together with an engineered prompt that defines the inspection rubric.
3. Gemini returns a JSON verdict. The server extracts it, checks that the required fields are present, and falls back to a safe "could not evaluate" result if the reply cannot be parsed.
4. The page shows an overall score, five category scores, findings, a recommendation, and a downloadable text report.

## The rubric

The rubric lives in the prompt (`EVALUATION_CRITERIA` in `config.py`). Scores are on a 0 to 10 scale.

| Criterion | Weight |
|---|---|
| Structural integrity (tears, holes, shape, seams, handles) | 30% |
| Zipper functionality | 25% |
| Cleanliness and hygiene | 20% |
| Insulation condition | 15% |
| Overall wear | 10% |

Scoring bands: 9.0 to 10 excellent, 7.0 to 8.9 good (acceptable for shifts), 5.0 to 6.9 fair, below 5.0 not acceptable. Certain critical defects (tears or holes that compromise insulation, a broken zipper, exposed insulation, heavy contamination) are an automatic fail.

## Setup

Requires Python 3.9 or newer and a Gemini API key (create one in [Google AI Studio](https://aistudio.google.com)).

```bash
pip install -r requirements.txt
cp .env.example .env        # then put your key in .env (or set GEMINI_API_KEY in your shell)
python app.py
```

Open http://127.0.0.1:5000. The app refuses to start if no key is set. The server listens on localhost only.

## API

| Endpoint | Description |
|---|---|
| `POST /api/evaluate` | multipart form with an `image` file; returns `{ success, evaluation }` |
| `GET /api/health` | simple health check |

## Tests

```bash
python -m unittest discover -s tests
```

The tests cover the parsing and fallback logic without calling the Gemini API.

## Limitations

- **Scores are the model's judgment.** The weights and pass band are instructions in the prompt; the code does not recompute them. There is no labelled dataset behind this, so no accuracy figure is claimed.
- **Confidence is self-reported by the model.** If the model omits it, the app shows "not reported".
- The default model name (`gemini-2.0-flash-exp`) is an experimental model and may be retired; change `GEMINI_MODEL` in `config.py`.
- One image at a time, and the result depends on photo quality.

## License

MIT. See [LICENSE](LICENSE).
