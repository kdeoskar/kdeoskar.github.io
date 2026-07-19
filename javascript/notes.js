document.addEventListener('DOMContentLoaded', function () {
    var STORAGE_KEYS = {
        left: 'kdeoskar-notes-left',
        right: 'kdeoskar-notes-right',
        todos: 'kdeoskar-notes-todos',
        showCompleted: 'kdeoskar-notes-show-completed'
    };

    var leftNotes = document.getElementById('leftNotes');
    var rightNotes = document.getElementById('rightNotes');
    var todoInput = document.getElementById('todoInput');
    var todoAddBtn = document.getElementById('todoAddBtn');
    var todoList = document.getElementById('todoList');
    var todoEmptyHint = document.getElementById('todoEmptyHint');
    var completedList = document.getElementById('completedList');
    var completedToggle = document.getElementById('completedToggle');
    var completedCount = document.getElementById('completedCount');
    var saveHint = document.getElementById('saveHint');

    var todos = [];
    var saveHintTimeout = null;

    function loadTodos() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.todos);
            todos = raw ? JSON.parse(raw) : [];
        } catch (e) {
            todos = [];
        }
    }

    function persistTodos() {
        localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
        flashSaveHint();
    }

    function flashSaveHint() {
        saveHint.textContent = 'Saved';
        clearTimeout(saveHintTimeout);
        saveHintTimeout = setTimeout(function () {
            saveHint.textContent = '';
        }, 1200);
    }

    function makeId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function renderTodos() {
        var active = todos.filter(function (t) { return !t.completed; });
        var completed = todos.filter(function (t) { return t.completed; });

        todoList.innerHTML = '';
        active.forEach(function (todo) {
            todoList.appendChild(buildTodoItem(todo));
        });
        todoEmptyHint.style.display = active.length ? 'none' : 'block';

        completedList.innerHTML = '';
        completed.forEach(function (todo) {
            completedList.appendChild(buildTodoItem(todo));
        });
        completedCount.textContent = completed.length;
    }

    function buildTodoItem(todo) {
        var li = document.createElement('li');
        li.className = 'todo-item' + (todo.completed ? ' completed' : '');

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', function () {
            todo.completed = checkbox.checked;
            persistTodos();
            renderTodos();
        });

        var span = document.createElement('span');
        span.textContent = todo.text;

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'todo-delete';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete task';
        deleteBtn.addEventListener('click', function () {
            todos = todos.filter(function (t) { return t.id !== todo.id; });
            persistTodos();
            renderTodos();
        });

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteBtn);
        return li;
    }

    function addTodo() {
        var text = todoInput.value.trim();
        if (!text) return;
        todos.push({ id: makeId(), text: text, completed: false });
        todoInput.value = '';
        persistTodos();
        renderTodos();
    }

    todoAddBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTodo();
        }
    });

    completedToggle.addEventListener('change', function () {
        completedList.classList.toggle('show', completedToggle.checked);
        localStorage.setItem(STORAGE_KEYS.showCompleted, completedToggle.checked ? '1' : '0');
    });

    function debounce(fn, delay) {
        var timer = null;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        };
    }

    function wireEditable(el, key) {
        var saved = localStorage.getItem(key);
        if (saved !== null) {
            el.innerHTML = saved;
        }
        var save = debounce(function () {
            localStorage.setItem(key, el.innerHTML);
            flashSaveHint();
        }, 400);
        el.addEventListener('input', save);
    }

    loadTodos();
    renderTodos();
    completedToggle.checked = localStorage.getItem(STORAGE_KEYS.showCompleted) === '1';
    completedList.classList.toggle('show', completedToggle.checked);

    wireEditable(leftNotes, STORAGE_KEYS.left);
    wireEditable(rightNotes, STORAGE_KEYS.right);
});
