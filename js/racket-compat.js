var racketCompatCode = `
; Racket list accessor aliases
(define first car)
(define second cadr)
(define third caddr)
(define fourth cadddr)
(define fifth car)
(define sixth cadr)
(define seventh caddr)
(define eighth cadddr)
(define ninth car)
(define last cdr)
(define rest cdr)

; Additional list functions
(define (empty? lst)
  (null? lst))

(define empty '())
(define (empty? lst)
  (null? lst))

; Racket-style list operations
(define (length lst)
  (if (null? lst)
      0
      (+ 1 (length (cdr lst)))))

(define (reverse lst)
  (define (reverse-helper lst acc)
    (if (null? lst)
        acc
        (reverse-helper (cdr lst) (cons (car lst) acc))))
  (reverse-helper lst '()))

(define (append lst1 lst2)
  (if (null? lst1)
      lst2
      (cons (car lst1) (append (cdr lst1) lst2))))

; List predicates
(define (list? x)
  (or (null? x)
      (and (pair? x) (list? (cdr x)))))

; Member function
(define (member item lst)
  (cond
    [(null? lst) #f]
    [(equal? (car lst) item) #t]
    [else (member item (cdr lst))]))
(define (member? item lst)
  (member item lst))

; Remove function
(define (remove item lst)
  (cond
    [(null? lst) '()]
    [(equal? (car lst) item) (remove item (cdr lst))]
    [else (cons (car lst) (remove item (cdr lst)))]))

; Filter function
(define (filter pred lst)
  (cond
    [(null? lst) '()]
    [(pred (car lst)) (cons (car lst) (filter pred (cdr lst)))]
    [else (filter pred (cdr lst))]))

; Every function (andmap)
(define (every? pred lst)
  (cond
    [(null? lst) #t]
    [(not (pred (car lst))) #f]
    [else (every? pred (cdr lst))]))

(define andmap every?)

; Fold functions
(define (foldl func init lst)
  (if (null? lst)
      init
      (foldl func (func (car lst) init) (cdr lst))))

(define (foldr func init lst)
  (if (null? lst)
      init
      (func (car lst) (foldr func init (cdr lst)))))

; Build-list function
(define (build-list n func)
  (define (build-helper i)
    (if (>= i n)
        '()
        (cons (func i) (build-helper (+ i 1)))))
  (build-helper 0))

; Range function
(define (range n)
  (build-list n (lambda (x) x)))

(define (string=? s1 s2)
  (equal? s1 s2))

; Boolean operations
(define true #t)
(define false #f)

; Mathematical helpers
(define (add1 n)
  (+ n 1))

(define (sub1 n)
  (- n 1))

(define (even? n)
  (= (remainder n 2) 0))

(define (odd? n)
  (not (even? n)))

(define (positive? n)
  (> n 0))

(define (negative? n)
  (< n 0))

(define (zero? n)
  (= n 0))

(define (abs n)
  (if (< n 0) (- n) n))

(define (min a . rest)
  (if (null? rest)
      a
      (foldr (lambda (x acc) (if (< x acc) x acc)) a rest)))

(define (max a . rest)
  (if (null? rest)
      a
      (foldr (lambda (x acc) (if (> x acc) x acc)) a rest)))

(define (gcd a b)
  (if (= b 0)
      a
      (gcd b (remainder a b))))

(define (lcm a b)
  (/ (* a b) (gcd a b)))
  
(define (sqr n)
  (* n n))

; Random number generation
(define (random . args)
  (if (null? args)
      (js-eval "Math.random()")
      (let ([n (car args)])
        (floor (* n (js-eval "Math.random()"))))))

; Identity function
(define (identity x) x)

; Compose function
(define (compose f g)
  (lambda (x) (f (g x))))

; Testing functions - check-expect and check-within
(define check-expect-passed 0)
(define check-expect-failed 0)
(define check-expect-failures '())

(define (check-expect actual expected)
  (if (equal? actual expected)
      (begin
        (set! check-expect-passed (+ check-expect-passed 1))
        #t)
      (begin
        (set! check-expect-failed (+ check-expect-failed 1))
        (set! check-expect-failures 
              (cons (list 'check-expect actual expected)
                    check-expect-failures))
        #f)))

(define (check-within actual expected tolerance)
  (define (close-enough? a b tol)
    (<= (abs (- a b)) tol))
  (if (close-enough? actual expected tolerance)
      (begin
        (set! check-expect-passed (+ check-expect-passed 1))
        #t)
      (begin
        (set! check-expect-failed (+ check-expect-failed 1))
        (set! check-expect-failures 
              (cons (list 'check-within actual expected tolerance)
                    check-expect-failures))
        #f)))

(define (reset-test-results)
  (set! check-expect-passed 0)
  (set! check-expect-failed 0)
  (set! check-expect-failures '()))

(define (display-test-summary)
  (define total (+ check-expect-passed check-expect-failed))
  (cond
    [(= total 0) #f]
    [(= check-expect-failed 0)
     (cond
       [(= total 1) (display "Your test passed!")]
       [(= total 2) (display "Both your tests passed!")]
       [else (display (string-append "All " 
                                     (number->string total) 
                                     " tests passed!"))])]
    [else
     (display (string-append (number->string check-expect-failed)
                             "/"
                             (number->string total)
                             " tests failed! "))
     (for-each
      (lambda (failure)
        (let* ([test-type (car failure)]
               [actual (cadr failure)]
               [expected (caddr failure)]
               [within (if (eq? test-type 'check-within)
                           (string-append " ± " (number->string (cadddr failure)))
                           "")]
               [msg (string-append
                     "(" (symbol->string test-type) " ... ) expected "
                     (format "~a" expected)
                     within
                     ", got "
                     (format "~a" actual)
                     "; ")])
          (display msg)))
      (reverse check-expect-failures))]))
`;

/** JavaScript-based define-struct implementation */
function createDefineStruct(interpreter) {
    window.structDefinitions = window.structDefinitions || {};
    
    var structHelper = `
(define (make-struct-helper struct-name fields values)
  (let ([result (cons struct-name (cons 'struct-instance values))])
    result))

(define (struct-predicate-helper struct-name obj)
  (and (pair? obj)
       (eq? (car obj) struct-name)
       (pair? (cdr obj))
       (eq? (cadr obj) 'struct-instance)))

(define (struct-accessor-helper obj index)
  (if (and (pair? obj)
           (pair? (cdr obj))
           (eq? (cadr obj) 'struct-instance))
      (let ([values-list (cddr obj)])
        (list-ref values-list index))
      false))`;
    
    
    try {
        interpreter.evaluate(structHelper);
    } catch (e) {
        console.warn("Could not load struct helper:", e);
    }
}

/** Parse and create a define-struct */
function handleDefineStruct(structName, fields, interpreter) {
    window.structDefinitions = window.structDefinitions || {};
    window.structDefinitions[structName] = fields;
    
    var constructorCode = `
(define (make-${structName} ${fields.join(' ')})
  (make-struct-helper '${structName} '(${fields.join(' ')}) (list ${fields.join(' ')})))

(define (${structName}? obj)
  (struct-predicate-helper '${structName} obj))`;

    // Create accessors for each field
    fields.forEach((field, index) => {
        constructorCode += `
(define (${structName}-${field} obj)
  (struct-accessor-helper obj ${index}))`;
    });
    
    try {
        interpreter.evaluate(constructorCode);
        return true;
    } catch (e) {
        console.error("Error creating struct:", e);
        return false;
    }
}

/** Pre-process code to handle define-struct */
function preprocessDefineStruct(code, interpreter) {
    var structRegex = /\(define-struct\s+([a-zA-Z][a-zA-Z0-9-]*)\s+\(([^)]*)\)\)/g;
    var match;
    var processedCode = code;
    
    while ((match = structRegex.exec(code)) !== null) {
        var structName = match[1];
        var fieldsStr = match[2].trim();
        var fields = fieldsStr.split(/\s+/).filter(f => f.length > 0);
        
        handleDefineStruct(structName, fields, interpreter);
        
        processedCode = processedCode.replace(match[0], `; define-struct ${structName} processed`);
    }
    
    return processedCode;
}

/** Pre-process code to handle match forms */
function preprocessMatch(code) {
    let gensymCounter = 0;
    const gensym = () => `__match_val_${gensymCounter++}`;
    
    let maxIterations = 100;
    let iterations = 0;
    let changed = true;
    
    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        
        // Find a match form: (match expr [pattern body] ...)
        const matchRegex = /\(match\s+/;
        const matchMatch = code.match(matchRegex);
        if (!matchMatch) break;
        
        const startPos = matchMatch.index;
        let pos = startPos + 1; // After opening paren
        
        // Skip 'match' keyword
        while (pos < code.length && /\s/.test(code[pos])) pos++;
        while (pos < code.length && !/[\s()]/.test(code[pos])) pos++;
        while (pos < code.length && /\s/.test(code[pos])) pos++;
        
        // Extract the expression to match
        const exprStart = pos;
        let exprDepth = 0;
        while (pos < code.length) {
            if (code[pos] === '(') exprDepth++;
            else if (code[pos] === ')') {
                if (exprDepth === 0) break;
                exprDepth--;
            }
            else if (code[pos] === '[' && exprDepth === 0) break;
            else if (/\s/.test(code[pos]) && exprDepth === 0) {
                // Check if next non-whitespace is '['
                let lookahead = pos + 1;
                while (lookahead < code.length && /\s/.test(code[lookahead])) lookahead++;
                if (lookahead < code.length && code[lookahead] === '[') break;
            }
            pos++;
        }
        const matchExpr = code.substring(exprStart, pos).trim();
        
        // Skip whitespace
        while (pos < code.length && /\s/.test(code[pos])) pos++;
        
        // Extract clauses
        const clauses = [];
        while (pos < code.length && code[pos] === '[') {
            pos++; // Skip '['
            const clauseStart = pos;
            let bracketDepth = 1;
            let parenDepth = 0;
            
            // Find pattern end (first non-nested whitespace or end of clause)
            while (pos < code.length && (parenDepth > 0 || bracketDepth > 1 || !/\s/.test(code[pos]))) {
                if (code[pos] === '(') parenDepth++;
                else if (code[pos] === ')') parenDepth--;
                else if (code[pos] === '[') bracketDepth++;
                else if (code[pos] === ']') {
                    bracketDepth--;
                    if (bracketDepth === 0) break;
                }
                pos++;
            }
            
            const pattern = code.substring(clauseStart, pos).trim();
            
            // Skip whitespace
            while (pos < code.length && /\s/.test(code[pos])) pos++;
            
            // Extract body
            const bodyStart = pos;
            parenDepth = 0;
            bracketDepth = 1;
            while (pos < code.length && bracketDepth > 0) {
                if (code[pos] === '(') parenDepth++;
                else if (code[pos] === ')') parenDepth--;
                else if (code[pos] === '[') bracketDepth++;
                else if (code[pos] === ']') {
                    bracketDepth--;
                    if (bracketDepth === 0) break;
                }
                pos++;
            }
            
            const body = code.substring(bodyStart, pos).trim();
            clauses.push({ pattern, body });
            
            pos++; // Skip ']'
            while (pos < code.length && /\s/.test(code[pos])) pos++;
        }
        
        // Skip closing paren of match
        if (pos < code.length && code[pos] === ')') pos++;
        
        // Generate cond expression
        const valSym = gensym();
        let condExpr = `(let ([${valSym} ${matchExpr}])\n  (cond\n`;
        
        for (const clause of clauses) {
            const { pattern, body } = clause;
            
            // Handle different pattern types
            if (pattern === '_') {
                // Wildcard - always matches
                condExpr += `    [#t ${body}]\n`;
            } else if (pattern === "'()" || pattern === '()') {
                // Empty list
                condExpr += `    [(null? ${valSym}) ${body}]\n`;
            } else if (pattern.startsWith("'")) {
                // Quoted literal
                condExpr += `    [(equal? ${valSym} ${pattern}) ${body}]\n`;
            } else if (pattern.match(/^\(\?\s+/)) {
                // Predicate pattern: (? predicate) or (? predicate var)
                const predMatch = pattern.match(/^\(\?\s+(\S+)(?:\s+(\S+))?\)$/);
                if (predMatch) {
                    const predicate = predMatch[1];
                    const varName = predMatch[2];
                    
                    if (varName && varName !== '_') {
                        // Bind to variable if specified
                        condExpr += `    [(${predicate} ${valSym}) (let ([${varName} ${valSym}]) ${body})]\n`;
                    } else {
                        // No variable binding
                        condExpr += `    [(${predicate} ${valSym}) ${body}]\n`;
                    }
                }
            } else if (pattern.match(/^\(cons\s+/)) {
                // Cons pattern: (cons x y)
                const consMatch = pattern.match(/^\(cons\s+(\S+)\s+(\S+)\)$/);
                if (consMatch) {
                    const carPat = consMatch[1];
                    const cdrPat = consMatch[2];
                    if (carPat === '_' && cdrPat === '_') {
                        condExpr += `    [(pair? ${valSym}) ${body}]\n`;
                    } else if (cdrPat === '_') {
                        condExpr += `    [(pair? ${valSym}) (let ([${carPat} (car ${valSym})]) ${body})]\n`;
                    } else if (carPat === '_') {
                        condExpr += `    [(pair? ${valSym}) (let ([${cdrPat} (cdr ${valSym})]) ${body})]\n`;
                    } else {
                        condExpr += `    [(pair? ${valSym}) (let ([${carPat} (car ${valSym})] [${cdrPat} (cdr ${valSym})]) ${body})]\n`;
                    }
                }
            } else if (pattern.match(/^\(list\s+/)) {
                // List pattern: (list x y z) or (list '+ a b)
                const listMatch = pattern.match(/^\(list\s+(.+)\)$/);
                if (listMatch) {
                    // Parse elements more carefully to handle quoted symbols
                    const elemStr = listMatch[1].trim();
                    const elements = [];
                    let i = 0;
                    while (i < elemStr.length) {
                        // Skip whitespace
                        while (i < elemStr.length && /\s/.test(elemStr[i])) i++;
                        if (i >= elemStr.length) break;
                        
                        // Check if it's a quoted symbol or regular token
                        if (elemStr[i] === "'") {
                            // Quoted symbol - capture quote and symbol
                            let start = i;
                            i++; // skip quote
                            while (i < elemStr.length && !/\s/.test(elemStr[i])) i++;
                            elements.push(elemStr.substring(start, i));
                        } else {
                            // Regular token
                            let start = i;
                            while (i < elemStr.length && !/\s/.test(elemStr[i])) i++;
                            elements.push(elemStr.substring(start, i));
                        }
                    }
                    
                    const bindings = [];
                    const conditions = [`(list? ${valSym})`, `(= (length ${valSym}) ${elements.length})`];
                    
                    elements.forEach((elem, idx) => {
                        if (elem.startsWith("'")) {
                            // Quoted element - add equality check
                            conditions.push(`(equal? (list-ref ${valSym} ${idx}) ${elem})`);
                        } else if (elem !== '_') {
                            // Variable binding
                            bindings.push(`[${elem} (list-ref ${valSym} ${idx})]`);
                        }
                    });
                    
                    const condition = conditions.length === 1 ? conditions[0] : `(and ${conditions.join(' ')})`;
                    
                    if (bindings.length > 0) {
                        condExpr += `    [${condition} (let (${bindings.join(' ')}) ${body})]\n`;
                    } else {
                        condExpr += `    [${condition} ${body}]\n`;
                    }
                }
            } else if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(pattern)) {
                // Variable binding - always matches
                condExpr += `    [#t (let ([${pattern} ${valSym}]) ${body})]\n`;
            } else {
                // Try to parse as literal
                condExpr += `    [(equal? ${valSym} '${pattern}) ${body}]\n`;
            }
        }
        
        condExpr += `    [else (error "match: no matching clause")]))`;
        
        code = code.substring(0, startPos) + condExpr + code.substring(pos);
        changed = true;
    }
    
    return code;
}

/** Pre-process code to handle local forms */
function preprocessLocal(code) {
    var maxIterations = 100;
    var iterations = 0;
    var changed = true;
    
    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        
        // Find a local form
        var localMatch = code.match(/\(local\s*\[/);
        if (!localMatch) break;
        
        var startPos = localMatch.index;
        var pos = startPos + localMatch[0].length;
        
        var definitions = [];
        var bracketDepth = 1;
        var parenDepth = 0;
        var currentDef = '';
        
        while (pos < code.length && bracketDepth > 0) {
            var ch = code[pos];
            
            if (ch === '[') bracketDepth++;
            else if (ch === ']') {
                bracketDepth--;
                if (bracketDepth === 0) break;
            }
            else if (ch === '(') parenDepth++;
            else if (ch === ')') parenDepth--;
            
            currentDef += ch;
            
            if (parenDepth === 0 && currentDef.trim().length > 0 && bracketDepth > 0) {
                definitions.push(currentDef.trim());
                currentDef = '';
            }
            
            pos++;
        }
        
        if (currentDef.trim().length > 0) {
            definitions.push(currentDef.trim());
        }
        
        pos++;
        
        var bodyStart = pos;
        parenDepth = 1;
        
        while (pos < code.length && parenDepth > 0) {
            if (code[pos] === '(') parenDepth++;
            else if (code[pos] === ')') parenDepth--;
            pos++;
        }
        
        var bodyEnd = pos - 1;
        var body = code.substring(bodyStart, bodyEnd).trim();
        
        var letrecBindings = [];
        for (var i = 0; i < definitions.length; i++) {
            var def = definitions[i];
            var defineMatch = def.match(/\(define\s+(\S+)\s+([\s\S]*)\)/);
            if (defineMatch) {
                var varName = defineMatch[1];
                var expr = defineMatch[2].trim();
                
                if (varName.startsWith('(')) {
                    var funcMatch = varName.match(/\(([^\s)]+)(.*)\)/);
                    if (funcMatch) {
                        var funcName = funcMatch[1];
                        var args = funcMatch[2].trim();
                        var funcBody = expr;
                        letrecBindings.push('[' + funcName + ' (lambda (' + args + ') ' + funcBody + ')]');
                    }
                } else {
                    letrecBindings.push('[' + varName + ' ' + expr + ']');
                }
            }
        }
        
        var letrecForm = '(letrec (' + letrecBindings.join(' ') + ') ' + body + ')';
        
        var originalForm = code.substring(startPos, pos);
        code = code.substring(0, startPos) + letrecForm + code.substring(pos);
        changed = true;
    }
    
    return code;
}

/** Load Racket compatibility into interpreter */
function loadRacketCompat(interpreter) {
    try {
        interpreter.evaluate(racketCompatCode, function() {
            console.log("Racket compatibility functions loaded");
        });
        
        createDefineStruct(interpreter);
        
    } catch (e) {
        console.error("Error loading Racket compatibility:", e);
    }
}