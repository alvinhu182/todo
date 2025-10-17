// Variáveis DOM
const taskInput = document.getElementById("taskInput");
const taskDueDate = document.getElementById("taskDueDate");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const filters = document.querySelectorAll(".filters button");

// Seletores de dias da semana
const daySelectors = document.querySelectorAll(
  '.day-selectors input[type="checkbox"]'
);

// NOVIDADES para Visualização por Data
const viewDateSelector = document.getElementById("viewDateSelector");
const currentViewDateText = document.getElementById("currentViewDateText");

// Nome da chave no localStorage
const STORAGE_KEY = "localTodoList";

// Variável para armazenar as tarefas
let tasks = [];
let currentFilter = "all";

// Função auxiliar para obter a data atual no formato YYYY-MM-DD
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Função para formatar a data
 */
const formatDate = (
  dateString,
  options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
) => {
  let date;
  if (dateString.includes("T")) {
    date = new Date(dateString);
  } else {
    date = new Date(dateString + "T00:00:00");
  }

  if (isNaN(date.getTime())) {
    return "Data Inválida";
  }

  if (options.hour || options.minute) {
    return date.toLocaleTimeString("pt-BR", options);
  } else {
    return date.toLocaleDateString("pt-BR", options);
  }
};

// 1. Carregar Tarefas do LocalStorage e Inicializar Datas
const loadTasks = () => {
  const savedTasks = localStorage.getItem(STORAGE_KEY);
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  }

  const today = getTodayDateString();

  // Garante que ambos os seletores de data estejam sempre inicializados com "hoje"
  taskDueDate.value = today;
  viewDateSelector.value = today;

  updateViewDateDisplay();
};

// Atualiza o texto da data que está sendo visualizada e renderiza
const updateViewDateDisplay = () => {
  const dateToView = viewDateSelector.value;
  const today = getTodayDateString();

  if (dateToView === today) {
    currentViewDateText.textContent = "Hoje";
  } else {
    currentViewDateText.textContent = formatDate(dateToView, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  renderTasks();
};

/**
 * Função auxiliar para verificar o status de conclusão
 */
const isTaskCompletedForDay = (task) => {
  // Se não for repetitiva, usa a flag 'completed' normal
  if (task.repeatDays.length === 0) {
    return task.completed;
  }

  // Se for repetitiva, verifica o array de datas concluídas para o dia de visualização
  const completedDates = task.dailyCompletedDates || [];
  const selectedViewDate = viewDateSelector.value;

  return completedDates.includes(selectedViewDate);
};

// 2. Salvar Tarefas no LocalStorage
const saveTasks = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

// 3. Renderizar (Mostrar) a Lista de Tarefas
const renderTasks = () => {
  taskList.innerHTML = "";
  const selectedViewDate = viewDateSelector.value;

  // Converte a data de visualização para o número do dia da semana (0=Dom, 1=Seg, ...)
  const viewDayOfWeek = new Date(selectedViewDate + "T00:00:00").getDay();

  // 3.1. FILTRAGEM DE DATA E RECORRÊNCIA
  const dailyFilterTasks = tasks.filter((task) => {
    // Tarefa de data única (não repetitiva)
    if (!task.repeatDays || task.repeatDays.length === 0) {
      // SÓ aparece se a data de vencimento for EXATAMENTE a data de visualização.
      return task.dueDate === selectedViewDate;
    }

    // Tarefa Repetitiva:
    // 1. O dia da visualização deve estar no array repeatDays (o filtro principal)
    const isScheduledDay = task.repeatDays.includes(viewDayOfWeek);

    // 2. A data de visualização deve ser posterior ou igual à data de início (dueDate)
    const isAfterStartDate = selectedViewDate >= task.dueDate;

    return isScheduledDay && isAfterStartDate;
  });

  // 3.2. Filtragem por Status (Todas, Pendentes, Completas)
  const finalFilteredTasks = dailyFilterTasks.filter((task) => {
    const isCompleted = isTaskCompletedForDay(task);

    if (currentFilter === "active") {
      return !isCompleted;
    } else if (currentFilter === "completed") {
      return isCompleted;
    }
    return true; // 'all'
  });

  if (finalFilteredTasks.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent =
      currentFilter === "all"
        ? "Nenhuma tarefa para o dia selecionado."
        : currentFilter === "active"
        ? "Todas as tarefas pendentes foram concluídas! 🎉"
        : "Nenhuma tarefa completada ainda para este dia.";
    emptyMessage.style.textAlign = "center";
    emptyMessage.style.color = "#777";
    taskList.appendChild(emptyMessage);
    return;
  }

  // 3.3. Criação dos Elementos HTML
  finalFilteredTasks.forEach((task) => {
    const isCompleted = isTaskCompletedForDay(task);

    const listItem = document.createElement("li");
    if (isCompleted) {
      listItem.classList.add("completed");
    }

    const taskInfo = document.createElement("div");
    taskInfo.classList.add("task-info");

    const taskText = document.createElement("span");
    taskText.classList.add("task-text");
    taskText.textContent = task.text;

    // Indicador de Recorrência (agora mostra os dias)
    if (task.repeatDays && task.repeatDays.length > 0) {
      const daysMap = {
        0: "D",
        1: "S",
        2: "T",
        3: "Q",
        4: "Q",
        5: "S",
        6: "S",
      };
      const daysText = task.repeatDays.map((day) => daysMap[day]).join(",");
      taskText.innerHTML += ` <i class="fa-solid fa-repeat" style="color:#007bff; font-size: 12px; margin-left: 5px;" title="Repete: ${daysText}"></i>`;
    }

    // Informações de data
    let dateInfo = `Adicionado em: ${formatDate(task.createdAt, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    // Se for repetitiva, mostra a data de início (dueDate)
    if (task.repeatDays && task.repeatDays.length > 0) {
      dateInfo += ` | Início: ${formatDate(task.dueDate, {
        month: "short",
        day: "numeric",
      })}`;
    }

    const taskDate = document.createElement("small");
    taskDate.classList.add("task-date");
    taskDate.textContent = dateInfo;

    taskInfo.appendChild(taskText);
    taskInfo.appendChild(taskDate);

    // Ações (Check e Remover)
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("task-actions");

    const checkBtn = document.createElement("button");
    checkBtn.classList.add("action-btn", "check-btn");
    const checkIcon = isCompleted ? "fa-square-check" : "fa-regular fa-square";
    checkBtn.innerHTML = `<i class="fa-solid ${checkIcon}"></i>`;
    checkBtn.title = isCompleted ? "Desmarcar" : "Marcar como completa";
    checkBtn.onclick = () => toggleTaskComplete(task.id);

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("action-btn", "delete-btn");
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    deleteBtn.title = "Remover tarefa";
    deleteBtn.onclick = () => removeTask(task.id);

    actionsDiv.appendChild(checkBtn);
    actionsDiv.appendChild(deleteBtn);

    listItem.appendChild(taskInfo);
    listItem.appendChild(actionsDiv);

    taskList.appendChild(listItem);
  });
};

// 4. Adicionar Nova Tarefa
const addTask = () => {
  const text = taskInput.value.trim();
  if (text === "") {
    alert("Por favor, digite uma tarefa válida.");
    return;
  }

  const today = getTodayDateString();
  const dueDate = taskDueDate.value || today;

  // REGRA 2: Não permitir a criação de tarefas no passado
  if (dueDate < today) {
    alert("Não é possível criar tarefas para dias que já passaram.");
    return;
  }

  // Coleta os dias da semana selecionados
  const repeatDays = Array.from(daySelectors)
    .filter((cb) => cb.checked)
    .map((cb) => parseInt(cb.dataset.day));

  const newTask = {
    id: Date.now(),
    text: text,
    completed: false,
    createdAt: new Date().toISOString(),
    repeatDays: repeatDays,
    dueDate: dueDate,
    dailyCompletedDates: [],
  };

  tasks.push(newTask);
  saveTasks();

  // Limpar e resetar campos
  taskInput.value = "";
  taskDueDate.value = today; // Volta o campo para a data atual
  daySelectors.forEach((cb) => (cb.checked = false)); // Limpa a seleção de dias

  // 1. Se for uma tarefa única e a data de vencimento for diferente da data de visualização,
  //    mude a visualização para o dia da tarefa.
  if (dueDate !== viewDateSelector.value && repeatDays.length === 0) {
    viewDateSelector.value = dueDate;
  }

  // 2. Sempre chame a função de atualização completa para garantir que a lista seja renderizada.
  updateViewDateDisplay();
};

/**
 * Marcar/Desmarcar como Completa
 */
const toggleTaskComplete = (taskId) => {
  const taskIndex = tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) return;

  const task = tasks[taskIndex];
  const selectedViewDate = viewDateSelector.value;

  if (task.repeatDays && task.repeatDays.length > 0) {
    // Tarefa Repetitiva: Gerenciar conclusão apenas para o dia visualizado
    if (!task.dailyCompletedDates) {
      task.dailyCompletedDates = [];
    }

    const dateIndex = task.dailyCompletedDates.indexOf(selectedViewDate);

    if (dateIndex > -1) {
      task.dailyCompletedDates.splice(dateIndex, 1);
    } else {
      task.dailyCompletedDates.push(selectedViewDate);
    }
  } else {
    // Tarefa de data única
    task.completed = !task.completed;
  }

  saveTasks();
  renderTasks();
};

// 6. Remover Tarefa
const removeTask = (taskId) => {
  tasks = tasks.filter((t) => t.id !== taskId);
  saveTasks();
  renderTasks();
};

// 7. Event Listeners Principais
addTaskBtn.addEventListener("click", addTask);
taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addTask();
  }
});

// Listener para o seletor de data de visualização. Qualquer mudança de data atualiza a lista.
viewDateSelector.addEventListener("change", updateViewDateDisplay);

// 8. Event Listeners para os Filtros (Status)
filters.forEach((button) => {
  button.addEventListener("click", function () {
    currentFilter = this.id.replace("filter", "").toLowerCase();
    filters.forEach((btn) => btn.classList.remove("active"));
    this.classList.add("active");
    renderTasks();
  });
});

// Inicialização: Carregar tarefas ao iniciar o site
loadTasks();
