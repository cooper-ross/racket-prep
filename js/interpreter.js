function clearConsole() {
    var outputDiv = document.getElementById("output");
    outputDiv.innerHTML = '';
}

function appendOutput(text, cssClass) {
    var outputDiv = document.getElementById("output");
    var line = document.createElement('div');
    line.className = 'output-line ' + cssClass;

    const replacements = {
        '#t': 'true',
        '#f': 'false',
        '()': 'empty',
        'null': 'empty',
        ' struct-instance': ''
    };

    for (const [key, value] of Object.entries(replacements)) {
        text = text.replaceAll(key, value);
    }

    outputDiv.appendChild(line);
    outputDiv.scrollTop = outputDiv.scrollHeight;
    line.textContent = text;
}

/** Split Scheme code into top-level expressions */
function splitExpressions(code) {
    var expressions = [];
    var lines = code.split('\n');
    var currentExpr = '';
    var parenDepth = 0;
    var inString = false;
    var inComment = false;
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        inComment = false;
        
        for (var j = 0; j < line.length; j++) {
            var ch = line[j];
            
            if (inComment) continue;
            
            if (ch === ';' && !inString) {
                inComment = true;
                continue;
            }
            
            if (ch === '"' && (j === 0 || line[j-1] !== '\\')) {
                inString = !inString;
            }
            
            if (!inString && !inComment) {
                if (ch === '(' || ch === '[') parenDepth++;
                if (ch === ')' || ch === ']') parenDepth--;
            }
            
            currentExpr += ch;
            
            if (parenDepth === 0 && currentExpr.trim() !== '' && !inString) {
                expressions.push(currentExpr.trim().replaceAll('λ', 'lambda'));
                currentExpr = '';
            }
        }
        
        if (!inComment) {
            currentExpr += '\n';
        }
    }
    
    if (currentExpr.trim() !== '' && parenDepth === 0) {
        expressions.push(currentExpr.trim().replaceAll('λ', 'lambda'));
    }
    
    return expressions;
}

/** Check if an expression is a definition */
function isDefinition(exprCode) {
    return exprCode.trim().match(/^\(define[\s\-]/);
}

/** Check if an expression is a test */
function isTestExpression(exprCode) {
    var trimmed = exprCode.trim();
    return trimmed.match(/^\(check-expect[\s\)]/) || trimmed.match(/^\(check-within[\s\)]/);
}

/** Get completion status from localStorage */
function getCompletionStatus(problemId) {
    var key = 'problem_' + problemId + '_completed';
    return localStorage.getItem(key) === 'true';
}

/** Set completion status in localStorage */
function setCompletionStatus(problemId, completed) {
    var key = 'problem_' + problemId + '_completed';
    localStorage.setItem(key, completed.toString());
}

/** Run the Scheme code in the editor */
function runCode() {
    var code = editor.getValue();
    clearConsole();

    try {
        var interpreter = new BiwaScheme.Interpreter(function(e, state) {
            appendOutput('Your code has an error' + (e && e.message ? (': ' + e.message) : '!'), 'output-error');
        });
        
        var MAX_STEPS = 67108864;
        var __stepCount = 0;
        interpreter.dumper = { dump: function() {
            __stepCount++;
            if (__stepCount > MAX_STEPS) {
                throw new Error('Execution step limit exceeded');
            }
        }};
        
        loadRacketCompat(interpreter);
        
        try {
            interpreter.evaluate('(reset-test-results)', function() {});
        } catch (e) {
        }
        
        if (typeof preprocessLocal === 'function') {
            code = preprocessLocal(code);
        }
        
        if (typeof preprocessDefineStruct === 'function') {
            code = preprocessDefineStruct(code, interpreter);
        }
        
        var originalOutput = BiwaScheme.Port.current_output;
        BiwaScheme.Port.current_output = new BiwaScheme.Port.CustomOutput(function(str) {
            if (str != null && str !== '') {
                appendOutput(String(str), 'output-info');
            }
        });
        
        var expressions = splitExpressions(code);
        
        if (expressions.length === 0) {
            appendOutput('No code to execute.', 'output-info');
            BiwaScheme.Port.current_output = originalOutput;
            return;
        }
        
        var definitions = [];
        var otherExpressions = [];
        
        for (var i = 0; i < expressions.length; i++) {
            if (isDefinition(expressions[i])) {
                definitions.push(expressions[i]);
            } else {
                otherExpressions.push(expressions[i]);
            }
        }
        
        var hiddenTestCount = 0;
        window.hasHiddenTests = false;
        
        var requiredFunctions = [];
        if (typeof currentProblem !== 'undefined' && currentProblem) {
            var starterCode = currentProblem.starterCode || '';
            var defineMatch = starterCode.match(/\(define\s+\(([^\s\)]+)/);
            if (defineMatch) {
                requiredFunctions.push(defineMatch[1]);
            }
        }
        
        var hasUserDefinition = true;
        if (requiredFunctions.length > 0) {
            for (var i = 0; i < requiredFunctions.length; i++) {
                var funcName = requiredFunctions[i];
                var hasDefine = definitions.some(function(def) {
                    return def.indexOf('(define (' + funcName) !== -1 || 
                           def.indexOf('(define ' + funcName) !== -1;
                });
                if (!hasDefine) {
                    hasUserDefinition = false;
                    appendOutput('Error: You must define the function "' + funcName + '" to complete this problem.', 'output-error');
                    appendOutput('Deleting the function definition is not allowed.', 'output-error');
                }
            }
        }
        
        if (typeof currentProblem !== 'undefined' && 
            currentProblem && 
            currentProblem.hiddenCases && 
            Array.isArray(currentProblem.hiddenCases) &&
            hasUserDefinition) {
            for (var i = 0; i < currentProblem.hiddenCases.length; i++) {
                otherExpressions.push(currentProblem.hiddenCases[i]);
                hiddenTestCount++;
            }
            window.hasHiddenTests = true;
        }
        
        if (!hasUserDefinition) {
            BiwaScheme.Port.current_output = originalOutput;
            return;
        }
        
        var orderedExpressions = definitions.concat(otherExpressions);
        
        var hadOutput = false;
        
        (function evalNext(idx) {
            if (idx >= orderedExpressions.length) {
                try {
                    interpreter.evaluate('(if (> (+ check-expect-passed check-expect-failed) 0) (display-test-summary) #f)', function() {
                       checkAutoComplete(interpreter);
                       finishExecution();
                    });
                } catch (e) {
                    checkAutoComplete(interpreter);
                    finishExecution();
                }
                
                function checkAutoComplete(interp) {
                    if (typeof currentProblem === 'undefined' || !currentProblem || !currentProblem.id) {
                        return;
                    }
                    
                    if (!window.hasHiddenTests) {
                        return;
                    }
                    
                    try {
                        interp.evaluate('check-expect-failed', function(failedTests) {
                            interp.evaluate('check-expect-passed', function(passedTests) {
                                if (failedTests === 0 && passedTests > 0) {
                                    var problemId = currentProblem.id;
                                    var isAlreadyCompleted = getCompletionStatus(problemId);
                                    
                                    if (!isAlreadyCompleted) {
                                        setCompletionStatus(problemId, true);
                                        
                                        appendOutput('Congratulations! All hidden test cases passed!', 'output-success');
                                        appendOutput('Problem automatically marked as complete.', 'output-success');
                                        
                                        setTimeout(function() {
                                            if (typeof window.renderProblems === 'function') {
                                                window.renderProblems();
                                            }
                                            if (typeof window.updateStats === 'function') {
                                                window.updateStats();
                                            }
                                            if (typeof currentProblem !== 'undefined' && currentProblem && typeof displayProblem === 'function') {
                                                displayProblem(currentProblem);
                                            }
                                        }, 100);
                                    }
                                }
                            });
                        });
                    } catch (e) {
                        console.log('Auto-completion check failed:', e);
                    }
                }
                
                function finishExecution() {
                    if (!hadOutput) {
                        appendOutput('Code executed successfully.', 'output-info');
                    }
                    BiwaScheme.Port.current_output = originalOutput;
                }
                return;
            }
            
            var exprCode = orderedExpressions[idx];
            
            try {
                interpreter.evaluate(exprCode, function(result) {
                    var isDefine = isDefinition(exprCode);
                    var isTest = isTestExpression(exprCode);
                    
                    if (result !== BiwaScheme.undef && 
                        result !== undefined && 
                        !isDefine && 
                        !isTest) {
                        var resultStr = BiwaScheme.to_write(result);
                        appendOutput(resultStr, 'output-result');
                        hadOutput = true;
                    } else if (isDefine || isTest) {
                        hadOutput = true;
                    }
                    
                    evalNext(idx + 1);
                });
            } catch (evalError) {
                appendOutput('Your code has an error!', 'output-error');
                BiwaScheme.Port.current_output = originalOutput;
            }
        })(0);
        
    } catch (e) {
        appendOutput('Your code has an syntax error!', 'output-error');
    }
}