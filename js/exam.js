(function() {
    // State
    let examData = null;
    let questionCount = 0;
    let userAnswers = {};
    let codeEditors = {};
    let pendingEditorInits = [];

    // Initialize
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        const examFile = new URLSearchParams(window.location.search).get('exam');
        if (!examFile) {
            showError('No exam specified');
            return;
        }

        try {
            const response = await fetch(`exams/${examFile}`);
            if (!response.ok) throw new Error('Failed to fetch exam');
            examData = await response.json();
            renderExam();
            loadSavedAnswers();
            initPendingEditors();
        } catch (error) {
            console.error('Error loading exam:', error);
            showError('Failed to load exam');
        }
    }

    function showError(message) {
        document.getElementById('exam-content').innerHTML = 
            `<div class="empty-state"><h3>Error</h3><p>${message}</p></div>`;
    }

    // DOM Helpers
    function el(tag, className, attrs = {}) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'text') element.textContent = value;
            else if (key === 'html') element.innerHTML = value;
            else if (key.startsWith('data-')) element.setAttribute(key, value);
            else element[key] = value;
        });
        return element;
    }

    // Rendering
    function renderExam() {
        document.getElementById('exam-title').textContent = examData.title;
        document.getElementById('exam-time').textContent = examData.time || 'N/A';
        document.getElementById('exam-points').textContent = examData.totalPoints || 'N/A';
        document.title = `${examData.title} - Racket Prep`;
        
        const descEl = document.getElementById('exam-description');
        if (examData.description) {
            descEl.innerHTML = renderMarkdown(examData.description);
            typesetMath([descEl]);
        } else {
            descEl.textContent = '';
        }
        
        const container = document.getElementById('exam-content');
        container.innerHTML = '';
        questionCount = 0;
        pendingEditorInits = [];
        
        examData.content.forEach(item => container.appendChild(renderContentItem(item)));
        
        // Add finish section
        const actions = el('div', 'exam-actions', {
            html: `
                <div class="exam-progress">
                    <span id="answered-count">0</span> / <span id="total-questions">${questionCount}</span> answered
                </div>
                <button id="finish-btn" class="finish-btn header-link" disabled>Finish Exam</button>
            `
        });
        container.appendChild(actions);
        
        document.getElementById('finish-btn').addEventListener('click', finishExam);
        updateAnsweredCount();
    }

    function renderContentItem(item) {
        switch(item.type) {
            case 'text': return renderText(item);
            case 'code': return renderCodeBlock(item);
            case 'section': return renderSection(item);
            case 'question': return renderQuestion(item);
            default: return el('div');
        }
    }

    function renderText(item) {
        if (!item.content) return el('div');
        const container = el('div', 'exam-text-content', { html: renderMarkdown(item.content) });
        typesetMath([container]);
        return container;
    }

    function renderCodeBlock(item) {
        if (!item.content) return el('div');
        
        const container = el('div', 'exam-code-block');
        if (item.title) {
            container.appendChild(el('div', 'code-block-title', { text: item.title }));
        }
        
        const pre = el('pre');
        const code = el('code', item.language ? `language-${item.language}` : '', { text: item.content });
        pre.appendChild(code);
        container.appendChild(pre);
        return container;
    }

    function renderSection(item) {
        const container = el('div', 'exam-section');
        const header = el('div', 'section-header');
        
        header.appendChild(el('h3', 'section-title', { text: item.title }));
        
        if (item.description) {
            const desc = el('div', 'section-description', { html: renderMarkdown(item.description) });
            header.appendChild(desc);
            typesetMath([desc]);
        }
        
        container.appendChild(header);
        
        if (item.content) {
            item.content.forEach(subItem => container.appendChild(renderContentItem(subItem)));
        }
        return container;
    }

    function renderQuestion(item) {
        questionCount++;
        const qId = questionCount;
        const points = item.points || 1;
        
        const container = el('div', 'exam-question');
        container.dataset.questionId = qId;
        
        // Question prompt with points
        const inline = el('div', 'question-inline');
        inline.appendChild(el('span', 'question-prompt', { html: renderMarkdownInline(item.content) }));
        inline.appendChild(el('span', 'question-points', { text: ` (${points} ${points === 1 ? 'point' : 'points'})` }));
        container.appendChild(inline);
        
        // Input type
        if (item.prompt === 'single-line-textbox') {
            container.appendChild(createTextInput(qId, item));
        } else if (item.prompt === 'code') {
            container.appendChild(createCodeEditor(qId, item));
        }
        
        return container;
    }

    function createTextInput(qId, item) {
        const input = el('input', 'question-input', {
            type: 'text',
            placeholder: 'Enter your answer...'
        });
        input.dataset.questionId = qId;
        input.dataset.verification = item.verification || '';
        input.dataset.points = item.points || 1;
        
        input.addEventListener('input', () => {
            userAnswers[qId] = {
                answer: input.value.trim(),
                verification: input.dataset.verification,
                maxPoints: parseInt(input.dataset.points) || 1
            };
            saveAnswers();
        });
        
        input.addEventListener('blur', updateAnsweredCount);
        
        // Lambda shortcut (Ctrl+\)
        input.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === '\\') {
                e.preventDefault();
                const { selectionStart: start, selectionEnd: end, value } = input;
                input.value = value.substring(0, start) + 'λ' + value.substring(end);
                input.selectionStart = input.selectionEnd = start + 1;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        
        const wrapper = el('div', 'question-input-container');
        wrapper.appendChild(input);
        return wrapper;
    }

    function createCodeEditor(qId, item) {
        const questionItem = {
            starterCode: item.starterCode || '',
            hiddenCases: item.hiddenCases || [],
            points: item.points || 1,
            precode: item.precode || ''
        };
        
        const wrapper = el('div', 'question-code-container');
        const textarea = el('textarea', 'question-code-editor');
        textarea.dataset.questionId = qId;
        wrapper.appendChild(textarea);
        
        // Queue editor initialization for after DOM is ready
        pendingEditorInits.push({ qId, textarea, questionItem });
        
        return wrapper;
    }

    function initPendingEditors() {
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
            pendingEditorInits.forEach(({ qId, textarea, questionItem }) => {
                const saved = userAnswers[qId];
                const initialCode = saved?.code || questionItem.starterCode;
                textarea.value = initialCode;
                
                const editor = createRacketEditor(textarea, {
                    height: '200px',
                    onSave: (cm) => handleCodeChange(qId, cm.getValue(), questionItem)
                });
                
                codeEditors[qId] = editor;
                handleCodeChange(qId, initialCode, questionItem);
            });
            pendingEditorInits = [];
        });
    }

    function handleCodeChange(qId, code, item) {
        userAnswers[qId] = {
            code,
            starterCode: item.starterCode || '',
            hiddenCases: item.hiddenCases || [],
            precode: item.precode || '',
            maxPoints: parseInt(item.points) || 1,
            type: 'code'
        };
        saveAnswers();
    }

    // Persistence
    function saveAnswers() {
        if (!examData) return;
        localStorage.setItem(`exam_${examData.id}_answers`, JSON.stringify(userAnswers));
    }

    function loadSavedAnswers() {
        if (!examData) return;
        
        const saved = localStorage.getItem(`exam_${examData.id}_answers`);
        if (!saved) return;
        
        try {
            const savedAnswers = JSON.parse(saved);
            userAnswers = {};
            
            Object.entries(savedAnswers).forEach(([qId, answer]) => {
                if (parseInt(qId) <= questionCount) {
                    userAnswers[qId] = answer;
                    
                    if (answer.type !== 'code') {
                        const input = document.querySelector(`input[data-question-id="${qId}"]`);
                        if (input && answer.answer) input.value = answer.answer;
                    }
                }
            });
            
            updateAnsweredCount();
        } catch (error) {
            console.error('Error loading saved answers:', error);
        }
    }

    function updateAnsweredCount() {
        const count = Object.entries(userAnswers)
            .filter(([qId, ans]) => {
                if (parseInt(qId) > questionCount) return false;
                return ans.type === 'code' 
                    ? ans.code?.trim() !== ''
                    : ans.answer !== '';
            }).length;
        
        const countEl = document.getElementById('answered-count');
        const finishBtn = document.getElementById('finish-btn');
        
        if (countEl) countEl.textContent = count;
        if (finishBtn) finishBtn.disabled = count < questionCount;
    }

    // Grading
    async function finishExam() {
        const finishBtn = document.getElementById('finish-btn');
        if (finishBtn.dataset.grading === 'true') return;
        
        finishBtn.disabled = true;
        finishBtn.dataset.grading = 'true';
        finishBtn.textContent = 'Grading...';
        
        try {
            await gradeAllAnswers();
            
            const { totalScore, correctCount } = Object.values(userAnswers).reduce(
                (acc, ans) => ({
                    totalScore: acc.totalScore + (ans.points || 0),
                    correctCount: acc.correctCount + (ans.points > 0 ? 1 : 0)
                }),
                { totalScore: 0, correctCount: 0 }
            );
            
            const totalPoints = examData.totalPoints || 0;
            const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
            
            localStorage.setItem(`exam_${examData.id}_completed`, 'true');
            localStorage.setItem(`exam_${examData.id}_score`, totalScore);
            
            showFeedbackPage(totalScore, totalPoints, percentage, correctCount);
        } catch (error) {
            console.error('Error grading exam:', error);
            alert('An error occurred while grading. Please try again.');
            finishBtn.disabled = false;
            finishBtn.dataset.grading = 'false';
            finishBtn.textContent = 'Finish Exam';
        }
    }

    async function gradeAllAnswers() {
        for (const [qId, answer] of Object.entries(userAnswers)) {
            if (answer.type === 'code') {
                const result = await runCodeTests(answer);
                Object.assign(userAnswers[qId], {
                    points: result.points,
                    testResults: result.results,
                    passedTests: result.passed,
                    totalTests: result.total
                });
            } else {
                userAnswers[qId].points = gradeTextAnswer(qId, answer);
            }
        }
    }

    function gradeTextAnswer(qId, answer) {
        const input = document.querySelector(`input[data-question-id="${qId}"]`);
        if (!input?.dataset.verification || !answer.answer) return 0;
        
        try {
            const verifyFunc = new Function(input.dataset.verification + ' return t;');
            return verifyFunc()(answer.answer);
        } catch {
            return 0;
        }
    }

    function runCodeTests(answer) {
        const { code, hiddenCases = [], maxPoints = 1, precode = '' } = answer;
        const total = hiddenCases.length;
        
        const fail = (error) => ({
            points: 0,
            passed: 0,
            total,
            results: hiddenCases.map(() => ({ passed: false, error }))
        });
        
        if (total === 0) return Promise.resolve({ points: 0, passed: 0, total: 0, results: [] });
        
        const trimmed = code.trim();
        if (!trimmed || trimmed.endsWith('...') || trimmed.endsWith('...)')) {
            return Promise.resolve(fail('Incomplete code'));
        }
        
        return new Promise((resolve) => {
            // Safety timeout for infinite loops
            const timeout = setTimeout(() => resolve(fail('Execution timed out')), 10000);
            
            try {
                const interpreter = new BiwaScheme.Interpreter((e) => {
                    clearTimeout(timeout);
                    resolve(fail('Code error: ' + (e?.message || e || 'Unknown error')));
                });
                
                if (typeof loadRacketCompat !== 'function') {
                    clearTimeout(timeout);
                    return resolve(fail('Test infrastructure not available'));
                }
                
                loadRacketCompat(interpreter);
                interpreter.evaluate('(reset-test-results)');
                
                // Preprocess and evaluate precode
                if (precode.trim()) {
                    interpreter.evaluate(preprocessCode(precode, interpreter));
                }
                
                // Preprocess and evaluate user code
                try {
                    interpreter.evaluate(preprocessCode(code, interpreter));
                } catch {
                    clearTimeout(timeout);
                    return resolve(fail('Syntax error in code'));
                }
                
                // Run tests synchronously
                hiddenCases.forEach(testCase => {
                    try {
                        interpreter.evaluate(testCase);
                    } catch { /* test failed */ }
                });
                
                // Get results
                let passed = 0, failed = 0;
                try {
                    failed = interpreter.evaluate('check-expect-failed') || 0;
                    passed = interpreter.evaluate('check-expect-passed') || 0;
                } catch { /* use defaults */ }
                
                clearTimeout(timeout);
                resolve({
                    points: (failed === 0 && passed === total) ? maxPoints : 0,
                    passed,
                    total,
                    results: hiddenCases.map((_, i) => ({ passed: i < passed }))
                });
                
            } catch (error) {
                clearTimeout(timeout);
                resolve(fail('Execution error'));
            }
        });
    }

    function preprocessCode(code, interpreter) {
        let processed = code;
        if (typeof preprocessMatch === 'function') processed = preprocessMatch(processed);
        if (typeof preprocessLocal === 'function') processed = preprocessLocal(processed);
        if (typeof preprocessDefineStruct === 'function') processed = preprocessDefineStruct(processed, interpreter);
        return processed.replaceAll('λ', 'lambda ');
    }

    // Feedback Page
    function showFeedbackPage(score, totalPoints, percentage, correctCount) {
        const container = document.getElementById('exam-content');
        container.innerHTML = '';
        
        const gradeClass = percentage >= 90 ? 'grade-a' : 
                          percentage >= 80 ? 'grade-b' : 
                          percentage >= 70 ? 'grade-c' : 
                          percentage >= 60 ? 'grade-d' : 'grade-f';
        
        const header = el('div', 'feedback-header', {
            html: `
                <h2>Exam Complete!</h2>
                <div class="final-grade ${gradeClass}">
                    <div class="grade-score">${score} / ${totalPoints}</div>
                    <div class="grade-percentage">${percentage}%</div>
                </div>
                <div class="grade-summary">
                    You answered ${correctCount} out of ${questionCount} questions correctly.
                </div>
            `
        });
        container.appendChild(header);
        
        let qNum = 0;
        examData.content.forEach(item => {
            const feedback = renderFeedbackItem(item, qNum);
            if (feedback) {
                container.appendChild(feedback);
                if (item.type === 'question') qNum++;
                else if (item.type === 'section' && item.content) {
                    qNum += item.content.filter(i => i.type === 'question').length;
                }
            }
        });
        
        const actions = el('div', 'exam-actions', {
            html: `
                <button class="header-link" onclick="location.reload()">Edit</button>
                <a href="/index.html" class="header-link">Home</a>
            `
        });
        container.appendChild(actions);
        
        window.scrollTo(0, 0);
    }

    function renderFeedbackItem(item, startNum) {
        if (item.type === 'question') {
            return renderFeedbackQuestion(item, startNum + 1);
        }
        
        if (item.type === 'section') {
            const container = el('div', 'exam-section');
            const header = el('div', 'section-header');
            header.appendChild(el('h3', 'section-title', { text: item.title }));
            
            if (item.description) {
                const desc = el('div', 'section-description', { html: renderMarkdown(item.description) });
                header.appendChild(desc);
                typesetMath([desc]);
            }
            
            container.appendChild(header);
            
            if (item.content) {
                let qNum = startNum;
                item.content.forEach(sub => {
                    if (sub.type === 'question') {
                        qNum++;
                        container.appendChild(renderFeedbackQuestion(sub, qNum));
                    }
                });
            }
            
            return container;
        }
        
        return null;
    }

    function renderFeedbackQuestion(item, qNum) {
        const answer = userAnswers[qNum];
        const isCorrect = answer?.points > 0;
        const points = item.points || 1;
        
        const container = el('div', `feedback-question ${isCorrect ? 'correct' : 'incorrect'}`);
        
        container.appendChild(el('div', 'feedback-question-header', {
            html: `
                <div class="feedback-question-title">
                    <span class="question-prompt">${renderMarkdownInline(item.content)}</span>
                    <span class="question-points">(${points} ${points === 1 ? 'point' : 'points'})</span>
                </div>
                <div class="feedback-status ${isCorrect ? 'status-correct' : 'status-incorrect'}">
                    ${isCorrect ? 'Correct' : 'Incorrect'}
                </div>
            `
        }));
        
        if (answer?.type === 'code') {
            container.appendChild(el('div', 'user-answer', {
                html: `<strong>Your code:</strong><pre><code class="language-scheme">${escapeHtml(answer.code || '(no code submitted)')}</code></pre>`
            }));
            
            if (answer.testResults) {
                container.appendChild(el('div', 'test-results', {
                    html: `<strong>Test Results:</strong> ${answer.passedTests || 0} / ${answer.totalTests || 0} tests passed`
                }));
            }
        } else {
            container.appendChild(el('div', 'user-answer', {
                html: `<strong>Your answer:</strong> <code>${answer?.answer || '(no answer)'}</code>`
            }));
        }
        
        if (item.explanation) {
            const explanation = el('div', 'answer-explanation', {
                html: `<strong>Explanation: </strong><span>${renderMarkdown(item.explanation)}</span>`
            });
            container.appendChild(explanation);
            typesetMath([explanation]);
        }
        
        return container;
    }

    // Utilities
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderMarkdown(text) {
        const mathExpressions = [];
        let processed = text;
        
        // Protect LaTeX from markdown parser
        processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
            mathExpressions.push(match);
            return `DISPLAYMATH${mathExpressions.length - 1}PLACEHOLDER`;
        });
        processed = processed.replace(/\$([^\$\n]+?)\$/g, (match) => {
            mathExpressions.push(match);
            return `INLINEMATH${mathExpressions.length - 1}PLACEHOLDER`;
        });
        
        marked.setOptions({ breaks: true, gfm: true, mangle: false, headerIds: false });
        let html = marked.parse(processed);
        
        // Restore math
        mathExpressions.forEach((expr, i) => {
            html = html.replace(`DISPLAYMATH${i}PLACEHOLDER`, expr);
            html = html.replace(`INLINEMATH${i}PLACEHOLDER`, expr);
        });
        
        return html;
    }

    function renderMarkdownInline(text) {
        return marked.parseInline(text);
    }

    function typesetMath(elements) {
        if (window.MathJax?.typesetPromise) {
            window.MathJax.typesetPromise(elements).catch(() => {});
        }
    }
})();