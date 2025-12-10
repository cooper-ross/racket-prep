# Racket Prep

<img alt="image" src="https://github.com/user-attachments/assets/4982e840-797c-4c12-9df5-d0c908000d05" />

### Racket Prep

A web-based programming practice platform for learning Racket for UWaterloo Students in CS 115-145. It has ~60 problems + 3 handmade practice finals. All code is automatically saved, and the editor also has most of the features of Dr. Racket proper, including syntax highlighting, bracket matching (when typing), and auto-indentation. It works on mobile, too!

### Keyboard Shortcuts

- `Ctrl + Enter` - Run code
- `Shift + Tab` - Insert spaces (auto-indentation)
- `Ctrl + \` - Insert λ symbol

## Problem Format

If you want (and please do!), you can submit problems to help others. Note: they don't need to relate to course content, but if they are just an extra challenge for fun, make sure you mention that in the description. Problems are defined in JSON files in the `problems/` directory. Each problem includes:

- `id` - Unique identifier for storage, usually just kebab-case of the title
- `title` - Problem name, doesn't need to be super descriptive
- `difficulty` - Easy, Medium, or Hard
- `time` - Estimated completion time
- `category` - Problem category
- `description` - Problem description (supports Markdown)
- `examples` - Example inputs and outputs
- `starterCode` - Initial code template
- `hiddenCases` - Test cases that run automatically, just individual check-expect lines

If you'd like, include an `author` field and I'll add some functionality for that later!

Also, most of the problems are AI generated. I used ChatGPT and a list of problems with brief descriptions, and it did the rest. That means some of the test cases could be wrong. That said, I have verified 56/60 of the problems as of now, so only the following are unverified: `combine-bst`, `list->bst`, `quick`, and `eval-expression`.

## Exam Format

Practice exams live in `exams/*.json` and are loaded by visiting `exam.html?exam=FILE.json`.

Top-level properties:
- `id`, `title`, `time`, `totalPoints`, `description`
- `content`: An array of items (see below)

### Content Types

The `content` array supports four item types:

#### 1. Text
Displays markdown content (supports MathJax).
```json
{ "type": "text", "content": "Instructions here..." }
```

#### 2. Code Block
Displays read-only code.
```json
{ 
  "type": "code", 
  "content": "(define ...)", 
  "title": "Optional Title",
  "language": "scheme" 
}
```

#### 3. Section
Groups items together visually.
```json
{ 
  "type": "section", 
  "title": "Part A", 
  "description": "...", 
  "content": [ ... ] 
}
```

#### 4. Question
Gradable items. The structure depends on the `prompt`.

**Single Line Textbox**
Graded via a JavaScript regex/function string.
```json
{
  "type": "question",
  "prompt": "single-line-textbox",
  "points": 1,
  "content": "Question prompt...",
  "verification": "const t=s=>(/\\b5\\b/).test(s.trim())?1:0;", 
  "explanation": "Shown after grading"
}
```
*Note: `verification` must be a string that evaluates to a function returning the score.*

**Code Editor**
Graded by running Scheme test cases.
```json
{
  "type": "question",
  "prompt": "code",
  "points": 4,
  "content": "Write a function...",
  "starterCode": "(define ...)",
  "hiddenCases": [
    "(check-expect (func 1) 2)",
    "(check-expect (func 2) 4)"
  ],
  "precode": "(define helper ...)"
}
```

### Example Exam

```json
{
  "id": "demo-1",
  "title": "Sample Exam",
  "time": "90 minutes",
  "totalPoints": 10,
  "description": "Short demo exam.",
  "content": [
    { "type": "text", "content": "Good luck!" },
    {
      "type": "section",
      "title": "Warmup",
      "content": [
        {
          "type": "question",
          "prompt": "single-line-textbox",
          "points": 1,
          "content": "2 + 3 = ?",
          "verification": "const t=s=>(/\\b5\\b/).test(s.trim())?1:0;"
        }
      ]
    }
  ]
}
```

## Acknowledgments

Built for CS145 (Programming Languages) course preparation. The platform uses BiwaScheme for Scheme interpretation in the browser (and a bunch of custom Scheme code to replicate most Racket functions), CodeMirror for the editor + syntax highlighting, and Marked.js for the markdown descriptions.
