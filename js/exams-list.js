(function() {
    document.addEventListener('DOMContentLoaded', function() {
        loadExams();
    });

    function getExamStatus(examId) {
        const completed = localStorage.getItem(`exam_${examId}_completed`) === 'true';
        const score = localStorage.getItem(`exam_${examId}_score`);
        return {
            completed,
            score: score !== null ? parseInt(score, 10) : null
        };
    }

    async function loadExams() {
        const container = document.getElementById('exams-grid');
        
        try {
            const response = await fetch('exams/index.json');
            const data = await response.json();
            
            container.innerHTML = '';
            
            // Store exams at their original index to preserve order
            const exams = new Array(data.exams.length);
            
            // Fire all requests in parallel, render in order as each completes
            data.exams.forEach((filename, index) => {
                fetch(`exams/${filename}`)
                    .then(res => res.json())
                    .then(examData => {
                        const status = getExamStatus(examData.id);
                        exams[index] = { 
                            ...examData, 
                            file: filename,
                            completed: status.completed,
                            score: status.score
                        };
                        // Re-render all loaded exams in original order
                        container.innerHTML = exams
                            .filter(e => e)
                            .map(e => createExamCard(e))
                            .join('');
                    })
                    .catch(err => console.error(`Error loading ${filename}:`, err));
            });
        } catch (error) {
            console.error('Error loading exams:', error);
            container.innerHTML =
                '<div class="empty-state"><h3>Error loading exams</h3><p>Please check that exams/index.json exists.</p></div>';
        }
    }

    function createExamCard(exam) {
        const completedClass = exam.completed ? 'completed' : '';
        const totalPoints = exam.totalPoints || 0;
        const percentage = exam.completed && totalPoints > 0 
            ? Math.round((exam.score / totalPoints) * 100) 
            : 0;
        
        const statusBadge = exam.completed 
            ? `<span class="exam-status-badge">${exam.score}/${totalPoints} · ${percentage}%</span>`
            : '';
        
        return `
            <a href="/exam.html?exam=${exam.file}" class="exam-card ${completedClass}">
                <div class="exam-card-header">
                    <h3 class="exam-card-title">${exam.title}</h3>
                    ${statusBadge}
                </div>
                <div class="exam-card-description">
                    ${exam.description || 'No description available'}
                </div>
                <div class="exam-card-meta">
                    <div class="exam-meta-item">
                        <span class="exam-meta-label">Duration</span>
                        <span class="exam-meta-value">${exam.time || 'N/A'}</span>
                    </div>
                    <div class="exam-meta-item">
                        <span class="exam-meta-label">Total Points</span>
                        <span class="exam-meta-value">${exam.totalPoints || 'N/A'}</span>
                    </div>
                </div>
            </a>
        `;
    }
})();