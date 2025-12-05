# Racket Prep

<img alt="image" src="https://github.com/user-attachments/assets/4982e840-797c-4c12-9df5-d0c908000d05" />

A web-based programming practice platform for learning Racket for University of  Waterloo Students in either first-year CS 135 or CS 145 (also some CS 115). It has ~60 problems, covering recursion, lists, trees, etc. It also has 3 handmade practice exams based roughly on the type of questions you'd be getting. All code is automatically saved to local storage, so you don't need to worry about closing the browser, or changing problems halfway through. The editor also has most of the features of Dr. Racket proper, including syntax highlighting, bracket matching (when typing), and auto-indentation (and now the λ shortcut). It works on mobile, too!

### Editor Page

- **Left Panel**: Problem description, examples, and requirements
- **Right Panel**: Code editor and console output
- **Run Code**: Click "Run" or press `Ctrl+Enter` to execute your code
- **Auto-save**: Your code is automatically saved as you type
- **Test Cases**: Hidden test cases run automatically when you execute your code
- **Completion**: Problems are automatically marked as complete when all tests pass

### Keyboard Shortcuts

- `Ctrl+Enter` - Run code
- `Shift+Tab` - Insert spaces (auto-indentation)

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

Also, most of the problems are AI generated. I used ChatGPT and a list of problems with brief descriptions, and it did the rest. This is great, since it meant less work for me, but is also *terrible*, because it means some test cases could be completely wrong! If you have a working solution and it keeps failing a few tests, look into it, and make a report if need be. Thanks!

## Acknowledgments

Built for CS145 (Programming Languages) course preparation. The platform uses BiwaScheme for Scheme interpretation in the browser (and a bunch of custom Scheme code to replicate most Racket functions), CodeMirror for the editor + syntax highlighting, and Marked.js for the markdown descriptions. 