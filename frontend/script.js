
const API_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "studysprint_token";

const token = () => localStorage.getItem(TOKEN_KEY);

function redirectToLogin() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "login.html";
}

// --------------------------------------------------
// LOGIN PAGE
// --------------------------------------------------

const authForm = document.getElementById("authForm");

if (authForm) {
    const authEmail = document.getElementById("authEmail");
    const authPassword = document.getElementById("authPassword");
    const authSubmit = document.getElementById("authSubmit");
    const authMessage = document.getElementById("authMessage");
    const showLogin = document.getElementById("showLogin");
    const showRegister = document.getElementById("showRegister");

    let authMode = "login";

    if (token()) {
        window.location.href = "index.html";
    }

    showLogin.addEventListener("click", function () {
        authMode = "login";
        authSubmit.textContent = "Log In";
        authMessage.textContent = "";
    });

    showRegister.addEventListener("click", function () {
        authMode = "register";
        authSubmit.textContent = "Create Account";
        authMessage.textContent = "";
    });

    authForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = authEmail.value.trim();
        const password = authPassword.value;

        authSubmit.disabled = true;
        authMessage.textContent = "Please wait...";

        try {
            const response = await fetch(
                `${API_URL}/${authMode === "login" ? "login" : "register"}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                authMessage.textContent =
                    data.detail || "Something went wrong. Please try again.";
                return;
            }

            if (authMode === "register") {
                authMessage.textContent =
                    "Account created! You can now log in.";

                authMode = "login";
                authSubmit.textContent = "Log In";
                authPassword.value = "";
                return;
            }

            localStorage.setItem(TOKEN_KEY, data.access_token);

            authMessage.textContent =
                "Login successful! Opening your dashboard...";

            window.location.href = "index.html";

        } catch (error) {
            authMessage.textContent =
                "Couldn't connect to the server. Make sure StudySprint's backend is running.";

        } finally {
            authSubmit.disabled = false;
        }
    });
}

// --------------------------------------------------
// SHARED TASK MANAGEMENT
// --------------------------------------------------

const taskForm = document.getElementById("taskForm");

if (taskForm) {
    const taskTitle = document.getElementById("taskTitle");
    const taskDescription = document.getElementById("taskDescription");
    const taskPriority = document.getElementById("taskPriority");
    const taskDueDate = document.getElementById("taskDueDate");
    const taskList = document.getElementById("taskList");

    // Dashboard statistics (only present on dashboard).
    const totalTasks = document.getElementById("totalTasks");
    const completedTasks = document.getElementById("completedTasks");
    const remainingTasks = document.getElementById("remainingTasks");

    // Logout button.
    const logoutButton = document.getElementById("logoutButton");

    // Calendar elements (only present on calendar/dashboard pages).
    const calendarGrid = document.getElementById("calendarGrid");
    const calendarMonth = document.getElementById("calendarMonth");
    const previousWeekButton = document.getElementById("previousWeek");
    const nextWeekButton = document.getElementById("nextWeek");
    const unscheduledTasks = document.getElementById("unscheduledTasks");

    // Weekly progress elements.
    const weeklyProgressPercentage =
        document.getElementById("weeklyProgressPercentage");
    const weeklyProgressBar =
        document.getElementById("weeklyProgressBar");
    const weeklyCompleted =
        document.getElementById("weeklyCompleted");
    const weeklyRemaining =
        document.getElementById("weeklyRemaining");
    const weeklyTotal =
        document.getElementById("weeklyTotal");

    // --------------------------------------------------
    // DATE HELPERS
    // --------------------------------------------------

    function getMonday(date) {
        const monday = new Date(date);
        monday.setHours(0, 0, 0, 0);

        const day = monday.getDay();
        const difference = day === 0 ? -6 : 1 - day;

        monday.setDate(monday.getDate() + difference);
        return monday;
    }

    let currentWeekStart = getMonday(new Date());

    function formatDate(dateString) {
        if (!dateString) return "";

        const [year, month, day] = dateString.split("-").map(Number);

        return new Date(year, month - 1, day).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    }

    function getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    // --------------------------------------------------
    // HELPER FUNCTIONS
    // --------------------------------------------------

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    function showMessage(message) {
        if (!taskList) return;

        taskList.replaceChildren();

        const paragraph = createElement("p", "empty-message", message);
        taskList.appendChild(paragraph);
    }

    function updateStats(tasks) {
        if (totalTasks) {
            totalTasks.textContent = tasks.length;
        }

        const completed = tasks.filter(task => task.completed).length;

        if (completedTasks) {
            completedTasks.textContent = completed;
        }

        if (remainingTasks) {
            remainingTasks.textContent = tasks.length - completed;
        }
    }

    // --------------------------------------------------
    // WEEKLY PROGRESS
    // --------------------------------------------------

    function updateWeeklyProgress(tasks) {
        if (
            !weeklyProgressPercentage ||
            !weeklyProgressBar ||
            !weeklyCompleted ||
            !weeklyRemaining ||
            !weeklyTotal
        ) {
            return;
        }

        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startKey = getDateKey(currentWeekStart);
        const endKey = getDateKey(weekEnd);

        const weeklyTasks = tasks.filter(task =>
            task.due_date &&
            task.due_date >= startKey &&
            task.due_date <= endKey
        );

        const total = weeklyTasks.length;

        const completed = weeklyTasks.filter(
            task => task.completed
        ).length;

        const remaining = total - completed;

        const percentage = total === 0
            ? 0
            : Math.round((completed / total) * 100);

        weeklyCompleted.textContent = completed;
        weeklyRemaining.textContent = remaining;
        weeklyTotal.textContent = total;
        weeklyProgressPercentage.textContent = `${percentage}%`;

        weeklyProgressBar.style.width = `${percentage}%`;
        weeklyProgressBar.setAttribute("aria-valuenow", percentage);
    }

    // --------------------------------------------------
    // WEEKLY CALENDAR
    // --------------------------------------------------

    function jumpToTask(taskId) {
        const taskCard = document.getElementById(`task-${taskId}`);

        if (taskCard) {
            taskCard.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            taskCard.focus({ preventScroll: true });
        }
    }

    function renderCalendar(tasks) {
        // Do nothing on pages without a calendar.
        if (
            !calendarGrid ||
            !calendarMonth ||
            !unscheduledTasks
        ) {
            return;
        }

        calendarGrid.replaceChildren();
        unscheduledTasks.replaceChildren();

        updateWeeklyProgress(tasks);

        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startLabel = currentWeekStart.toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short" }
        );

        const endLabel = weekEnd.toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short", year: "numeric" }
        );

        calendarMonth.textContent = `${startLabel} – ${endLabel}`;

        const dayNames = [
            "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday", "Sunday"
        ];

        const todayKey = getDateKey(new Date());

        dayNames.forEach((dayName, index) => {
            const date = new Date(currentWeekStart);
            date.setDate(date.getDate() + index);

            const dateKey = getDateKey(date);

            const dayTasks = tasks.filter(
                task => task.due_date === dateKey
            );

            const dayCard = createElement(
                "div",
                dateKey === todayKey ? "calendar-day today" : "calendar-day"
            );

            const heading = createElement(
                "h4",
                "",
                `${dayName} ${date.getDate()}`
            );

            dayCard.appendChild(heading);

            if (dayTasks.length === 0) {
                dayCard.appendChild(
                    createElement("p", "calendar-empty", "No tasks")
                );
            }

            dayTasks.forEach(task => {
                const taskButton = createElement(
                    "button",
                    task.completed
                        ? "calendar-task completed"
                        : "calendar-task",
                    task.title
                );

                taskButton.type = "button";
                taskButton.title = "Click to view this task";

                taskButton.addEventListener("click", () => {
                    jumpToTask(task.id);
                });

                dayCard.appendChild(taskButton);
            });

            calendarGrid.appendChild(dayCard);
        });

        // Tasks without due dates.
        const tasksWithoutDates = tasks.filter(task => !task.due_date);

        if (tasksWithoutDates.length === 0) {
            unscheduledTasks.appendChild(
                createElement("p", "", "No unscheduled tasks. 🌱")
            );
        } else {
            tasksWithoutDates.forEach(task => {
                const taskButton = createElement(
                    "button",
                    task.completed
                        ? "calendar-task completed"
                        : "calendar-task",
                    task.title
                );

                taskButton.type = "button";

                taskButton.addEventListener("click", () => {
                    jumpToTask(task.id);
                });

                unscheduledTasks.appendChild(taskButton);
            });
        }
    }

    // Calendar navigation only when those buttons exist.
    if (previousWeekButton) {
        previousWeekButton.addEventListener("click", function () {
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
            loadTasks();
        });
    }

    if (nextWeekButton) {
        nextWeekButton.addEventListener("click", function () {
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            loadTasks();
        });
    }

    // --------------------------------------------------
    // EDIT TASK
    // --------------------------------------------------

    function openEditPanel(card, task) {
        if (card.querySelector(".edit-form")) return;

        const editForm = createElement("div", "edit-form");

        const titleLabel = createElement("label", "", "Task title");
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.value = task.title;
        titleInput.maxLength = 150;
        titleInput.required = true;
        titleLabel.appendChild(titleInput);

        const descriptionLabel = createElement("label", "", "Description");
        const descriptionInput = document.createElement("textarea");
        descriptionInput.value = task.description || "";
        descriptionInput.maxLength = 1000;
        descriptionInput.rows = 3;
        descriptionLabel.appendChild(descriptionInput);

        const priorityLabel = createElement("label", "", "Priority");
        const prioritySelect = document.createElement("select");

        ["Low", "Medium", "High"].forEach(priority => {
            const option = document.createElement("option");
            option.value = priority;
            option.textContent = priority;
            prioritySelect.appendChild(option);
        });

        prioritySelect.value = task.priority || "Medium";
        priorityLabel.appendChild(prioritySelect);

        const dateLabel = createElement("label", "", "Due date");
        const dateInput = document.createElement("input");
        dateInput.type = "date";
        dateInput.value = task.due_date || "";
        dateLabel.appendChild(dateInput);

        const actions = createElement("div", "edit-actions");

        const saveButton = createElement(
            "button", "save-edit-button", "Save Changes"
        );
        saveButton.type = "button";

        const cancelButton = createElement(
            "button", "cancel-edit-button", "Cancel"
        );
        cancelButton.type = "button";

        actions.append(saveButton, cancelButton);

        editForm.append(
            titleLabel,
            descriptionLabel,
            priorityLabel,
            dateLabel,
            actions
        );

        card.appendChild(editForm);

        cancelButton.addEventListener("click", () => editForm.remove());

        saveButton.addEventListener("click", async function () {
            const title = titleInput.value.trim();
            const description = descriptionInput.value.trim();
            const priority = prioritySelect.value;
            const due_date = dateInput.value || null;

            if (!title) {
                alert("Task title cannot be empty.");
                titleInput.focus();
                return;
            }

            saveButton.disabled = true;
            cancelButton.disabled = true;
            saveButton.textContent = "Saving...";

            try {
                const response = await fetch(`${API_URL}/tasks/${task.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token()}`
                    },
                    body: JSON.stringify({
                        title, description, priority, due_date
                    })
                });

                if (!response.ok) {
                    throw new Error("Could not update task");
                }

                await loadTasks();

            } catch (error) {
                alert("Couldn't save your changes. Please try again.");
                saveButton.disabled = false;
                cancelButton.disabled = false;
                saveButton.textContent = "Save Changes";
            }
        });
    }

    // --------------------------------------------------
    // DISPLAY TASKS
    // --------------------------------------------------

    function displayTasks(tasks) {
        if (taskList) {
            taskList.replaceChildren();
        }

        updateStats(tasks);
        renderCalendar(tasks);

        if (!taskList) return;

        if (tasks.length === 0) {
            showMessage("Your study journey starts here. Add your first task!");
            return;
        }

        tasks.forEach(task => {
            const card = createElement(
                "article",
                task.completed ? "task-card completed" : "task-card"
            );

            card.id = `task-${task.id}`;
            card.tabIndex = -1;

            const title = createElement("h3", "", task.title);

            const description = createElement(
                "p", "", task.description || "No description added."
            );

            const priority = task.priority || "Medium";

            const priorityBadge = createElement(
                "span",
                `priority-badge priority-${priority.toLowerCase()}`,
                `${priority} Priority`
            );

            const dueDateDisplay = createElement(
                "p",
                "task-due-date",
                task.due_date
                    ? `📅 Due: ${formatDate(task.due_date)}`
                    : "📅 No due date assigned"
            );

            const editButton = createElement(
                "button", "edit-button", "✏️ Edit"
            );

            editButton.type = "button";
            editButton.addEventListener("click", () => {
                openEditPanel(card, task);
            });

            const completeLabel = createElement("label", "complete-label");

            const completeCheckbox = document.createElement("input");
            completeCheckbox.type = "checkbox";
            completeCheckbox.className = "complete-checkbox";
            completeCheckbox.checked = Boolean(task.completed);

            completeCheckbox.setAttribute(
                "aria-label",
                `Mark ${task.title} as completed`
            );

            completeCheckbox.addEventListener("change", async function () {
                completeCheckbox.disabled = true;

                try {
                    const response = await fetch(
                        `${API_URL}/tasks/${task.id}/complete`,
                        {
                            method: "PATCH",
                            headers: {
                                Authorization: `Bearer ${token()}`
                            }
                        }
                    );

                    if (!response.ok) throw new Error();

                    await loadTasks();

                } catch (error) {
                    completeCheckbox.checked = !completeCheckbox.checked;
                    completeCheckbox.disabled = false;
                    alert("Couldn't update the task. Please try again.");
                }
            });

            completeLabel.append(completeCheckbox, " Mark complete");

            const deleteButton = createElement(
                "button", "delete-button", "🗑 Delete"
            );

            deleteButton.type = "button";

            deleteButton.addEventListener("click", async function () {
                if (!confirm("Are you sure you want to delete this task?")) {
                    return;
                }

                deleteButton.disabled = true;

                try {
                    const response = await fetch(
                        `${API_URL}/tasks/${task.id}`,
                        {
                            method: "DELETE",
                            headers: {
                                Authorization: `Bearer ${token()}`
                            }
                        }
                    );

                    if (!response.ok) throw new Error();

                    await loadTasks();

                } catch (error) {
                    alert("Couldn't delete the task. Please try again.");
                    deleteButton.disabled = false;
                }
            });

            card.append(
                title,
                description,
                priorityBadge,
                dueDateDisplay,
                editButton,
                completeLabel,
                deleteButton
            );

            taskList.appendChild(card);
        });
    }

    // --------------------------------------------------
    // LOAD TASKS
    // --------------------------------------------------

    async function loadTasks() {
        try {
            const response = await fetch(`${API_URL}/tasks`, {
                headers: {
                    Authorization: `Bearer ${token()}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
                return;
            }

            if (!response.ok) {
                showMessage("Couldn't load your tasks. Please try again.");
                return;
            }

            const tasks = await response.json();
            displayTasks(tasks);

        } catch (error) {
            showMessage(
                "Couldn't connect to StudySprint's server. Make sure the backend is running."
            );
        }
    }

    // --------------------------------------------------
    // ADD NEW TASK
    // --------------------------------------------------

    taskForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const title = taskTitle.value.trim();
        const description = taskDescription.value.trim();
        const priority = taskPriority.value;
        const due_date = taskDueDate.value || null;

        if (!title) return;

        try {
            const response = await fetch(`${API_URL}/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token()}`
                },
                body: JSON.stringify({
                    title, description, priority, due_date
                })
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
                return;
            }

            if (!response.ok) {
                showMessage("Couldn't save your task. Please try again.");
                return;
            }

            taskForm.reset();
            await loadTasks();

        } catch (error) {
            showMessage("Couldn't connect to the server.");
        }
    });

    // --------------------------------------------------
    // LOG OUT
    // --------------------------------------------------

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "login.html";
        });
    }

    // --------------------------------------------------
    // START PAGE
    // --------------------------------------------------

    async function startPage() {
        if (!token()) {
            redirectToLogin();
            return;
        }

        try {
            const response = await fetch(`${API_URL}/me`, {
                headers: {
                    Authorization: `Bearer ${token()}`
                }
            });

            if (!response.ok) {
                redirectToLogin();
                return;
            }

            await loadTasks();

        } catch (error) {
            showMessage(
                "Couldn't connect to StudySprint's server. Make sure the backend is running."
            );
        }
    }

    startPage();
}

// --------------------------------------------------
// LOGOUT ON PAGES WITHOUT A TASK FORM
// --------------------------------------------------

const standaloneLogoutButton = document.getElementById("logoutButton");

if (!taskForm && standaloneLogoutButton) {
    standaloneLogoutButton.addEventListener("click", function () {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "login.html";
    });
}

// --------------------------------------------------
// STANDALONE CALENDAR PAGE
// --------------------------------------------------

const standaloneCalendar = document.getElementById("calendarGrid");

if (standaloneCalendar && !taskForm) {
    const weekTitle = document.getElementById("calendarWeekTitle");
    const previousButton = document.getElementById("previousWeekButton");
    const nextButton = document.getElementById("nextWeekButton");
    const unscheduledContainer = document.getElementById("unscheduledTasks");

    function calendarMonday(date) {
        const monday = new Date(date);
        monday.setHours(0, 0, 0, 0);
        const day = monday.getDay();
        monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
        return monday;
    }

    function calendarDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    let standaloneWeek = calendarMonday(new Date());

    async function renderStandaloneCalendar() {
        try {
            const response = await fetch(`${API_URL}/tasks`, {
                headers: {
                    Authorization: `Bearer ${token()}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
                return;
            }

            if (!response.ok) {
                throw new Error("Could not load tasks");
            }

            const tasks = await response.json();

            standaloneCalendar.replaceChildren();
            unscheduledContainer.replaceChildren();

            const weekEnd = new Date(standaloneWeek);
            weekEnd.setDate(weekEnd.getDate() + 6);

            weekTitle.textContent =
                `${standaloneWeek.toLocaleDateString("en-IN", {
                    day: "numeric", month: "short"
                })} – ${weekEnd.toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric"
                })}`;

            const dayNames = [
                "Monday", "Tuesday", "Wednesday",
                "Thursday", "Friday", "Saturday", "Sunday"
            ];

            const today = calendarDateKey(new Date());

            dayNames.forEach((dayName, index) => {
                const date = new Date(standaloneWeek);
                date.setDate(date.getDate() + index);

                const dateKey = calendarDateKey(date);

                const dayCard = document.createElement("div");
                dayCard.className =
                    dateKey === today ? "calendar-day today" : "calendar-day";

                const heading = document.createElement("h4");
                heading.textContent = `${dayName} ${date.getDate()}`;
                dayCard.appendChild(heading);

                const dayTasks = tasks.filter(
                    task => task.due_date === dateKey
                );

                if (dayTasks.length === 0) {
                    const empty = document.createElement("p");
                    empty.textContent = "No tasks";
                    dayCard.appendChild(empty);
                }

                dayTasks.forEach(task => {
                    const item = document.createElement("div");
                    item.className = task.completed
                        ? "calendar-task completed"
                        : "calendar-task";
                    item.textContent = task.title;
                    dayCard.appendChild(item);
                });

                standaloneCalendar.appendChild(dayCard);
            });

            const unscheduled = tasks.filter(task => !task.due_date);

            if (unscheduled.length === 0) {
                unscheduledContainer.textContent = "No unscheduled tasks. 🌱";
            } else {
                unscheduled.forEach(task => {
                    const item = document.createElement("p");
                    item.className = "calendar-task";
                    item.textContent = task.title;
                    unscheduledContainer.appendChild(item);
                });
            }

        } catch (error) {
            standaloneCalendar.textContent =
                "Couldn't load your calendar. Please try again.";
        }
    }

    previousButton.addEventListener("click", () => {
        standaloneWeek.setDate(standaloneWeek.getDate() - 7);
        renderStandaloneCalendar();
    });

    nextButton.addEventListener("click", () => {
        standaloneWeek.setDate(standaloneWeek.getDate() + 7);
        renderStandaloneCalendar();
    });

    if (!token()) {
        redirectToLogin();
    } else {
        renderStandaloneCalendar();
    }
}

// ===============================
// MY PROGRESS PAGE
// ===============================

const progressPage = document.getElementById("progressTotalTasks");

if (progressPage) {
    async function loadProgress() {
        const progressToken = token();

        if (!progressToken) {
            redirectToLogin();
            return;
        }

        try {
            const response = await fetch(`${API_URL}/tasks`, {
                headers: {
                    "Authorization": `Bearer ${progressToken}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
                return;
            }

            if (!response.ok) {
                throw new Error("Could not load tasks.");
            }

            const tasks = await response.json();

            const total = tasks.length;
            const completed = tasks.filter(task => task.completed).length;
            const remaining = total - completed;

            const percentage = total === 0
                ? 0
                : Math.round((completed / total) * 100);

            document.getElementById("progressTotalTasks").textContent = total;
            document.getElementById("progressCompletedTasks").textContent = completed;
            document.getElementById("progressRemainingTasks").textContent = remaining;

            document.getElementById("overallProgressBar").style.width =
                `${percentage}%`;

            document.getElementById("overallProgressText").textContent =
                `${percentage}% completed`;

            const message = document.getElementById("productivityMessage");

            if (total === 0) {
                message.textContent =
                    "Your journey starts here. Add your first task! 🌱";
            } else if (percentage === 100) {
                message.textContent =
                    "Amazing! You've completed all your tasks. Keep it up! ✨";
            } else if (percentage >= 50) {
                message.textContent =
                    "You're making great progress. Keep going! 🍵";
            } else {
                message.textContent =
                    "Every completed task is a step forward. You've got this! 🌿";
            }

        } catch (error) {
            console.error("Progress error:", error);
            document.getElementById("productivityMessage").textContent =
                "Unable to load your progress. Please refresh the page.";
        }
    }

    loadProgress();
}

// ======================================
// DASHBOARD DATA
// ======================================

const dashboardPage = document.getElementById("dashboardProgressBar");

if (dashboardPage) {

    async function loadDashboard() {

        if (!token()) {
            redirectToLogin();
            return;
        }

        try {
            const response = await fetch(`${API_URL}/tasks`, {
                headers: {
                    Authorization: `Bearer ${token()}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to load tasks");
            }

            const tasks = await response.json();

            // Overall statistics
            const total = tasks.length;
            const completed = tasks.filter(task => task.completed).length;
            const remaining = total - completed;

            const percentage = total === 0
                ? 0
                : Math.round((completed / total) * 100);

            document.getElementById("totalTasks").textContent = total;
            document.getElementById("completedTasks").textContent = completed;
            document.getElementById("remainingTasks").textContent = remaining;

            // Overall progress bar
            const overallBar = document.getElementById("dashboardProgressBar");

            overallBar.style.width = `${percentage}%`;
            overallBar.setAttribute("aria-valuenow", percentage);

            document.getElementById("dashboardProgressPercentage").textContent =
                `${percentage}%`;

            // Overall progress message
            const message = document.getElementById("dashboardProgressMessage");

            if (total === 0) {
                message.textContent = "Your study journey starts here. Add your first task! 🌱";
            } else if (percentage === 100) {
                message.textContent = "Wonderful! You've completed all your tasks! ✨";
            } else if (percentage >= 50) {
                message.textContent = "You're making lovely progress. Keep going! 🍵";
            } else {
                message.textContent = "Every small step counts. Keep moving forward! 🌿";
            }

            // Calculate current week's tasks (Monday to Sunday)
            const today = new Date();
            const monday = new Date(today);
            monday.setHours(0, 0, 0, 0);

            const day = monday.getDay();
            monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));

            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);

            function dateKey(date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            }

            const startDate = dateKey(monday);
            const endDate = dateKey(sunday);

            const weeklyTasks = tasks.filter(task =>
                task.due_date &&
                task.due_date >= startDate &&
                task.due_date <= endDate
            );

            const weeklyTotal = weeklyTasks.length;
            const weeklyCompleted = weeklyTasks.filter(
                task => task.completed
            ).length;

            const weeklyRemaining = weeklyTotal - weeklyCompleted;

            const weeklyPercentage = weeklyTotal === 0
                ? 0
                : Math.round((weeklyCompleted / weeklyTotal) * 100);

            // Update weekly preview
            document.getElementById("dashboardWeeklyPercentage").textContent =
                `${weeklyPercentage}%`;

            const weeklyBar = document.getElementById("dashboardWeeklyBar");

            weeklyBar.style.width = `${weeklyPercentage}%`;
            weeklyBar.setAttribute("aria-valuenow", weeklyPercentage);

            document.getElementById("dashboardWeeklyCompleted").textContent =
                weeklyCompleted;

            document.getElementById("dashboardWeeklyRemaining").textContent =
                weeklyRemaining;

            document.getElementById("dashboardWeeklyTotal").textContent =
                weeklyTotal;

        } catch (error) {
            console.error("Dashboard error:", error);

            document.getElementById("dashboardProgressMessage").textContent =
                "Unable to load your dashboard. Please refresh the page.";
        }
    }

    loadDashboard();
}
