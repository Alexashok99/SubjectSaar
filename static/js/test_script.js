/**
 * @fileoverview TestApp Class: Core logic for handling test navigation, state, 
 * language switching, scoring, and dynamic loading of questions and config from a JSON URL.
 */
class TestApp {
    /**
     * Initializes the test state based on loaded question data, including configuration.
     * @param {Object} data - Object containing 'config' and 'questions' array.
     */
    constructor(data) {
        // --- Configuration and Question Data Assignment ---
        this.config = data.config || this.getDefaultConfig(data.questions);
        this.qs = data.questions; 
        
        // --- DYNAMICALLY SET VALUES BASED ON CONFIG AND QS LENGTH ---
        const totalQ = this.qs.length;
        const totalMarks = this.config.totalMarks;

        this.sections = null;
        this.curQ = 0;
        this.ans = new Array(totalQ).fill(null);
        this.reviewed = new Array(totalQ).fill(false);
        this.startT = Date.now();
        this.timeLeft = this.config.durationMinutes * 60; // Convert configured minutes to seconds
        this.timeSpent = new Array(totalQ).fill(0);
        this.lastQTime = Date.now();
        
        this.sub = false;
        this.eng = true; // Default language is English
        this.darkMode = false;
        this.timer = null;
        this.sectionTimer = null;
        this.currentSection = this.sections ? 0 : null;
        
        this.initEls();
        this.updateWelcomeScreenData(totalQ, totalMarks); // Pass totalQ and Marks to update UI
        this.setupWelcomeScreen();
        this.validateData();
        this.setupBeforeUnload();
    }
    
    /**
     * Provides a default configuration if the JSON data is missing a config object.
     * @param {Array} qs - Questions array.
     */
    getDefaultConfig(qs) {
        const totalQ = qs ? qs.length : 0;
        return {
            testName: 'General Mock Test',
            testId: 'DEFAULT001',
            durationMinutes: totalQ || 34, // 1 minute per question fallback
            totalMarks: totalQ || 34,
            marksPerQuestion: 1,
            negativeMarking: 0.25,
            nameDisplay: 'User'
        };
    }
    
    /**
     * Maps DOM elements to this.els for easy access.
     */
    initEls() {
        this.els = {
            qInfo: document.getElementById('qInfo'),
            progTxt: document.getElementById('progTxt'),
            ansCnt: document.getElementById('ansCnt'),
            timer: document.getElementById('timer'),
            qTxt: document.getElementById('qTxt'),
            compSec: document.getElementById('compSec'),
            compCont: document.getElementById('compCont'),
            opts: document.getElementById('opts'),
            sol: document.getElementById('sol'),
            solCont: document.getElementById('solCont'),
            solInfo: document.getElementById('solInfo'),
            qGrid: document.getElementById('qGrid'),
            desktopQGrid: document.getElementById('desktopQGrid'),
            panel: document.getElementById('panel'),
            modalOver: document.getElementById('modalOver'),
            scoreDisp: document.getElementById('scoreDisp'),
            corrStat: document.getElementById('corrStat'),
            incStat: document.getElementById('incStat'),
            unaStat: document.getElementById('unaStat'),
            timeStat: document.getElementById('timeStat'),
            printBtn: document.getElementById('printBtn'),
            desktopSidebar: document.getElementById('desktopSidebar'),
            reviewBtn: document.getElementById('reviewBtn'),
            themeToggle: document.getElementById('themeToggle'),
            // Dynamic Welcome Screen elements
            welcomeTestTitle: document.getElementById('welcomeTestTitle'),
            testIdValue: document.getElementById('testIdValue'),
            totalQuestionsValue: document.getElementById('totalQuestionsValue'),
            totalMarksValue: document.getElementById('totalMarksValue'),
            pageTitle: document.getElementById('pageTitle'),
            durationValue: document.getElementById('durationValue'),
            qTotal: document.getElementById('qTotal'),
            progTotal: document.getElementById('progTotal'),
            modalTotalMarks: document.getElementById('modalTotalMarks'),
            markingValue: document.getElementById('markingValue'),
            hdrCenter: document.querySelector('.hdr-c')
        };
    }
    
    /**
     * Updates the Welcome Screen and other UI elements with dynamic data from config.
     * @param {number} totalQ - Total number of questions.
     * @param {number} totalMarks - Total marks for the test.
     */
    updateWelcomeScreenData(totalQ, totalMarks) {
        const config = this.config;

        // 1. DYNAMICALLY UPDATE THE BROWSER PAGE TITLE
        if (this.els.pageTitle) this.els.pageTitle.textContent = config.testName; // <--- NEW LINE
        
        if (this.els.welcomeTestTitle) this.els.welcomeTestTitle.textContent = config.testName;
        if (this.els.testIdValue) this.els.testIdValue.textContent = config.testId;
        if (this.els.totalQuestionsValue) this.els.totalQuestionsValue.textContent = totalQ;
        if (this.els.totalMarksValue) this.els.totalMarksValue.textContent = totalMarks;
        if (this.els.durationValue) this.els.durationValue.textContent = `${config.durationMinutes} minutes`;
        if (this.els.markingValue) this.els.markingValue.textContent = `+${config.marksPerQuestion} / -${config.negativeMarking}`;
        if (this.els.hdrCenter) this.els.hdrCenter.textContent = config.nameDisplay;

        // Update Main Test Interface Totals
        [this.els.qTotal, this.els.progTotal, this.els.modalTotalMarks].forEach(el => {
            if (el) el.textContent = totalQ;
        });
    }

    /**
     * Sets up the event listener for the Start Test button.
     */
    setupWelcomeScreen() {
        document.getElementById('startTestBtn').addEventListener('click', () => {
            document.getElementById('welcomeScreen').classList.add('hidden');
            document.getElementById('mainTestInterface').style.display = '';
            
            // Initialize the test after a short delay for MathJax
            setTimeout(() => {
                this.init();
            }, 300);
        });
    }
    
    /**
     * Sets up the test environment: grid, timer, and initial question.
     */
    init() {
        this.createGrid();
        this.startTimer();
        this.loadQ(0);
        this.setupEvents();
        this.updatePrintButton();
        this.updateThemeToggleIcon();
    }

    /**
     * Sets up event listeners for navigation, submission, and language toggle.
     */
    setupEvents() {
        document.getElementById('menuBtn').onclick = () => this.togglePanel();
        document.getElementById('subBtn').onclick = () => this.confirmSub();
        document.getElementById('prevBtn').onclick = () => this.nav(-1);
        document.getElementById('nextBtn').onclick = () => this.nav(1);
        document.getElementById('reviewBtn').onclick = () => this.toggleReview();
        document.getElementById('engBtn').onclick = () => this.setLang(true);
        document.getElementById('hinBtn').onclick = () => this.setLang(false);
        document.getElementById('panelClose').onclick = () => this.closePanel();
        document.getElementById('closeModal').onclick = () => this.closeModal();
        document.getElementById('revBtn').onclick = () => this.review();
        document.getElementById('printBtn').onclick = () => this.printTest();
        document.getElementById('themeToggle').onclick = () => this.toggleTheme();
    }
    
    /**
     * Ensures the user is warned before leaving the test page.
     */
    setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (!this.sub) {
                e.preventDefault();
                e.returnValue = 'Are you sure you want to leave? Your test progress will be lost.';
                return e.returnValue;
            }
        });
    }
    
    /**
     * Basic validation check on loaded question data.
     */
    validateData() {
        console.log(`Validating ${this.qs.length} question(s)...`);
        this.qs.forEach((q, idx) => {
            if (q.options && (q.correct_option_id < 0 || q.correct_option_id >= q.options.length)) {
                console.warn(`Q${idx + 1}: Invalid correct_option_id ${q.correct_option_id} for ${q.options.length} options`);
            }
        });
    }
    
    /**
     * Extracts and displays the correct language text while handling HTML and tables.
     * @param {string} html - The raw HTML string containing both eqt and hqt spans.
     * @param {boolean} isEng - True to show English (eqt), False to show Hindi (hqt).
     * @returns {string} The processed HTML string.
     */
    extractTxt(html, isEng) {
        if (!html) return '';
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const langSpans = tempDiv.querySelectorAll('span.eqt, span.hqt');
        langSpans.forEach(span => {
            const shouldShow = (isEng && span.classList.contains('eqt')) || 
                               (!isEng && span.classList.contains('hqt'));
            span.style.display = shouldShow ? '' : 'none';
        });
        
        const tables = tempDiv.querySelectorAll('table');
        tables.forEach(table => {
            if (table.parentElement && !table.parentElement.classList.contains('table-container')) {
                const container = document.createElement('div');
                container.className = 'table-container';
                table.parentNode.insertBefore(container, table);
                container.appendChild(table);
            }
        });
        
        return tempDiv.innerHTML;
    }
    
    /**
     * Creates the question grid for navigation panels.
     */
    createGrid() {
        this.els.qGrid.innerHTML = '';
        this.els.desktopQGrid.innerHTML = '';
        
        this.qs.forEach((_, i) => {
            const clickHandler = () => this.goToQ(i);
            
            const mobileDiv = document.createElement('div');
            mobileDiv.className = 'q-num';
            mobileDiv.textContent = i + 1;
            mobileDiv.onclick = clickHandler;
            this.els.qGrid.appendChild(mobileDiv);
            
            const desktopDiv = document.createElement('div');
            desktopDiv.className = 'q-num';
            desktopDiv.textContent = i + 1;
            desktopDiv.onclick = clickHandler;
            this.els.desktopQGrid.appendChild(desktopDiv);
        });
    }

    /**
     * Loads a specific question into the main test interface.
     * @param {number} idx - The index of the question to load.
     */
    loadQ(idx) {
        // Record time spent on previous question before navigation
        if (this.curQ !== idx) {
            const now = Date.now();
            this.timeSpent[this.curQ] += (now - this.lastQTime) / 1000;
            this.lastQTime = now;
        }
        
        this.curQ = idx;
        const q = this.qs[idx];
        
        this.els.qInfo.textContent = `Q${idx + 1}/${this.qs.length}`;
        this.els.progTxt.textContent = `${idx + 1} of ${this.qs.length}`;
        this.updateAnsCnt();
        this.updateNav();
        this.updateGrid();
        this.updateReviewButton();
        
        if (q.comp) {
            this.els.compSec.style.display = 'block';
            this.els.compCont.innerHTML = this.extractTxt(q.comp, this.eng);
        } else {
            this.els.compSec.style.display = 'none';
        }
        
        this.els.qTxt.innerHTML = this.extractTxt(q.question, this.eng);
        this.loadOpts(q, idx);
        
        // Load Solution (if submitted)
        if (this.sub && q.solution) {
            const timeSpent = Math.round(this.timeSpent[idx]);
            const minutes = Math.floor(timeSpent / 60);
            const seconds = timeSpent % 60;
            const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            
            this.els.solInfo.innerHTML = `
                <span><i class="fas fa-clock"></i> Time spent: ${timeStr}</span>
                <span><i class="fas fa-check-circle"></i> Correct answer: ${String.fromCharCode(65 + q.correct_option_id)}</span>
            `;
            
            this.els.solCont.innerHTML = this.extractTxt(q.solution, this.eng);
            this.els.sol.classList.add('show');
        } else {
            this.els.sol.classList.remove('show');
        }

        // IMPORTANT FIX: Re-run MathJax after dynamic content is loaded
        if (typeof MathJax !== "undefined") {
            MathJax.typesetPromise().then(() => {}).catch(err => console.error("MathJax typesetting failed:", err));
        }
    }
    
    /**
     * Loads the options for the current question, applying selected/correct/wrong styles.
     * @param {Object} q - The current question object.
     * @param {number} qIdx - The index of the current question.
     */
    loadOpts(q, qIdx) {
        this.els.opts.innerHTML = '';
        const userAnswer = this.ans[qIdx];
        const correctAnswer = q.correct_option_id;
        
        if (!q.options || !Array.isArray(q.options)) {
            console.error(`Q${qIdx + 1}: No valid options array`);
            return;
        }
        
        q.options.forEach((opt, i) => {
            const div = document.createElement('div');
            let cls = 'opt';
            
            if (this.sub) cls += ' submitted';
            if (userAnswer === i) cls += ' sel';
            
            if (this.sub && correctAnswer !== undefined && correctAnswer !== null) {
                if (i === correctAnswer) {
                    cls += ' correct';
                } else if (userAnswer === i && userAnswer !== correctAnswer) {
                    cls += ' wrong';
                }
            }
            
            div.className = cls;
            div.innerHTML = `
                <div class="opt-radio"></div>
                <div class="opt-txt">${this.extractTxt(opt, this.eng)}</div>
            `;
            
            if (!this.sub) {
                div.onclick = () => this.selOpt(i, qIdx);
            }
            
            this.els.opts.appendChild(div);
        });
    }
    
    /**
     * Handles selection/deselection of an option.
     * @param {number} optIdx - The index of the selected option.
     * @param {number} qIdx - The index of the question.
     */
    selOpt(optIdx, qIdx) {
        if (this.sub) return;
        this.ans[qIdx] = this.ans[qIdx] === optIdx ? null : optIdx;
        
        this.loadOpts(this.qs[qIdx], qIdx);
        this.updateAnsCnt();
        this.updateGrid();
        
        // FIX: Re-run MathJax to ensure options (especially equations) are rendered correctly
        if (typeof MathJax !== "undefined") {
            MathJax.typeset();
        }
    }
    
    /**
     * Toggles the 'Marked for Review' status of the current question.
     */
    toggleReview() {
        if (this.sub) return;
        this.reviewed[this.curQ] = !this.reviewed[this.curQ];
        this.updateGrid();
        this.updateReviewButton();
    }
    
    /**
     * Updates the look of the Review button.
     */
    updateReviewButton() {
        const btn = this.els.reviewBtn;
        if (this.reviewed[this.curQ]) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-flag"></i> Marked';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-flag"></i> Review';
        }
    }
    
    /**
     * Navigates to the previous or next question.
     * @param {number} dir - Direction (-1 for prev, 1 for next).
     */
   nav(dir) {
        const newIdx = this.curQ + dir;
        
        if (newIdx >= 0 && newIdx < this.qs.length) {
            this.loadQ(newIdx);
        }
    }
    
    /**
     * Navigates directly to a question via the grid.
     * @param {number} idx - The index of the question to navigate to.
     */
    goToQ(idx) {
        this.loadQ(idx);
        this.closePanel();
    }
    
    /**
     * Updates the color/status of question numbers in the grid.
     */
    updateGrid() {
        const nums = this.els.qGrid.querySelectorAll('.q-num');
        const desktopNums = this.els.desktopQGrid.querySelectorAll('.q-num');
        
        const updateNum = (el, i) => {
            el.className = 'q-num';
            el.classList.remove('cur', 'ans', 'wrong', 'review', 'unattempted', 'disabled');
            
            if (i === this.curQ) {
                el.classList.add('cur');
            } else if (this.sub) {
                if (this.ans[i] !== null && this.qs[i].correct_option_id !== undefined) {
                    if (this.ans[i] === this.qs[i].correct_option_id) {
                        el.classList.add('ans');
                    } else {
                        el.classList.add('wrong');
                    }
                } else if (this.ans[i] === null) {
                    el.classList.add('unattempted');
                }
            } else {
                if (this.reviewed[i]) {
                    el.classList.add('review');
                } else if (this.ans[i] !== null) {
                    el.classList.add('ans');
                }
            }
        };
        
        nums.forEach(updateNum);
        desktopNums.forEach(updateNum);
    }
    
    /**
     * Updates the disabled state of navigation buttons.
     */
    updateNav() {
        document.getElementById('prevBtn').disabled = this.curQ === 0;
        document.getElementById('nextBtn').disabled = this.curQ === this.qs.length - 1;
        document.getElementById('reviewBtn').style.display = this.sub ? 'none' : 'inline-flex';
    }
        
    /**
     * Updates the displayed count of answered questions.
     */
    updateAnsCnt() {
        const cnt = this.ans.filter(a => a !== null).length;
        this.els.ansCnt.textContent = cnt;
    }
    
    /**
     * Shows the print button only after test submission.
     */
    updatePrintButton() {
        this.els.printBtn.style.display = this.sub ? 'flex' : 'none';
    }
    
    /**
     * Updates the icon for the theme toggle button.
     */
    updateThemeToggleIcon() {
        const icon = this.darkMode ? 'fa-sun' : 'fa-moon';
        this.els.themeToggle.innerHTML = `<i class="fas ${icon}"></i>`;
    }
    
    /**
     * Sets the active language and reloads the current question.
     * @param {boolean} eng - True for English, False for Hindi.
     */
    setLang(eng) {
        this.eng = eng;
        document.getElementById('engBtn').classList.toggle('active', eng);
        document.getElementById('hinBtn').classList.toggle('active', !eng);
        this.loadQ(this.curQ);
    }
    
    /**
     * Toggles between light and dark mode.
     */
    toggleTheme() {
        this.darkMode = !this.darkMode;
        document.body.classList.toggle('dark-mode', this.darkMode);
        this.updateThemeToggleIcon();
        this.loadQ(this.curQ);
    }
    
    /**
     * Starts the main test timer.
     */
    startTimer() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.subTest();
                return;
            }
            const mins = Math.floor(this.timeLeft / 60);
            const secs = this.timeLeft % 60;
            this.els.timer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    /**
     * Stops all active timers.
     */
    stopTimers() {
        if (this.timer) clearInterval(this.timer);
        if (this.sectionTimer) clearInterval(this.sectionTimer);
    }
    
    /**
     * Toggles the visibility of the mobile question panel.
     */
    togglePanel() {
        this.els.panel.classList.toggle('open');
    }
    
    /**
     * Closes the mobile question panel.
     */
    closePanel() {
        this.els.panel.classList.remove('open');
    }
    
    /**
     * Confirms submission and alerts user about unanswered/reviewed questions.
     */
    confirmSub() {
        const unanswered = this.ans.filter(a => a === null).length;
        const reviewed = this.reviewed.filter(r => r).length;
        let msg = '';
        
        if (unanswered > 0 && reviewed > 0) {
            msg = `You have ${unanswered} unanswered questions and ${reviewed} marked for review. Submit anyway?`;
        } else if (unanswered > 0) {
            msg = `You have ${unanswered} unanswered questions. Submit anyway?`;
        } else if (reviewed > 0) {
            msg = `You have ${reviewed} questions marked for review. Submit anyway?`;
        } else {
            msg = 'Submit test?';
        }
        
        if (confirm(msg)) this.subTest();
    }
    
    /**
     * Final submission of the test and display of results.
     */
    subTest() {
        if (this.sub) return;
        
        const now = Date.now();
        this.timeSpent[this.curQ] += (now - this.lastQTime) / 1000;
        
        this.sub = true;
        this.stopTimers();
        document.getElementById('subBtn').style.display = 'none';
        document.getElementById('reviewBtn').style.display = 'none';
        
        const results = this.calcResults();
        this.showResults(results);
        
        this.loadQ(this.curQ); 
        this.updateGrid();
        this.updatePrintButton();
    }
    
    /**
     * Calculates the final score and statistics using dynamic marking scheme.
     * @returns {Object} The test results.
     */
    calcResults() {
        const timeTaken = Math.round((Date.now() - this.startT) / 60000);
        let correct = 0, incorrect = 0, unattempted = 0, score = 0;
        const marksPerQ = this.config.marksPerQuestion;
        const negMark = this.config.negativeMarking;
        
        this.qs.forEach((q, i) => {
            const userAns = this.ans[i];
            const correctAns = q.correct_option_id;
            
            if (userAns === null || userAns === undefined) {
                unattempted++;
            } else if (correctAns !== undefined && correctAns !== null && userAns === correctAns) {
                correct++;
                score += marksPerQ;
            } else {
                incorrect++;
                score -= negMark;
            }
        });
        
        const results = { 
            score: Math.max(0, score),
            correct, 
            incorrect, 
            unattempted, 
            timeTaken,
        };
        return results;
    }
    
    /**
     * Displays the test results modal.
     * @param {Object} results - The results object from calcResults.
     */
    showResults(results) {
        const totalMarks = this.config.totalMarks;
        
        this.els.scoreDisp.textContent = `${results.score}/${totalMarks}`;
        this.els.corrStat.textContent = results.correct;
        this.els.incStat.textContent = results.incorrect;
        this.els.unaStat.textContent = results.unattempted;
        this.els.timeStat.textContent = results.timeTaken;
        this.els.modalOver.classList.add('show');
    }
    
    /**
     * Closes the results modal.
     */
    closeModal() {
        this.els.modalOver.classList.remove('show');
    }
    
    /**
     * Closes the modal and navigates to the first question for review.
     */
    review() {
        this.closeModal();
        this.loadQ(0);
    }
    
    /**
     * Generates and prints the final result/solution sheet.
     */
    printTest() {
        const printWindow = window.open('', '_blank');
        const testTitle = this.config.testName;
        const totalMarks = this.config.totalMarks;
        const questionsHtml = this.qs.map((q, i) => {
            const userAns = this.ans[i];
            const correctAns = q.correct_option_id;
            const isCorrect = userAns !== null && correctAns !== undefined && userAns === correctAns;
            const timeSpent = Math.round(this.timeSpent[i]);
            const wasReviewed = this.reviewed[i];
            const isEng = true; 

            return `
                <div style="page-break-inside:avoid;margin-bottom:30px;border-bottom:1px solid #eee;padding-bottom:20px">
                    <h3 style="color:#4F46E5">Question ${i + 1} ${wasReviewed ? '<span style="color:#F59E0B">(Marked for Review)</span>' : ''}</h3>
                    
                    ${q.comp ? `<div>${this.extractTxt(q.comp, isEng)}</div>` : ''} 
                    <div>${this.extractTxt(q.question, isEng)}</div> 
                    <div style="margin-top:15px">
                        ${q.options.map((opt, j) => `
                            <div style="margin:5px 0;padding:5px;border-left:3px solid ${ 
                                j === correctAns ? '#10B981' : 
                                j === userAns ? '#EF4444' : '#E5E7EB' 
                            }">
                                ${this.extractTxt(opt, isEng)} 
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:15px;font-size:14px;color:#666">
                        <strong>Your answer:</strong> ${userAns !== null ? String.fromCharCode(65 + userAns) : 'Not attempted'}
                        ${userAns !== null && correctAns !== undefined ? 
                            `(<span style="color:${isCorrect ? '#10B981' : '#EF4444'}">${isCorrect ? 'Correct' : 'Incorrect'}</span>)` : ''}
                        <br>
                        <strong>Time spent:</strong> ${timeSpent} seconds
                    </div>
                    ${q.solution ? `
                        <div style="margin-top:15px;background:#f0fdf4;padding:15px;border-radius:8px">
                            <h4 style="color:#10B981;margin-top:0">Solution</h4>
                            ${this.extractTxt(q.solution, isEng)} 
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // HTML structure for the print window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${testTitle} - Results</title>
                
                <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
                <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
                <script>
                    window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] } };
                </script>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                    h2 { color: #4F46E5; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px; }
                    mjx-container { display: inline-block; }
                    @media print { .page-break { page-break-after: always; } }
                </style>
            </head>
            <body>
                <h2>${this.config.testName} - Analysis</h2>
                <div style="margin-bottom:30px">
                    <div><strong>Score:</strong> ${this.els.scoreDisp.textContent}</div>
                    <div><strong>Correct:</strong> ${this.els.corrStat.textContent}</div>
                    <div><strong>Incorrect:</strong> ${this.els.incStat.textContent}</div>
                    <div><strong>Unattempted:</strong> ${this.els.unaStat.textContent}</div>
                    <div><strong>Time taken:</strong> ${this.els.timeStat.textContent} minutes</div>
                </div>
                ${questionsHtml}
                
                <script>
                    function checkMathJaxAndPrint() {
                        if (typeof MathJax !== 'undefined' && MathJax.startup && MathJax.startup.promise) {
                            MathJax.startup.promise.then(() => {
                                window.print();
                            }).catch(error => {
                                setTimeout(window.print, 1000); 
                            });
                        } else {
                            setTimeout(window.print, 2000);
                        }
                    }
                    document.addEventListener('DOMContentLoaded', checkMathJaxAndPrint);
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}


// (नया और बेहतर कोड)
document.addEventListener('DOMContentLoaded', () => {
    // 1. JSON URL को सीधे HTML में डिफाइन किये गए वेरिएबल से लें
    // (यह वेरिएबल 'test_template.html' में Flask द्वारा सेट किया गया है)
    
    if (typeof JSON_DATA_URL !== 'undefined' && JSON_DATA_URL) {
        // 2. डेटा लोड करें
        loadTestData(JSON_DATA_URL);
    } else {
        // एरर हैंडलिंग
        console.error('Test data URL (JSON_DATA_URL) not found.');
        document.body.innerHTML = '<h1>Error: Test data URL not defined.</h1>';
    }
});


/**
 * Fetches JSON data and initializes the TestApp class upon success.
 * @param {string} JSON_URL - The URL or path to the questions JSON file.
 */
function loadTestData(JSON_URL) {
    fetch(JSON_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.questions || !Array.isArray(data.questions)) {
                 throw new Error("JSON structure is missing 'questions' array.");
            }
            // Data loaded successfully. Initialize the TestApp instance.
            new TestApp(data);
        })
        .catch(error => {
            console.error('Error loading test data:', error);
            // Display robust error message to the user
            const ws = document.getElementById('welcomeScreen');
            if (ws) {
                document.getElementById('mainTestInterface').style.display = 'none';
                ws.innerHTML = `
                    <h1 class="welcome-title" style="color:var(--d);">ERROR: Test Load Failed</h1>
                    <p style="color:var(--txtL);">Could not load test data from: <strong>${JSON_URL}</strong></p>
                    <p style="color:var(--txtL);">Please check the file path and ensure the JSON structure contains 'config' and 'questions'.</p>
                `;
                ws.classList.remove('hidden');
            } else {
                document.body.innerHTML = `<h1>Error: Test data not found for ${JSON_URL}</h1>`;
            }
        });
}