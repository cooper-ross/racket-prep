(function() {
    let allProblems = [];
    let currentFilters = {
        difficulty: 'all',
        category: 'all',
        status: 'all'
    };

    document.addEventListener('DOMContentLoaded', function() {
        loadProblems();
        setupFilterListeners();
    });

    async function loadProblems() {
        try {
            const response = await fetch('problems/index.json');
            const data = await response.json();

            const problemPromises = data.problems.map(async (filename) => {
                try {
                    const problemResponse = await fetch(`problems/${filename}`);
                    const problemData = await problemResponse.json();
                    const completed = getCompletionStatus(problemData.id);
                    return { ...problemData, file: filename, completed };
                } catch (problemError) {
                    console.error(`Error loading problem ${filename}:`, problemError);
                    return null;
                }
            });

            const loadedProblems = await Promise.all(problemPromises);
            allProblems = loadedProblems.filter(p => p !== null);

            populateCategoryFilter(data.categories);
            renderProblems();
            updateStats();
        } catch (error) {
            console.error('Error loading problems:', error);
            document.getElementById('problems-list').innerHTML =
                '<div class="empty-state"><h3>Error loading problems</h3><p>Please check that problems/index.json exists.</p></div>';
        }
    }

    function getCompletionStatus(problemId) {
        const key = `problem_${problemId}_completed`;
        return localStorage.getItem(key) === 'true';
    }

    function setCompletionStatus(problemId, completed) {
        const key = `problem_${problemId}_completed`;
        localStorage.setItem(key, completed.toString());
    }

    function toggleCompletion(problemId) {
        const problem = allProblems.find(p => p.id === problemId);
        if (problem) {
            problem.completed = !problem.completed;
            setCompletionStatus(problemId, problem.completed);
            renderProblems();
            updateStats();
        }
    }

    function populateCategoryFilter(categories) {
        const select = document.getElementById('category-filter');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
            select.appendChild(option);
        });
    }

    function setupFilterListeners() {
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilters.difficulty = this.dataset.filter;
                renderProblems();
            });
        });

        document.querySelectorAll('.filter-btn[data-status]').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn[data-status]').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilters.status = this.dataset.status;
                renderProblems();
            });
        });

        document.getElementById('category-filter').addEventListener('change', function() {
            currentFilters.category = this.value;
            renderProblems();
        });
    }

    function filterProblems() {
        return allProblems.filter(problem => {
            if (currentFilters.difficulty !== 'all' && problem.difficulty !== currentFilters.difficulty) {
                return false;
            }

            if (currentFilters.category !== 'all' && problem.category !== currentFilters.category) {
                return false;
            }

            if (currentFilters.status === 'completed' && !problem.completed) {
                return false;
            }
            if (currentFilters.status === 'incomplete' && problem.completed) {
                return false;
            }

            return true;
        });
    }

    function renderProblems() {
        const container = document.getElementById('problems-list');
        const filteredProblems = filterProblems();

        if (filteredProblems.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No problems found</h3><p>Try adjusting your filters.</p></div>';
            return;
        }

        container.innerHTML = filteredProblems.map((problem, index) => createProblemCard(problem, index + 1)).join('');

        container.querySelectorAll('.toggle-complete').forEach(btn => {
            btn.addEventListener('click', function() {
                const problemId = this.dataset.problemId;
                toggleCompletion(problemId);
            });
        });
    }

    function createProblemCard(problem, count) {
        const completedClass = problem.completed ? 'completed' : '';
        const statusText = problem.completed ? 'Completed' : 'Incomplete';
        const statusClass = problem.completed ? 'completed' : 'incomplete';
        const toggleText = problem.completed ? 'Mark Incomplete' : 'Mark Complete';

        return `
            <div class="problem-card ${completedClass}">
                <div class="problem-id">#${count.toString().padStart(3, '0')}</div>
                <div class="problem-title">
                    <h3>${problem.title}</h3>
                </div>
                <div class="problem-meta">
                    <span class="problem-difficulty ${problem.difficulty}">${problem.difficulty}</span>
                    <span class="problem-category">${problem.category}</span>
                    <span class="problem-time">${problem.time}</span>
                </div>
                <div class="problem-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="problem-actions">
                    <a href="/editor.html?problem=${problem.file}" class="action-btn primary">Start</a>
                    <button class="action-btn toggle-complete" data-problem-id="${problem.id}">${toggleText}</button>
                </div>
            </div>
        `;
    }

    function updateStats() {
        const total = allProblems.length;
        const completed = allProblems.filter(p => p.completed).length;
        const remaining = total - completed;

        document.getElementById('total-problems').textContent = total;
        document.getElementById('completed-count').textContent = completed;
        document.getElementById('remaining-count').textContent = remaining;
    }

    window.toggleCompletion = toggleCompletion;
    window.renderProblems = renderProblems;
    window.updateStats = updateStats;
})();

