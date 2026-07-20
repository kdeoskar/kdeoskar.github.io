document.addEventListener('DOMContentLoaded', function () {
    var STORAGE_KEYS = {
        rightLegacy: 'kdeoskar-notes-right',
        rightNotes: 'kdeoskar-notes-right-cards',
        todos: 'kdeoskar-notes-todos',
        groups: 'kdeoskar-notes-groups',
        showCompleted: 'kdeoskar-notes-show-completed'
    };

    var todoInput = document.getElementById('todoInput');
    var todoAddBtn = document.getElementById('todoAddBtn');
    var todoList = document.getElementById('todoList');
    var todoEmptyHint = document.getElementById('todoEmptyHint');
    var groupList = document.getElementById('groupList');
    var addGroupBtn = document.getElementById('addGroupBtn');
    var completedList = document.getElementById('completedList');
    var completedToggle = document.getElementById('completedToggle');
    var completedCount = document.getElementById('completedCount');
    var saveHint = document.getElementById('saveHint');
    var noteCards = document.getElementById('noteCards');
    var addNoteBtn = document.getElementById('addNoteBtn');
    var signInBtn = document.getElementById('signInBtn');
    var signOutBtn = document.getElementById('signOutBtn');
    var syncStatus = document.getElementById('syncStatus');

    var todos = [];
    var groups = [];
    var notes = [];
    var saveHintTimeout = null;
    var draggedTodoId = null;

    function makeId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function flashSaveHint() {
        saveHint.textContent = 'Saved';
        clearTimeout(saveHintTimeout);
        saveHintTimeout = setTimeout(function () {
            saveHint.textContent = '';
        }, 1200);
    }

    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(null, args); }, delay);
        };
    }

    function groupIdOf(todo) {
        return todo.groupId || null;
    }

    /* ---------- To-do list + groups ---------- */

    function loadTodos() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.todos);
            todos = raw ? JSON.parse(raw) : [];
        } catch (e) {
            todos = [];
        }
    }

    function loadGroups() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.groups);
            groups = raw ? JSON.parse(raw) : [];
        } catch (e) {
            groups = [];
        }
    }

    function persistTodos() {
        localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
        flashSaveHint();
        pushCloud('todos');
    }

    function persistGroups() {
        localStorage.setItem(STORAGE_KEYS.groups, JSON.stringify(groups));
        flashSaveHint();
        pushCloud('groups');
    }

    var persistTodosDebounced = debounce(persistTodos, 400);
    var persistGroupsDebounced = debounce(persistGroups, 400);

    function renderAll() {
        renderUngrouped();
        renderGroups();
        renderCompleted();
    }

    function renderUngrouped() {
        var active = todos.filter(function (t) { return !t.completed && groupIdOf(t) === null; });
        todoList.innerHTML = '';
        active.forEach(function (todo) {
            todoList.appendChild(buildTodoItem(todo));
        });
        todoEmptyHint.style.display = active.length ? 'none' : 'block';
    }

    function renderCompleted() {
        var completed = todos.filter(function (t) { return t.completed; });
        completedList.innerHTML = '';
        completed.forEach(function (todo) {
            completedList.appendChild(buildTodoItem(todo));
        });
        completedCount.textContent = completed.length;
    }

    function renderGroups() {
        groupList.innerHTML = '';
        groups.forEach(function (group) {
            groupList.appendChild(buildGroupCard(group));
        });
    }

    function buildGroupSelect(todo) {
        var select = document.createElement('select');
        select.className = 'todo-group-select';
        select.title = 'Move to group';

        var noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = 'No group';
        select.appendChild(noneOption);

        groups.forEach(function (group) {
            var option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name || 'Untitled';
            select.appendChild(option);
        });

        select.value = groupIdOf(todo) || '';
        select.addEventListener('change', function () {
            todo.groupId = select.value || null;
            persistTodos();
            renderAll();
        });
        select.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        return select;
    }

    function buildTodoItem(todo) {
        var li = document.createElement('li');
        li.className = 'todo-item' + (todo.completed ? ' completed' : '');
        li.draggable = false;
        li.dataset.id = todo.id;

        var handle = document.createElement('span');
        handle.className = 'todo-drag-handle';
        handle.textContent = '⠿';
        handle.title = 'Drag to reorder';
        handle.addEventListener('mousedown', function () {
            li.draggable = true;
        });
        handle.addEventListener('mouseup', function () {
            li.draggable = false;
        });

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', function () {
            todo.completed = checkbox.checked;
            persistTodos();
            renderAll();
        });

        var text = document.createElement('span');
        text.className = 'todo-text';
        text.contentEditable = 'true';
        text.spellcheck = false;
        text.textContent = todo.text;
        text.addEventListener('input', function () {
            todo.text = text.textContent;
            persistTodosDebounced();
        });
        text.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                text.blur();
            }
        });
        text.addEventListener('blur', function () {
            var trimmed = text.textContent.trim();
            if (!trimmed) {
                todos = todos.filter(function (t) { return t.id !== todo.id; });
                persistTodos();
                renderAll();
                return;
            }
            todo.text = trimmed;
            text.textContent = trimmed;
            persistTodos();
        });

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'todo-delete';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete task';
        deleteBtn.addEventListener('click', function () {
            todos = todos.filter(function (t) { return t.id !== todo.id; });
            persistTodos();
            renderAll();
        });

        li.appendChild(handle);
        li.appendChild(checkbox);
        li.appendChild(text);
        if (!todo.completed) {
            li.appendChild(buildGroupSelect(todo));
        }
        li.appendChild(deleteBtn);
        wireTodoDrag(li);
        return li;
    }

    function clearDragIndicators(container) {
        container.querySelectorAll('.todo-item').forEach(function (item) {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
    }

    function wireTodoDrag(li) {
        li.addEventListener('dragstart', function (e) {
            draggedTodoId = li.dataset.id;
            li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', li.dataset.id); } catch (err) { /* noop */ }
        });

        li.addEventListener('dragend', function () {
            draggedTodoId = null;
            li.draggable = false;
            li.classList.remove('dragging');
            clearDragIndicators(todoList);
            clearDragIndicators(completedList);
            groupList.querySelectorAll('.group-todo-list').forEach(clearDragIndicators);
        });

        li.addEventListener('dragover', function (e) {
            if (!draggedTodoId || draggedTodoId === li.dataset.id) return;
            var draggedTodo = todos.find(function (t) { return t.id === draggedTodoId; });
            var targetTodo = todos.find(function (t) { return t.id === li.dataset.id; });
            if (!draggedTodo || !targetTodo) return;
            if (draggedTodo.completed !== targetTodo.completed) return;
            if (groupIdOf(draggedTodo) !== groupIdOf(targetTodo)) return;

            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            var rect = li.getBoundingClientRect();
            var before = (e.clientY - rect.top) < rect.height / 2;
            li.classList.toggle('drag-over-top', before);
            li.classList.toggle('drag-over-bottom', !before);
        });

        li.addEventListener('dragleave', function () {
            li.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        li.addEventListener('drop', function (e) {
            e.preventDefault();
            var targetId = li.dataset.id;
            li.classList.remove('drag-over-top', 'drag-over-bottom');
            if (!draggedTodoId || draggedTodoId === targetId) return;

            var draggedIndex = todos.findIndex(function (t) { return t.id === draggedTodoId; });
            var targetIndex = todos.findIndex(function (t) { return t.id === targetId; });
            if (draggedIndex === -1 || targetIndex === -1) return;
            if (todos[draggedIndex].completed !== todos[targetIndex].completed) return;
            if (groupIdOf(todos[draggedIndex]) !== groupIdOf(todos[targetIndex])) return;

            var rect = li.getBoundingClientRect();
            var before = (e.clientY - rect.top) < rect.height / 2;

            var dragged = todos.splice(draggedIndex, 1)[0];
            targetIndex = todos.findIndex(function (t) { return t.id === targetId; });
            var insertAt = before ? targetIndex : targetIndex + 1;
            todos.splice(insertAt, 0, dragged);

            persistTodos();
            renderAll();
        });
    }

    function addTodo(text, groupId) {
        var trimmed = text.trim();
        if (!trimmed) return;
        todos.push({ id: makeId(), text: trimmed, completed: false, groupId: groupId || null });
        persistTodos();
        renderAll();
    }

    todoAddBtn.addEventListener('click', function () {
        addTodo(todoInput.value, null);
        todoInput.value = '';
    });
    todoInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTodo(todoInput.value, null);
            todoInput.value = '';
        }
    });

    completedToggle.addEventListener('change', function () {
        completedList.classList.toggle('show', completedToggle.checked);
        localStorage.setItem(STORAGE_KEYS.showCompleted, completedToggle.checked ? '1' : '0');
    });

    /* ---------- Groups ---------- */

    function buildGroupCard(group) {
        var card = document.createElement('div');
        card.className = 'group-card' + (group.collapsed ? ' collapsed' : '');
        card.dataset.id = group.id;

        var header = document.createElement('div');
        header.className = 'group-header';

        var collapseBtn = document.createElement('button');
        collapseBtn.className = 'group-collapse-btn';
        collapseBtn.title = 'Collapse/expand group';
        collapseBtn.innerHTML = '<span class="arrow">▶</span>';
        collapseBtn.addEventListener('click', function () {
            group.collapsed = !group.collapsed;
            card.classList.toggle('collapsed', group.collapsed);
            persistGroups();
        });

        var nameEl = document.createElement('span');
        nameEl.className = 'group-name';
        nameEl.contentEditable = 'true';
        nameEl.spellcheck = false;
        nameEl.dataset.placeholder = 'Group name';
        nameEl.textContent = group.name;
        nameEl.addEventListener('input', function () {
            group.name = nameEl.textContent;
            persistGroupsDebounced();
        });
        nameEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameEl.blur();
            }
        });
        nameEl.addEventListener('blur', function () {
            var trimmed = nameEl.textContent.trim() || 'Untitled';
            group.name = trimmed;
            nameEl.textContent = trimmed;
            persistGroups();
            renderUngrouped();
            renderCompleted();
        });

        var groupTodos = todos.filter(function (t) { return groupIdOf(t) === group.id && !t.completed; });
        var count = document.createElement('span');
        count.className = 'group-count';
        count.textContent = '(' + groupTodos.length + ')';

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'group-delete';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete group';
        deleteBtn.addEventListener('click', function () {
            todos.forEach(function (t) {
                if (groupIdOf(t) === group.id) t.groupId = null;
            });
            groups = groups.filter(function (g) { return g.id !== group.id; });
            persistTodos();
            persistGroups();
            renderAll();
        });

        header.appendChild(collapseBtn);
        header.appendChild(nameEl);
        header.appendChild(count);
        header.appendChild(deleteBtn);

        var body = document.createElement('div');
        body.className = 'group-body';

        var list = document.createElement('ul');
        list.className = 'todo-list group-todo-list';
        groupTodos.forEach(function (todo) {
            list.appendChild(buildTodoItem(todo));
        });

        var emptyHint = document.createElement('p');
        emptyHint.className = 'group-empty';
        emptyHint.textContent = 'No tasks in this group.';
        emptyHint.style.display = groupTodos.length ? 'none' : 'block';

        var addRow = document.createElement('div');
        addRow.className = 'group-add-task-row';

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'group-todo-input';
        input.placeholder = 'Add task to this group...';

        var addBtn = document.createElement('button');
        addBtn.className = 'group-todo-add-btn';
        addBtn.textContent = 'Add';

        function submit() {
            addTodo(input.value, group.id);
            input.value = '';
        }
        addBtn.addEventListener('click', submit);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submit();
            }
        });

        addRow.appendChild(input);
        addRow.appendChild(addBtn);

        body.appendChild(list);
        body.appendChild(emptyHint);
        body.appendChild(addRow);

        card.appendChild(header);
        card.appendChild(body);
        return card;
    }

    addGroupBtn.addEventListener('click', function () {
        var group = { id: makeId(), name: 'New Group', collapsed: false };
        groups.push(group);
        persistGroups();
        renderGroups();
        var nameEl = groupList.querySelector('.group-card[data-id="' + group.id + '"] .group-name');
        if (nameEl) {
            var range = document.createRange();
            range.selectNodeContents(nameEl);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            nameEl.focus();
        }
    });

    /* ---------- Right box: dated note cards ---------- */

    function todayLabel() {
        return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function loadNotes() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.rightNotes);
            notes = raw ? JSON.parse(raw) : null;
        } catch (e) {
            notes = null;
        }

        if (notes === null) {
            var legacy = localStorage.getItem(STORAGE_KEYS.rightLegacy);
            notes = [];
            if (legacy) {
                notes.push({ id: makeId(), date: todayLabel(), text: legacy });
            }
        }
    }

    function persistNotes() {
        localStorage.setItem(STORAGE_KEYS.rightNotes, JSON.stringify(notes));
        flashSaveHint();
        pushCloud('notes');
    }

    var persistNotesDebounced = debounce(persistNotes, 400);

    function renderNotes() {
        noteCards.innerHTML = '';
        notes.forEach(function (note) {
            noteCards.appendChild(buildNoteCard(note));
        });
    }

    function buildNoteCard(note) {
        var card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.id = note.id;

        var header = document.createElement('div');
        header.className = 'note-card-header';

        var dateEl = document.createElement('span');
        dateEl.className = 'note-date';
        dateEl.contentEditable = 'true';
        dateEl.spellcheck = false;
        dateEl.dataset.placeholder = 'Date';
        dateEl.textContent = note.date;
        dateEl.addEventListener('input', function () {
            note.date = dateEl.textContent;
            persistNotesDebounced();
        });
        dateEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                dateEl.blur();
            }
        });
        dateEl.addEventListener('blur', function () {
            if (!dateEl.textContent.trim()) dateEl.innerHTML = '';
            note.date = dateEl.textContent;
            persistNotes();
        });

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-delete';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete note';
        deleteBtn.addEventListener('click', function () {
            notes = notes.filter(function (n) { return n.id !== note.id; });
            persistNotes();
            renderNotes();
        });

        header.appendChild(dateEl);
        header.appendChild(deleteBtn);

        var body = document.createElement('div');
        body.className = 'note-body';
        body.contentEditable = 'true';
        body.dataset.placeholder = 'Write something...';
        body.innerHTML = note.text;
        body.addEventListener('input', function () {
            note.text = body.innerHTML;
            persistNotesDebounced();
        });
        body.addEventListener('blur', function () {
            if (!body.textContent.trim()) body.innerHTML = '';
            note.text = body.innerHTML;
            persistNotes();
        });

        card.appendChild(header);
        card.appendChild(body);
        return card;
    }

    addNoteBtn.addEventListener('click', function () {
        var note = { id: makeId(), date: todayLabel(), text: '' };
        notes.unshift(note);
        persistNotes();
        renderNotes();
        var card = noteCards.querySelector('.note-card[data-id="' + note.id + '"] .note-body');
        if (card) card.focus();
    });

    /* ---------- Cloud sync (Firebase) ---------- */

    var firebaseReady = !!(window.firebase && window.FIREBASE_CONFIG &&
        window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey.indexOf('YOUR_') !== 0);
    var auth = null;
    var db = null;
    var currentUser = null;
    var cloudUnsubscribers = [];

    if (firebaseReady) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();
        if (window.FIREBASE_USE_EMULATORS) {
            auth.useEmulator('http://127.0.0.1:9099');
            db.useEmulator('127.0.0.1', 8080);
        }
    }

    function userDocRef(kind) {
        return db.collection('users').doc(currentUser.uid).collection('data').doc(kind);
    }

    function localArrayFor(kind) {
        if (kind === 'todos') return todos;
        if (kind === 'groups') return groups;
        return notes;
    }

    function pushCloud(kind) {
        if (!currentUser) return;
        userDocRef(kind).set({ items: localArrayFor(kind) }).catch(function (err) {
            console.error('Cloud save failed (' + kind + '):', err);
        });
    }

    function syncDoc(kind, setLocal, rerender) {
        var ref = userDocRef(kind);

        // Resolve whether this is a first-ever sign-in (no cloud doc yet,
        // so migrate current local data up) BEFORE attaching the listener.
        // Attaching onSnapshot first would race the migration write: the
        // emulator/server can report "document doesn't exist" first,
        // which would wipe local data on the client rather than wait.
        ref.get().then(function (snap) {
            if (!snap.exists) {
                return ref.set({ items: localArrayFor(kind) });
            }
        }).catch(function (err) {
            console.error('Cloud init failed (' + kind + '):', err);
        }).then(function () {
            var unsub = ref.onSnapshot(function (snap) {
                var data = snap.data();
                var incoming = data ? data.items : [];
                // Skip if this is just our own write echoing back — avoids
                // blowing away an in-progress edit/focus for a no-op update.
                if (JSON.stringify(incoming) === JSON.stringify(localArrayFor(kind))) return;
                setLocal(incoming);
                rerender();
            }, function (err) {
                console.error('Cloud sync failed (' + kind + '):', err);
            });
            cloudUnsubscribers.push(unsub);
        });
    }

    function startCloudSync() {
        stopCloudSync();
        syncDoc('todos', function (items) { todos = items || []; }, renderAll);
        syncDoc('groups', function (items) { groups = items || []; }, renderAll);
        syncDoc('notes', function (items) { notes = items || []; }, renderNotes);
    }

    function stopCloudSync() {
        cloudUnsubscribers.forEach(function (unsub) { unsub(); });
        cloudUnsubscribers = [];
    }

    if (firebaseReady) {
        signInBtn.style.display = '';

        signInBtn.addEventListener('click', function () {
            var provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(function (err) {
                console.error('Sign-in failed:', err);
                syncStatus.textContent = 'Sign-in failed';
            });
        });

        signOutBtn.addEventListener('click', function () {
            auth.signOut();
        });

        auth.onAuthStateChanged(function (user) {
            currentUser = user;
            if (user) {
                signInBtn.style.display = 'none';
                signOutBtn.style.display = '';
                syncStatus.textContent = 'Synced as ' + (user.displayName || user.email || 'you');
                startCloudSync();
            } else {
                signInBtn.style.display = '';
                signOutBtn.style.display = 'none';
                syncStatus.textContent = '';
                stopCloudSync();
            }
        });
    }

    /* ---------- Init ---------- */

    loadTodos();
    loadGroups();
    renderAll();
    completedToggle.checked = localStorage.getItem(STORAGE_KEYS.showCompleted) === '1';
    completedList.classList.toggle('show', completedToggle.checked);

    loadNotes();
    renderNotes();

    window.addEventListener('beforeunload', function () {
        localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
        localStorage.setItem(STORAGE_KEYS.groups, JSON.stringify(groups));
        localStorage.setItem(STORAGE_KEYS.rightNotes, JSON.stringify(notes));
        if (currentUser) {
            pushCloud('todos');
            pushCloud('groups');
            pushCloud('notes');
        }
    });
});
