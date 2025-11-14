var editor;

/** Initialize the CodeMirror editor */
function initializeEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
        mode: "scheme",
        lineNumbers: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: false,
        theme: "default",
        inputStyle: "contenteditable"
    });
    
    editor.focus();
    
    editor.setOption("extraKeys", {
        "Tab": function(cm) {
            var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
            cm.replaceSelection(spaces);
        },
        "Ctrl-Enter": function(cm) {
            runCode();
        }
    });
    
    editor.on("change", function(cm, change) {
        if (typeof saveCurrentCode === 'function') {
            clearTimeout(window.autoSaveTimeout);
            window.autoSaveTimeout = setTimeout(function() {
                saveCurrentCode();
            }, 1000);
        }
    });
    
    editor.on("beforeChange", function(cm, change) {
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
    initializeEditor();
    initializeMobileTabs();
});

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
    }
});