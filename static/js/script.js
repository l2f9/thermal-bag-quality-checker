/**
 * Thermal Bag Quality Checker - Frontend Application
 * Professional courier assessment system
 */

class BagQualityChecker {
    constructor() {
        this.currentImage = null;
        this.evaluationResult = null;

        // DOM Elements
        this.elements = {
            uploadArea: document.getElementById('uploadArea'),
            imageInput: document.getElementById('imageInput'),
            selectBtn: document.getElementById('selectBtn'),
            uploadPlaceholder: document.getElementById('uploadPlaceholder'),
            imagePreview: document.getElementById('imagePreview'),
            previewImage: document.getElementById('previewImage'),
            removeBtn: document.getElementById('removeBtn'),
            evaluateBtn: document.getElementById('evaluateBtn'),

            uploadSection: document.getElementById('uploadSection'),
            loadingSection: document.getElementById('loadingSection'),
            resultsSection: document.getElementById('resultsSection'),
            errorSection: document.getElementById('errorSection'),

            progressFill: document.getElementById('progressFill'),
            errorMessage: document.getElementById('errorMessage'),
            retryBtn: document.getElementById('retryBtn'),
            evaluateAnotherBtn: document.getElementById('evaluateAnotherBtn'),
            downloadBtn: document.getElementById('downloadBtn')
        };

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Upload area click
        this.elements.uploadArea.addEventListener('click', () => {
            this.elements.imageInput.click();
        });

        // Select button
        this.elements.selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.elements.imageInput.click();
        });

        // File input change
        this.elements.imageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.uploadArea.classList.add('dragover');
        });

        this.elements.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.uploadArea.classList.remove('dragover');
        });

        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.uploadArea.classList.remove('dragover');

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Remove button
        this.elements.removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearImage();
        });

        // Evaluate button
        this.elements.evaluateBtn.addEventListener('click', () => {
            this.evaluateBag();
        });

        // Retry button
        this.elements.retryBtn.addEventListener('click', () => {
            this.showSection('upload');
        });

        // Evaluate another button
        this.elements.evaluateAnotherBtn.addEventListener('click', () => {
            this.clearImage();
            this.showSection('upload');
        });

        // Download report button
        this.elements.downloadBtn.addEventListener('click', () => {
            this.downloadReport();
        });

        // Prevent image preview from triggering file input
        this.elements.imagePreview.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    handleFileSelect(file) {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

        if (!validTypes.includes(file.type)) {
            this.showError('Invalid file type. Please select an image file (JPG, PNG, GIF, WebP, BMP).');
            return;
        }

        // Validate file size (16MB)
        if (file.size > 16 * 1024 * 1024) {
            this.showError('File too large. Maximum size is 16MB.');
            return;
        }

        // Read and display image
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImage = file;
            this.elements.previewImage.src = e.target.result;
            this.elements.uploadPlaceholder.classList.add('hidden');
            this.elements.imagePreview.classList.remove('hidden');
            this.elements.evaluateBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    clearImage() {
        this.currentImage = null;
        this.elements.imageInput.value = '';
        this.elements.previewImage.src = '';
        this.elements.uploadPlaceholder.classList.remove('hidden');
        this.elements.imagePreview.classList.add('hidden');
        this.elements.evaluateBtn.disabled = true;
    }

    async evaluateBag() {
        if (!this.currentImage) {
            this.showError('Please select an image first.');
            return;
        }

        try {
            // Show loading
            this.showSection('loading');

            // Prepare form data
            const formData = new FormData();
            formData.append('image', this.currentImage);

            // Send request
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Evaluation failed');
            }

            // Display results
            this.evaluationResult = data.evaluation;
            this.displayResults(data.evaluation);

        } catch (error) {
            console.error('Evaluation error:', error);
            this.showError(error.message || 'An error occurred during evaluation. Please try again.');
        }
    }

    displayResults(evaluation) {
        // Update status header
        const statusHeader = document.getElementById('statusHeader');
        const statusIcon = document.getElementById('statusIcon');
        const statusTitle = document.getElementById('statusTitle');
        const statusMessage = document.getElementById('statusMessage');
        const scoreBadge = document.getElementById('scoreBadge');

        const approved = evaluation.approved;
        const score = evaluation.overall_score;

        // Set status class
        statusHeader.className = 'status-header ' + (approved ? 'approved' : 'rejected');

        // Set icon
        statusIcon.innerHTML = approved ? '✓' : '✗';

        // Set title and message
        statusTitle.textContent = approved ? 'APPROVED FOR SHIFT' : 'NOT APPROVED';
        statusMessage.textContent = approved
            ? 'Thermal bag meets quality standards for courier operations'
            : 'Thermal bag does not meet minimum quality requirements';

        // Set score badge
        scoreBadge.textContent = score.toFixed(1) + '/10';
        scoreBadge.style.color = this.getScoreColor(score);

        // Display category scores
        this.displayCategoryScores(evaluation.category_scores);

        // Display findings
        this.displayFindings(evaluation.findings);

        // Display recommendation
        document.getElementById('recommendationText').textContent = evaluation.recommendation;

        // Display metadata
        const confidence = evaluation.confidence == null ? 'not reported' : `${(evaluation.confidence * 100).toFixed(0)}%`;
        document.getElementById('confidence').innerHTML = `<strong>Confidence:</strong> ${confidence}`;

        const timestamp = new Date(evaluation.timestamp).toLocaleString();
        document.getElementById('timestamp').innerHTML = `<strong>Evaluated:</strong> ${timestamp}`;

        document.getElementById('modelInfo').innerHTML = `<strong>Model:</strong> ${evaluation.model || 'Gemini AI'}`;

        // Show results section
        this.showSection('results');
    }

    displayCategoryScores(scores) {
        const scoresGrid = document.getElementById('scoresGrid');
        scoresGrid.innerHTML = '';

        const categories = {
            'structural_integrity': 'Structural Integrity',
            'zipper_functionality': 'Zipper Functionality',
            'cleanliness': 'Cleanliness & Hygiene',
            'insulation_condition': 'Insulation Condition',
            'overall_wear': 'Overall Wear & Tear'
        };

        for (const [key, label] of Object.entries(categories)) {
            const score = scores[key] || 0;
            const scoreClass = this.getScoreClass(score);
            const scoreColor = this.getScoreColor(score);

            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            scoreItem.innerHTML = `
                <div class="score-item-header">
                    <h4>${label}</h4>
                    <span class="score-value" style="color: ${scoreColor}">${score.toFixed(1)}</span>
                </div>
                <div class="score-bar">
                    <div class="score-bar-fill ${scoreClass}" style="width: ${score * 10}%"></div>
                </div>
            `;
            scoresGrid.appendChild(scoreItem);
        }
    }

    displayFindings(findings) {
        // Positive findings
        const positiveList = document.getElementById('positiveFindings');
        positiveList.innerHTML = '';

        if (findings.positive && findings.positive.length > 0) {
            findings.positive.forEach(finding => {
                const li = document.createElement('li');
                li.textContent = finding;
                positiveList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No significant positive findings noted';
            li.style.fontStyle = 'italic';
            positiveList.appendChild(li);
        }

        // Concerns
        const concernsList = document.getElementById('concernsFindings');
        concernsList.innerHTML = '';

        if (findings.concerns && findings.concerns.length > 0) {
            findings.concerns.forEach(concern => {
                const li = document.createElement('li');
                li.textContent = concern;
                concernsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No concerns identified';
            li.style.fontStyle = 'italic';
            concernsList.appendChild(li);
        }

        // Critical defects
        const criticalSection = document.getElementById('criticalDefects');
        const criticalList = document.getElementById('criticalList');

        if (findings.critical_defects && findings.critical_defects.length > 0) {
            criticalList.innerHTML = '';
            findings.critical_defects.forEach(defect => {
                const li = document.createElement('li');
                li.textContent = defect;
                criticalList.appendChild(li);
            });
            criticalSection.classList.remove('hidden');
        } else {
            criticalSection.classList.add('hidden');
        }
    }

    getScoreClass(score) {
        if (score >= 9.0) return 'excellent';
        if (score >= 7.0) return 'good';
        if (score >= 5.0) return 'fair';
        return 'poor';
    }

    getScoreColor(score) {
        if (score >= 9.0) return '#10b981';
        if (score >= 7.0) return '#3b82f6';
        if (score >= 5.0) return '#f59e0b';
        return '#ef4444';
    }

    showSection(section) {
        // Hide all sections
        this.elements.uploadSection.classList.add('hidden');
        this.elements.loadingSection.classList.add('hidden');
        this.elements.resultsSection.classList.add('hidden');
        this.elements.errorSection.classList.add('hidden');

        // Show requested section
        switch (section) {
            case 'upload':
                this.elements.uploadSection.classList.remove('hidden');
                break;
            case 'loading':
                this.elements.loadingSection.classList.remove('hidden');
                break;
            case 'results':
                this.elements.resultsSection.classList.remove('hidden');
                break;
            case 'error':
                this.elements.errorSection.classList.remove('hidden');
                break;
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.showSection('error');
    }

    downloadReport() {
        if (!this.evaluationResult) {
            return;
        }

        const report = this.generateTextReport(this.evaluationResult);
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `bag-quality-report-${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    generateTextReport(evaluation) {
        const timestamp = new Date(evaluation.timestamp).toLocaleString();
        const approved = evaluation.approved ? 'APPROVED' : 'NOT APPROVED';

        let report = '';
        report += '═══════════════════════════════════════════════════════════\n';
        report += '            THERMAL BAG QUALITY ASSESSMENT REPORT          \n';
        report += '═══════════════════════════════════════════════════════════\n\n';
        report += `Evaluation Date: ${timestamp}\n`;
        report += `Model: ${evaluation.model || 'Gemini AI'}\n`;
        report += `Confidence: ${evaluation.confidence == null ? 'not reported' : (evaluation.confidence * 100).toFixed(0) + '%'}\n\n`;
        report += '───────────────────────────────────────────────────────────\n';
        report += `OVERALL DECISION: ${approved}\n`;
        report += `OVERALL SCORE: ${evaluation.overall_score.toFixed(1)}/10\n`;
        report += '───────────────────────────────────────────────────────────\n\n';

        report += 'CATEGORY SCORES:\n\n';
        const categories = {
            'structural_integrity': 'Structural Integrity',
            'zipper_functionality': 'Zipper Functionality',
            'cleanliness': 'Cleanliness & Hygiene',
            'insulation_condition': 'Insulation Condition',
            'overall_wear': 'Overall Wear & Tear'
        };

        for (const [key, label] of Object.entries(categories)) {
            const score = evaluation.category_scores[key] || 0;
            report += `  • ${label}: ${score.toFixed(1)}/10\n`;
        }

        report += '\n───────────────────────────────────────────────────────────\n';
        report += 'POSITIVE FINDINGS:\n\n';

        if (evaluation.findings.positive && evaluation.findings.positive.length > 0) {
            evaluation.findings.positive.forEach(finding => {
                report += `  ✓ ${finding}\n`;
            });
        } else {
            report += '  No significant positive findings noted.\n';
        }

        report += '\n───────────────────────────────────────────────────────────\n';
        report += 'AREAS OF CONCERN:\n\n';

        if (evaluation.findings.concerns && evaluation.findings.concerns.length > 0) {
            evaluation.findings.concerns.forEach(concern => {
                report += `  ! ${concern}\n`;
            });
        } else {
            report += '  No concerns identified.\n';
        }

        if (evaluation.findings.critical_defects && evaluation.findings.critical_defects.length > 0) {
            report += '\n───────────────────────────────────────────────────────────\n';
            report += 'CRITICAL DEFECTS:\n\n';
            evaluation.findings.critical_defects.forEach(defect => {
                report += `  ✗ ${defect}\n`;
            });
        }

        report += '\n───────────────────────────────────────────────────────────\n';
        report += 'PROFESSIONAL RECOMMENDATION:\n\n';
        report += this.wrapText(evaluation.recommendation, 60);

        report += '\n\n═══════════════════════════════════════════════════════════\n';
        report += '              END OF QUALITY ASSESSMENT REPORT             \n';
        report += '═══════════════════════════════════════════════════════════\n';

        return report;
    }

    wrapText(text, maxLength) {
        const words = text.split(' ');
        let lines = [];
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + word).length > maxLength) {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine += word + ' ';
            }
        });

        if (currentLine) {
            lines.push(currentLine.trim());
        }

        return lines.map(line => '  ' + line).join('\n');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new BagQualityChecker();
    console.log('Thermal Bag Quality Checker initialized');
});
