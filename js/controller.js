var problemsIndex = null;
var currentProblem = null;

document.addEventListener('DOMContentLoaded', function() {
    loadProblemsIndex();
    initializeDragDivider();
    checkUrlParameter();
});

window.addEventListener('beforeunload', function() {
    saveCurrentCode();
});

/** Load the problems index file */
async function loadProblemsIndex() {
    try {
        const response = await fetch('problems/index.json');
        problemsIndex = await response.json();
    } catch (error) {
        console.error('Error loading problems index:', error);
        document.getElementById('problem-display').innerHTML =
            '<p style="color: #721c24;">Error loading problems. Please check that problems/index.json exists.</p>';
    }
}

/** Check URL parameters and load problem if specified */
function checkUrlParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const problemFile = urlParams.get('problem');
    
    if (problemFile) {
        loadSelectedProblem(problemFile);
    }
}

/** Load the selected problem */
async function loadSelectedProblem(selectedFile) {
    saveCurrentCode();
    
    if (!selectedFile) {
        document.getElementById('problem-display').innerHTML = '<p>Select a problem from the index page to get started.</p>';
        updateUrlParameter('');
        return;
    }
    
    updateUrlParameter(selectedFile);
    
    try {
        const response = await fetch(`problems/${selectedFile}`);
        currentProblem = await response.json();
        displayProblem(currentProblem);
        
        if (typeof editor !== 'undefined') {
            const savedCode = loadCodeForProblem(currentProblem.id);
            
            if (savedCode) {
                editor.setValue(savedCode);
            } else if (currentProblem.starterCode) {
                editor.setValue(currentProblem.starterCode);
            } else {
                editor.setValue('');
            }
        }
    } catch (error) {
        console.error('Error loading problem:', error);
        document.getElementById('problem-display').innerHTML = 
            '<p style="color: #721c24;">Error loading problem file.</p>';
    }
}

/** Display the problem in the left panel */
function displayProblem(problem) {
    const displayDiv = document.getElementById('problem-display');
    
    let html = `
        <h2>
            ${escapeHtml(problem.title)}
            <span class="difficulty ${problem.difficulty}">${problem.difficulty.toUpperCase()}</span>
        </h2>
    `;
    
    if (problem.description) {
        html += parseMarkdown(problem.description);
    }
    
    if (problem.examples && problem.examples.length > 0) {
        html += '<h3>Examples</h3>';
        problem.examples.forEach((example, index) => {
            html += `
                <div class="example-box">
                    <strong>Example ${index + 1}:</strong><br>
                    <code>Input: ${escapeHtml(example.input)}</code><br>
                    <code>Output: ${escapeHtml(example.output)}</code>
                    ${example.explanation ? `<br><em>${parseMarkdown(example.explanation)}</em>` : ''}
                </div>
            `;
        });
    }

    const isCompleted = getCompletionStatus(problem.id);
    const statusText = isCompleted ? 'Complete' : 'Incomplete';
    html += `<p><strong>Status:</strong> ${statusText}</p>`;

    displayDiv.innerHTML = html;
}

/** Initialize the draggable divider */
function initializeDragDivider() {
    const divider = document.getElementById('divider');
    const leftPanel = document.querySelector('.left-panel');
    const container = document.querySelector('.split-container');
    
    let isDragging = false;
    
    divider.addEventListener('mousedown', function(e) {
        isDragging = true;
        divider.classList.add('dragging');
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const containerRect = container.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        
        const minWidth = 250;
        const maxWidth = containerRect.width - 300;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            leftPanel.style.width = newWidth + 'px';
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            divider.classList.remove('dragging');
        }
    });
}

/** Escape HTML to avoid XSS */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Parse markdown text */
function parseMarkdown(text) {
    if (typeof text !== 'string') return text;
    if (typeof marked === 'undefined') {
        return escapeHtml(text).replace(/\n/g, '<br>');
    }
    return marked.parse(text, { breaks: true, gfm: true });
}

/** Get completion status from localStorage */
function getCompletionStatus(problemId) {
    const key = `problem_${problemId}_completed`;
    return localStorage.getItem(key) === 'true';
}

/** Save code for a specific problem to localStorage */
function saveCodeForProblem(problemId, code) {
    const key = `problem_${problemId}_code`;
    localStorage.setItem(key, code);
}

/** Load saved code for a specific problem from localStorage */
function loadCodeForProblem(problemId) {
    const key = `problem_${problemId}_code`;
    return localStorage.getItem(key);
}

/** Save current editor code before switching problems */
function saveCurrentCode() {
    if (typeof currentProblem !== 'undefined' && currentProblem && currentProblem.id && typeof editor !== 'undefined') {
        const currentCode = editor.getValue();
        saveCodeForProblem(currentProblem.id, currentCode);
    }
}

/** Update URL parameter without reloading page */
function updateUrlParameter(problemFile) {
    const url = new URL(window.location);
    if (problemFile) {
        url.searchParams.set('problem', problemFile);
    } else {
        url.searchParams.delete('problem');
    }
    window.history.replaceState({}, '', url);
}

window.displayProblem = displayProblem;
window.saveCurrentCode = saveCurrentCode;