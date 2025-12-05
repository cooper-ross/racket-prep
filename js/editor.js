var editor;

/**
 * Create and configure a CodeMirror editor with Racket/Scheme features
 * @param {HTMLTextAreaElement} textarea - The textarea element to replace
 * @param {Object} options - Configuration options
 * @param {Function} options.onSave - Callback for auto-save (optional)
 * @param {Function} options.onRun - Callback for Ctrl+Enter (optional, for running code)
 * @param {boolean} options.autoFocus - Whether to focus the editor on init (default: false)
 * @param {string} options.height - Height of the editor (optional)
 * @param {boolean} options.enableLambdaShortcut - Enable Ctrl+\ for λ (default: true)
 * @returns {CodeMirror} The configured CodeMirror instance
 */
function createRacketEditor(textarea, options) {
    options = options || {};
    
    var cm = CodeMirror.fromTextArea(textarea, {
        mode: "scheme",
        lineNumbers: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: false,
        theme: document.documentElement.classList.contains('dark-theme') ? 'monokai' : 'default',
        inputStyle: "contenteditable"
    });
    
    if (options.autoFocus) {
        cm.focus();
    }
    
    if (options.height) {
        cm.setSize(null, options.height);
    }
    
    var extraKeys = {
        "Tab": function(cm) {
            var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
            cm.replaceSelection(spaces);
        }
    };
    
    if (options.onRun && typeof options.onRun === 'function') {
        extraKeys["Ctrl-Enter"] = function(cm) {
            options.onRun(cm);
        };
    }
    
    // Lambda calculus shortcut
    if (options.enableLambdaShortcut !== false) {
        extraKeys["Ctrl-\\"] = function(cm) {
            cm.replaceSelection("λ");
            // unselect the text
            cm.setSelection(cm.getCursor(), cm.getCursor());
        };
    }
    
    cm.setOption("extraKeys", extraKeys);
    
    // Auto-save on change
    if (options.onSave && typeof options.onSave === 'function') {
        cm.on("change", function(cm, change) {
            clearTimeout(window.autoSaveTimeout);
            window.autoSaveTimeout = setTimeout(function() {
                options.onSave(cm);
            }, 1000);
        });
    }
    
    // Bracket correction - auto-correct closing brackets
    cm.on("beforeChange", function(cm, change) {
        if (change.origin !== "+input" || change.text.length !== 1 || change.text[0].length !== 1) {
            return;
        }
        
        var char = change.text[0];
        
        if (char === ')' || char === ']') {
            var cursor = change.from;
            
            var textBeforeCursor = '';
            for (var lineNum = 0; lineNum < cursor.line; lineNum++) {
                textBeforeCursor += cm.getLine(lineNum) + '\n';
            }
            textBeforeCursor += cm.getLine(cursor.line).substring(0, cursor.ch);
            
            var bracketStack = [];
            for (var i = 0; i < textBeforeCursor.length; i++) {
                var c = textBeforeCursor[i];
                if (c === '(' || c === '[') {
                    bracketStack.push(c);
                } else if (c === ')' || c === ']') {
                    bracketStack.pop();
                }
            }
            
            if (bracketStack.length > 0) {
                var lastOpening = bracketStack[bracketStack.length - 1];
                var correctClosing = lastOpening === '(' ? ')' : ']';
                
                if (char !== correctClosing) {
                    change.update(change.from, change.to, [correctClosing]);
                }
            }
        }
    });
    
    return cm;
}

/** Initialize the CodeMirror editor for the practice problems page */
function initializeEditor() {
    editor = createRacketEditor(document.getElementById("code-editor"), {
        autoFocus: true,
        onSave: function(cm) {
            if (typeof saveCurrentCode === 'function') {
                saveCurrentCode();
            }
        },
        onRun: function(cm) {
            runCode();
        }
    });
}

/** Clear the output console */
function clearOutput() {
    var outputDiv = document.getElementById("output");
    outputDiv.innerHTML = '<div class="output-info">Output cleared. Ready to run code.</div>';
    document.getElementById("status-message").textContent = "";
}

/** Escape HTML */
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Handle mobile tab switching */
function initializeMobileTabs() {
    const mobileTabs = document.querySelectorAll('.mobile-tab');
    const panels = document.querySelectorAll('.panel-content');
    
    mobileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetPanel = this.getAttribute('data-panel');
            
            mobileTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            panels.forEach(panel => panel.classList.remove('active'));
            
            if (targetPanel === 'left') {
                document.querySelector('.left-panel').classList.add('active');
            } else if (targetPanel === 'right') {
                document.querySelector('.right-panel').classList.add('active');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if the code-editor element exists (practice page only)
    const codeEditorElement = document.getElementById('code-editor');
    if (codeEditorElement) {
        initializeEditor();
    }
    
    // Only initialize mobile tabs if they exist
    const mobileTabs = document.querySelector('.mobile-tab');
    if (mobileTabs) {
        initializeMobileTabs();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
    }
});