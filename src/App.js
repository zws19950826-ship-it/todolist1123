import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Check,
  Search,
  ListTodo,
  CalendarDays,
  LayoutList,
  Palette,
  FileText,
  Copy,
  CheckCheck,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LineChart,
  XCircle,
  AlertCircle,
  TrendingUp,
  Filter,
  Tag,
  RotateCcw,
  Maximize2,
  ChevronsLeft,
  Zap,
  Star,
  Coffee,
  AlertTriangle,
  Settings2,
  Calendar,
  ListChecks,
  Archive,
  Undo2,
  LayoutGrid,
  Clock,
  GripHorizontal,
} from "lucide-react";

/**
 * 移动端待办事项管理应用 (v11.11 - 回滚版)
 * - 回滚：移除杂志风 Logo，恢复简洁标题
 * - 保留：进度条范围点击切换 (4字中文)
 * - 保留：长按拖拽排序
 */

// --- 样式注入 (Polyfill for Tailwind Plugins & Custom Animations) ---
const GlobalStyles = () => (
  <style>{`
    /* 隐藏滚动条但保留功能 */
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    
    /* 背景 Blob 动画 */
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
    .animate-blob {
      animation: blob 7s infinite;
    }
    .animation-delay-2000 {
      animation-delay: 2s;
    }
    .animation-delay-4000 {
      animation-delay: 4s;
    }

    /* tailwindcss-animate Polyfill */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideInFromBottom { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes slideInFromTop { from { transform: translateY(-100%); } to { transform: translateY(0); } }
    @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes slideInFromRightSmall { from { transform: translateX(2rem); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideInFromLeftSmall { from { transform: translateX(-2rem); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    .animate-in { animation-duration: 0.4s; animation-fill-mode: forwards; animation-timing-function: ease-out; }
    .fade-in { animation-name: fadeIn; }
    .slide-in-from-bottom-2 { animation-name: slideInFromBottom; }
    .slide-in-from-bottom-5 { animation-name: slideInFromBottom; }
    .slide-in-from-top-10 { animation-name: slideInFromTop; }
    .slide-in-from-right-8 { animation-name: slideInFromRightSmall; }
    .slide-in-from-left-8 { animation-name: slideInFromLeftSmall; }
    .zoom-in-95 { animation-name: zoomIn; }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    /* 拖拽相关样式 */
    .dragging-card {
      opacity: 0.3;
      filter: grayscale(100%);
      transform: scale(0.95);
    }
    .drag-prevent-scroll {
      touch-action: none; 
      user-select: none;
      -webkit-user-select: none;
    }
  `}</style>
);

// --- 莫兰迪高级色板 (扩充至 16 色) ---
const MORANDI_THEMES = [
  // 原有 8 色
  { color: "#6B8E88", name: "青瓷 (Celadon)" },
  { color: "#9C8CB9", name: "雾紫 (Dusty Purple)" },
  { color: "#C98C93", name: "胭脂 (Rouge)" },
  { color: "#7FB0A2", name: "薄荷 (Mint)" },
  { color: "#6D7C8C", name: "岩灰 (Slate)" },
  { color: "#B59078", name: "褐土 (Clay)" },
  { color: "#95A5A6", name: "冷灰 (Concrete)" },
  { color: "#D4A5D9", name: "丁香 (Lilac)" },
  // 新增 8 色
  { color: "#889EAF", name: "钢蓝 (Steel)" },
  { color: "#A49393", name: "可可 (Cocoa)" },
  { color: "#92A8D1", name: "静谧 (Serenity)" },
  { color: "#D7B19D", name: "杏仁 (Almond)" },
  { color: "#95B3A5", name: "海沫 (Seafoam)" },
  { color: "#B098A4", name: "浆果 (Berry)" },
  { color: "#869D9D", name: "灰绿 (Teal)" },
  { color: "#CBBBA0", name: "麦色 (Wheat)" },
];

const MORANDI_YELLOW = "#E6D5A7";
const ITEMS_PER_PAGE = 7;
const NO_TAG_ID = "__no_tag__";

const FIXED_TAGS = [
  { id: "urgent", label: "⚡ 紧急", color: "#9C8CB9" },
  { id: "important", label: "⭐ 重要", color: "#6B8E88" },
  { id: "forgettable", label: "🧠 易忘", color: "#E6D5A7" },
];

const PROGRESS_RANGES = [
  { id: "all", label: "全部时间" },
  { id: "month", label: "近一个月" },
  { id: "week", label: "最近一周" },
  { id: "3days", label: "最近三天" },
];

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// --- 透明全屏遮罩组件 ---
const Backdrop = ({ onClick, zIndex = "z-40" }) => (
  <div
    className={`fixed inset-0 ${zIndex} bg-transparent cursor-default`}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
  />
);

export default function App() {
  // --- 状态管理 ---
  const [tasks, setTasks] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("todoList");
        const parsed = saved ? JSON.parse(saved) : [];
        // 数据迁移：确保所有任务都有 customOrder
        return parsed.map((t, i) => ({
          ...t,
          customOrder:
            t.customOrder !== undefined ? t.customOrder : Date.now() - i * 1000,
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [customTagsList, setCustomTagsList] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("customTags");
        return saved ? JSON.parse(saved) : ["工作", "生活"];
      } catch (e) {
        return ["工作", "生活"];
      }
    }
    return ["工作", "生活"];
  });

  // UI 状态
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState("single");
  const [selectedTask, setSelectedTask] = useState(null);
  const [inputText, setInputText] = useState("");
  const [newTagInput, setNewTagInput] = useState("");

  // 新建任务的临时状态
  const [newTaskTags, setNewTaskTags] = useState([]);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskSubtasks, setNewTaskSubtasks] = useState([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState("");

  const [filterType, setFilterType] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [activeTagFilters, setActiveTagFilters] = useState([]);
  const [showTagFilterMenu, setShowTagFilterMenu] = useState(false);

  const [viewMode, setViewMode] = useState("list");
  const [calendarViewType, setCalendarViewType] = useState("created");

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statsRange, setStatsRange] = useState(7); // 图表统计范围
  const [progressBarRange, setProgressBarRange] = useState("all"); // 进度条统计范围

  const [currentPage, setCurrentPage] = useState(1);
  const [slideDirection, setSlideDirection] = useState("next");
  const [expandedGroups, setExpandedGroups] = useState({
    today: false,
    threeDays: false,
    week: false,
    month: false,
    earlier: false,
  });

  const [isDetailEditing, setIsDetailEditing] = useState(false);

  // 撤销删除相关
  const [deletedTask, setDeletedTask] = useState(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoTimeoutRef = useRef(null);

  // 拖拽排序相关状态
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const dragLongPressTimer = useRef(null);
  const listContainerRef = useRef(null);
  const scrollingLocked = useRef(false);

  const [themeIndex, setThemeIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const savedColor = localStorage.getItem("themeColor");
      const idx = MORANDI_THEMES.findIndex((t) => t.color === savedColor);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  });

  const theme = MORANDI_THEMES[themeIndex];
  const themeColor = theme.color;

  const [showThemePicker, setShowThemePicker] = useState(false);
  const timelineRef = useRef(null);

  // --- 核心函数 ---
  const scrollToToday = () => {
    if (viewMode === "timeline") {
      setTimeout(() => {
        const todayStr = new Date().toLocaleDateString("zh-CN");
        const targetId = `day-col-${todayStr}`;
        const todayEl = document.getElementById(targetId);
        if (todayEl) {
          todayEl.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }, 100);
    }
  };

  const handleReturnToToday = () => {
    const now = new Date();
    const isSameMonth =
      currentMonth.getMonth() === now.getMonth() &&
      currentMonth.getFullYear() === now.getFullYear();

    if (!isSameMonth) {
      setCurrentMonth(now);
    } else {
      scrollToToday();
    }
  };

  // --- 动态修改 PWA 状态栏颜色 ---
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = "#F8F9FA";
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem("todoList", JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem("themeColor", themeColor);
  }, [themeColor]);
  useEffect(() => {
    localStorage.setItem("customTags", JSON.stringify(customTagsList));
  }, [customTagsList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery, activeTagFilters]);
  useEffect(() => {
    scrollToToday();
  }, [viewMode, currentMonth, calendarViewType]);

  // --- 辅助逻辑 ---
  const processTagMutex = (currentTags, tagToAdd) => {
    let tags = [...currentTags];
    if (tagToAdd === "forgettable") {
      tags = tags.filter((t) => t !== "urgent" && t !== "important");
    } else if (tagToAdd === "urgent" || tagToAdd === "important") {
      tags = tags.filter((t) => t !== "forgettable");
    }
    return [...new Set([...tags, tagToAdd])];
  };

  const applyAutoTags = (taskTags, dueDate) => {
    let tags = [...taskTags];
    if (dueDate) {
      if (!tags.includes("limited_time")) tags.push("limited_time");
      const now = new Date();
      const due = new Date(dueDate);
      due.setHours(23, 59, 59, 999);
      const diffHours = (due - now) / (1000 * 60 * 60);
      if (diffHours < 48) {
        const hasMutexTag = tags.some((t) =>
          ["important", "forgettable"].includes(t)
        );
        if (!hasMutexTag && !tags.includes("urgent")) {
          tags.push("urgent");
        }
      }
    } else {
      tags = tags.filter((t) => t !== "limited_time");
    }
    return [...new Set(tags)];
  };

  // --- 优先级计算 ---
  const getPriorityScore = (task) => {
    const tags = task.tags || [];
    if (tags.includes("urgent") && tags.includes("important")) return 3;
    if (tags.includes("important")) return 2;
    if (tags.includes("urgent")) return 1;
    return 0;
  };

  // --- 拖拽排序逻辑 ---
  const handlePointerDown = (e, taskId) => {
    if (viewMode !== "list" || filterType === "completed") return;
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;

    dragLongPressTimer.current = setTimeout(() => {
      setDraggedTaskId(taskId);
      scrollingLocked.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
    }, 200);
  };

  const handlePointerMove = (e) => {
    if (!draggedTaskId) {
      if (dragLongPressTimer.current) {
        clearTimeout(dragLongPressTimer.current);
        dragLongPressTimer.current = null;
      }
      return;
    }
    e.preventDefault();
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const targetTaskItem = element?.closest("[data-task-id]");

    if (targetTaskItem) {
      const targetId = targetTaskItem.getAttribute("data-task-id");
      if (targetId && targetId !== draggedTaskId) {
        reorderTasks(draggedTaskId, targetId);
      }
    }
  };

  const handlePointerUp = () => {
    if (dragLongPressTimer.current) {
      clearTimeout(dragLongPressTimer.current);
    }
    setDraggedTaskId(null);
    scrollingLocked.current = false;
  };

  const reorderTasks = (sourceId, targetId) => {
    setTasks((prevTasks) => {
      const sourceIndex = prevTasks.findIndex((t) => t.id === sourceId);
      const targetIndex = prevTasks.findIndex((t) => t.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return prevTasks;

      const sourceTask = prevTasks[sourceIndex];
      const targetTask = prevTasks[targetIndex];

      const sourceScore = getPriorityScore(sourceTask);
      const targetScore = getPriorityScore(targetTask);

      if (sourceScore !== targetScore) return prevTasks;

      const newTasks = [...prevTasks];
      const tempOrder = newTasks[sourceIndex].customOrder;
      newTasks[sourceIndex] = {
        ...newTasks[sourceIndex],
        customOrder: newTasks[targetIndex].customOrder,
      };
      newTasks[targetIndex] = {
        ...newTasks[targetIndex],
        customOrder: tempOrder,
      };

      return newTasks;
    });
  };

  // --- 核心逻辑 ---
  const handleCreateTask = () => {
    if (!inputText.trim()) return;

    let newTasksData = [];
    let finalTags = [...newTaskTags];
    finalTags = applyAutoTags(finalTags, newTaskDueDate);

    const maxOrder =
      tasks.length > 0 ? Math.max(...tasks.map((t) => t.customOrder || 0)) : 0;
    const baseOrder = maxOrder + 1000;

    if (addMode === "batch") {
      const lines = inputText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      newTasksData = lines.map((line, idx) => ({
        id: generateId(),
        text: line,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        dueDate: newTaskDueDate || null,
        subtasks: [],
        tags: [...finalTags],
        customOrder: baseOrder + idx,
      }));
    } else {
      newTasksData = [
        {
          id: generateId(),
          text: inputText.trim(),
          completed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          dueDate: newTaskDueDate || null,
          subtasks: newTaskSubtasks,
          tags: finalTags,
          customOrder: baseOrder,
        },
      ];
    }

    if (newTasksData.length > 0) {
      setTasks([...newTasksData, ...tasks]);
      setInputText("");
      setNewTaskTags([]);
      setNewTaskDueDate("");
      setNewTaskSubtasks([]);
      setIsAddModalOpen(false);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setNewTaskSubtasks([
      ...newTaskSubtasks,
      {
        id: generateId(),
        text: newSubtaskInput.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskInput("");
  };

  const toggleTask = (id) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          const nextStatus = !task.completed;
          return {
            ...task,
            completed: nextStatus,
            completedAt: nextStatus ? new Date().toISOString() : null,
          };
        }
        return task;
      })
    );
  };

  const toggleNewTaskTag = (tag) => {
    setNewTaskTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      } else {
        return processTagMutex(prev, tag);
      }
    });
  };

  const updateTaskTags = (taskId, tag, isActive) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const currentTags = task.tags || [];
          let newTags;
          if (isActive) {
            newTags = processTagMutex(currentTags, tag);
          } else {
            newTags = currentTags.filter((t) => t !== tag);
          }
          newTags = applyAutoTags(newTags, task.dueDate);

          if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask({ ...task, tags: newTags });
          }
          return { ...task, tags: newTags };
        }
        return task;
      })
    );
  };

  const updateTaskDueDate = (taskId, date) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const newTags = applyAutoTags(task.tags || [], date);
          const updatedTask = { ...task, dueDate: date, tags: newTags };
          if (selectedTask && selectedTask.id === taskId)
            setSelectedTask(updatedTask);
          return updatedTask;
        }
        return task;
      })
    );
  };

  const updateSubtask = (taskId, subtaskId) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const newSubtasks = task.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          const updatedTask = { ...task, subtasks: newSubtasks };
          if (selectedTask && selectedTask.id === taskId)
            setSelectedTask(updatedTask);
          return updatedTask;
        }
        return task;
      })
    );
  };

  const addSubtaskToExisting = (taskId, text) => {
    if (!text.trim()) return;
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const newSubtasks = [
            ...(task.subtasks || []),
            { id: generateId(), text: text, completed: false },
          ];
          const updatedTask = { ...task, subtasks: newSubtasks };
          if (selectedTask && selectedTask.id === taskId)
            setSelectedTask(updatedTask);
          return updatedTask;
        }
        return task;
      })
    );
  };

  const deleteSubtask = (taskId, subtaskId) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const newSubtasks = task.subtasks.filter((st) => st.id !== subtaskId);
          const updatedTask = { ...task, subtasks: newSubtasks };
          if (selectedTask && selectedTask.id === taskId)
            setSelectedTask(updatedTask);
          return updatedTask;
        }
        return task;
      })
    );
  };

  const handleCreateCustomTag = (e) => {
    e.preventDefault();
    const tag = newTagInput.trim();
    if (tag && !customTagsList.includes(tag)) {
      setCustomTagsList([...customTagsList, tag]);
    }
    setNewTagInput("");
  };

  const handleDeleteCustomTag = (tagToDelete) => {
    if (window.confirm(`确定删除标签“${tagToDelete}”吗？`)) {
      setCustomTagsList(customTagsList.filter((t) => t !== tagToDelete));
      setTasks(
        tasks.map((t) => ({
          ...t,
          tags: t.tags ? t.tags.filter((tag) => tag !== tagToDelete) : [],
        }))
      );
      setActiveTagFilters(activeTagFilters.filter((t) => t !== tagToDelete));
      setNewTaskTags((prev) => prev.filter((t) => t !== tagToDelete));
    }
  };

  const deleteTask = (task) => {
    if (window.confirm(`确定要删除“${task.text}”这个任务吗？`)) {
      setDeletedTask(task);
      setTasks(tasks.filter((t) => t.id !== task.id));
      if (selectedTask && selectedTask.id === task.id) setSelectedTask(null);

      setShowUndoToast(true);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setDeletedTask(null);
      }, 5000);
    }
  };

  const handleUndo = () => {
    if (deletedTask) {
      setTasks((prev) => [deletedTask, ...prev]);
      setDeletedTask(null);
      setShowUndoToast(false);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  const toggleFilter = (tag) => {
    setActiveTagFilters((prev) => {
      if (tag === NO_TAG_ID) {
        return prev.includes(NO_TAG_ID) ? [] : [NO_TAG_ID];
      }
      let newFilters = prev.filter((t) => t !== NO_TAG_ID);
      if (newFilters.includes(tag)) {
        return newFilters.filter((t) => t !== tag);
      } else {
        return [...newFilters, tag];
      }
    });
  };

  // --- 数据处理 ---
  const checkFilterMatch = (task) => {
    if (activeTagFilters.length === 0) return true;
    if (activeTagFilters.includes(NO_TAG_ID)) {
      return !task.tags || task.tags.length === 0;
    }
    const taskTags = task.tags || [];
    return activeTagFilters.some((filter) => taskTags.includes(filter));
  };

  const groupedCompletedTasks = useMemo(() => {
    if (filterType !== "completed") return null;
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const groups = {
      today: [],
      threeDays: [],
      week: [],
      month: [],
      earlier: [],
    };

    const completedTasks = tasks
      .filter(
        (t) =>
          t.completed &&
          (searchQuery
            ? t.text.toLowerCase().includes(searchQuery.toLowerCase())
            : true)
      )
      .filter((t) => checkFilterMatch(t))
      .sort(
        (a, b) =>
          new Date(b.completedAt || b.createdAt) -
          new Date(a.completedAt || a.createdAt)
      );

    completedTasks.forEach((task) => {
      const date = new Date(task.completedAt || task.createdAt).getTime();
      const diffDays = (now.getTime() - date) / oneDay;
      if (date >= todayStart) groups.today.push(task);
      else if (diffDays <= 3) groups.threeDays.push(task);
      else if (diffDays <= 7) groups.week.push(task);
      else if (diffDays <= 30) groups.month.push(task);
      else groups.earlier.push(task);
    });
    return groups;
  }, [tasks, filterType, searchQuery, activeTagFilters]);

  const baseFilteredTasks = useMemo(() => {
    if (filterType === "completed") return [];
    let result = tasks.filter((task) => {
      if (filterType === "active" && task.completed) return false;
      if (
        searchQuery &&
        !task.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (!checkFilterMatch(task)) return false;
      return true;
    });

    result.sort((a, b) => {
      const scoreA = getPriorityScore(a);
      const scoreB = getPriorityScore(b);

      if (scoreA !== scoreB) return scoreB - scoreA;

      // 优先级相同时，完全依赖 customOrder 排序 (降序，新/顶置的在前)
      // 使用 || 0 防止旧数据为 undefined
      const orderA = a.customOrder || 0;
      const orderB = b.customOrder || 0;
      return orderB - orderA;
    });
    return result;
  }, [tasks, filterType, searchQuery, activeTagFilters]);

  const totalPages = useMemo(() => {
    if (filterType === "completed") return 1;
    return Math.ceil(baseFilteredTasks.length / ITEMS_PER_PAGE) || 1;
  }, [baseFilteredTasks, filterType]);

  const currentViewTasks = useMemo(() => {
    if (filterType === "completed") return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return baseFilteredTasks.slice(start, start + ITEMS_PER_PAGE);
  }, [baseFilteredTasks, currentPage, filterType]);

  // 滑动翻页 (Pointer Event 混合处理)
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const onTouchStart = (e) => {
    // 仅当未拖拽时响应翻页
    if (scrollingLocked.current) return;
    touchEnd.current = null;
    touchStart.current = e.targetTouches
      ? e.targetTouches[0].clientX
      : e.clientX;
  };
  const onTouchMove = (e) => {
    if (scrollingLocked.current) return;
    touchEnd.current = e.targetTouches ? e.targetTouches[0].clientX : e.clientX;
  };
  const onTouchEnd = () => {
    if (scrollingLocked.current) return;
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (distance > 50 && currentPage < totalPages) {
      setSlideDirection("next");
      setCurrentPage((p) => p + 1);
    }
    if (distance < -50 && currentPage > 1) {
      setSlideDirection("prev");
      setCurrentPage((p) => p - 1);
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // 点击切换范围逻辑
  const handleToggleRange = () => {
    const currentIndex = PROGRESS_RANGES.findIndex(
      (r) => r.id === progressBarRange
    );
    const nextIndex = (currentIndex + 1) % PROGRESS_RANGES.length;
    setProgressBarRange(PROGRESS_RANGES[nextIndex].id);
  };

  const stats = useMemo(() => {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    let filteredTasks = tasks;

    if (progressBarRange !== "all") {
      filteredTasks = tasks.filter((t) => {
        const created = new Date(t.createdAt);
        const diffTime = Math.abs(now - created);
        const diffDays = Math.ceil(diffTime / oneDay);

        if (progressBarRange === "month") return diffDays <= 30;
        if (progressBarRange === "week") return diffDays <= 7;
        if (progressBarRange === "3days") return diffDays <= 3;
        return true;
      });
    }

    const total = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.completed).length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, rate };
  }, [tasks, progressBarRange]);

  const chartData = useMemo(() => {
    const rawData = [];
    const now = new Date();
    for (let i = statsRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("zh-CN");
      const isSameDay = (isoString) => {
        if (!isoString) return false;
        return new Date(isoString).toLocaleDateString("zh-CN") === dateStr;
      };
      rawData.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        fullDate: dateStr,
        created: tasks.filter((t) => isSameDay(t.createdAt)).length,
        completed: tasks.filter((t) => isSameDay(t.completedAt)).length,
      });
    }
    let firstDataIndex = rawData.findIndex(
      (d) => d.created > 0 || d.completed > 0
    );
    if (firstDataIndex === -1) return [rawData[rawData.length - 1]];
    return rawData.slice(firstDataIndex);
  }, [tasks, statsRange]);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const groups = {};
    tasks.forEach((task) => {
      const dateKeyStr =
        calendarViewType === "due" && task.dueDate
          ? task.dueDate
          : calendarViewType === "created"
          ? task.createdAt
          : null;

      if (dateKeyStr) {
        const dateKey = new Date(dateKeyStr).toLocaleDateString("zh-CN");
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(task);
      }
    });
    return groups;
  }, [tasks, calendarViewType]);

  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const generateTextLog = () => {
    const lines = tasks.map((t) => {
      const createDate = new Date(t.createdAt).toLocaleDateString();
      const status = t.completed ? "[已完成]" : "[待办]";
      let timeInfo = `创建于:${createDate}`;
      if (t.completed && t.completedAt)
        timeInfo += ` | 完成于:${new Date(t.completedAt).toLocaleString()}`;
      if (t.dueDate) timeInfo += ` | 截止:${t.dueDate}`;

      const tagNames = (t.tags || []).map((tag) => {
        const preset = [...FIXED_TAGS].find((p) => p.id === tag);
        return preset
          ? preset.label.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, "")
          : tag;
      });
      const tagsStr = tagNames.length > 0 ? ` [${tagNames.join(",")}]` : "";

      const subtaskStr =
        t.subtasks && t.subtasks.length > 0
          ? `\n   └ 子任务: ${t.subtasks
              .map((st) => `${st.completed ? "[x]" : "[ ]"} ${st.text}`)
              .join("; ")}`
          : "";

      return `${status} ${t.text}${tagsStr} (${timeInfo})${subtaskStr}`;
    });
    return lines.join("\n") || "暂无数据";
  };

  const [copySuccess, setCopySuccess] = useState(false);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateTextLog()).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const getCalendarTaskStyle = (task) => {
    const tags = task.tags || [];
    const isUrgent = tags.includes("urgent");
    const isImportant = tags.includes("important");
    const isForgettable = tags.includes("forgettable");

    if (task.completed) {
      return {
        className: "bg-gray-100 text-gray-400 line-through decoration-gray-400",
      };
    }
    if (isUrgent && isImportant) {
      return {
        style: { backgroundColor: themeColor, color: "#fff" },
        className: "font-bold shadow-sm",
      };
    }
    if (isImportant) {
      return {
        style: { backgroundColor: `${themeColor}CC`, color: "#fff" },
        className: "font-medium shadow-sm",
      };
    }
    if (isUrgent) {
      return {
        style: { backgroundColor: `${themeColor}50`, color: "#374151" },
      };
    }
    if (isForgettable) {
      return {
        style: { backgroundColor: MORANDI_YELLOW, color: "#78350F" },
        className: "font-medium",
      };
    }
    return { className: "bg-white border-l-2 border-gray-300 text-gray-700" };
  };

  const renderCompletedGroup = (title, groupKey, groupTasks) => {
    if (groupTasks.length === 0) return null;
    const isExpanded = expandedGroups[groupKey];
    return (
      <div className="mb-4 last:mb-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <button
          onClick={() => toggleGroup(groupKey)}
          className="group flex items-center justify-between w-full py-3 px-4 mb-2 rounded-2xl transition-all duration-300 hover:bg-white/60 backdrop-blur-sm border border-transparent hover:border-white/40"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">
              {title}
            </span>
            <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 bg-gray-200/50 rounded-full text-[10px] font-bold text-gray-600">
              {groupTasks.length}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        {isExpanded && (
          <div className="space-y-3 px-1">
            {groupTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                themeColor={themeColor}
                onShowDetail={setSelectedTask}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#f8f9fa] text-gray-800 font-sans selection:bg-gray-200 drag-prevent-scroll">
      <GlobalStyles />
      {/* ... Background ... */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[20%] -left-[20%] w-[80%] h-[80%] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"
          style={{ backgroundColor: themeColor }}
        ></div>
        <div
          className="absolute top-[10%] -right-[20%] w-[70%] h-[70%] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-2000"
          style={{ backgroundColor: themeColor }}
        ></div>
        <div
          className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-4000"
          style={{ backgroundColor: themeColor }}
        ></div>
      </div>

      {/* Search Mask */}
      {isSearchMode && (
        <Backdrop
          onClick={() => {
            setIsSearchMode(false);
            setSearchQuery("");
          }}
          zIndex="z-30"
        />
      )}

      <div className="max-w-md mx-auto h-[100dvh] flex flex-col relative shadow-[0_0_60px_-15px_rgba(0,0,0,0.1)] bg-white/40 backdrop-blur-xl overflow-hidden ring-1 ring-white/50">
        <header className="p-6 pb-2 sticky top-0 z-20 bg-white/60 backdrop-blur-xl border-b border-white/40 pt-[calc(1.5rem+env(safe-area-inset-top))]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-12 w-auto ml-2 mt-2"
              />
            </div>

            <div className="flex gap-2 items-center">
              <NavIcon
                onClick={() => setViewMode("stats")}
                active={viewMode === "stats"}
                icon={LineChart}
                themeColor={themeColor}
              />

              <NavIcon
                onClick={() => setViewMode("list")}
                active={viewMode === "list"}
                icon={LayoutList}
                themeColor={themeColor}
              />

              <NavIcon
                onClick={() => setViewMode("timeline")}
                active={viewMode === "timeline"}
                icon={CalendarDays}
                themeColor={themeColor}
              />

              <NavIcon
                onClick={() => setViewMode("log")}
                active={viewMode === "log"}
                icon={FileText}
                themeColor={themeColor}
              />

              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-2.5 rounded-full transition-all hover:bg-white/50 hover:shadow-sm active:scale-95 relative z-50 ml-1"
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5"
                  style={{ backgroundColor: themeColor }}
                ></div>
              </button>
            </div>

            {/* Theme Picker */}
            {showThemePicker && (
              <>
                <Backdrop
                  onClick={() => setShowThemePicker(false)}
                  zIndex="z-40"
                />
                <div className="absolute top-20 right-6 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 z-50 grid grid-cols-4 gap-3 w-64 p-5 animate-in fade-in zoom-in-95 duration-300">
                  {MORANDI_THEMES.map((t, idx) => (
                    <button
                      key={t.color}
                      onClick={() => {
                        setThemeIndex(idx);
                        setShowThemePicker(false);
                      }}
                      className="w-10 h-10 rounded-2xl border-2 transition-all hover:scale-110 hover:shadow-md group relative"
                      style={{
                        backgroundColor: t.color,
                        borderColor:
                          themeColor === t.color ? "#333" : "transparent",
                      }}
                    >
                      {themeColor === t.color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check
                            className="w-4 h-4 text-white/80"
                            strokeWidth={3}
                          />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Progress Bar & Range Toggle */}
          {viewMode !== "log" && viewMode !== "stats" && (
            <div className="mb-6 flex gap-2 items-center">
              <div className="relative h-8 flex-1 bg-white/60 rounded-2xl overflow-hidden shadow-sm border border-white/60">
                <div
                  className="h-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) flex items-center justify-end pr-3 relative"
                  style={{
                    width: `${Math.max(stats.rate, 8)}%`,
                    backgroundColor: themeColor,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                </div>
                <div className="absolute inset-0 flex justify-between items-center px-4 text-xs font-bold pointer-events-none">
                  <span
                    className={`drop-shadow-sm transition-colors duration-300 ${
                      stats.rate > 12 ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {stats.rate}% 完成
                  </span>
                  <div className="flex gap-1 items-center text-gray-400 font-medium">
                    <span style={{ color: themeColor }} className="text-sm">
                      {stats.completed}
                    </span>
                    <span className="text-[10px] opacity-50">/</span>
                    <span>{stats.total}</span>
                  </div>
                </div>
              </div>

              {/* Range Toggle Button (Click to cycle) */}
              <div className="relative">
                <button
                  onClick={handleToggleRange}
                  // 修改：去掉 padding px-3 改为 px-4，增加 justify-center, 移除图标和 gap
                  className="h-8 px-4 rounded-2xl bg-white/60 border border-white/60 text-xs font-bold text-gray-500 flex items-center justify-center hover:bg-white transition-colors shadow-sm whitespace-nowrap active:scale-95"
                >
                  {
                    PROGRESS_RANGES.find((r) => r.id === progressBarRange)
                      ?.label
                  }
                </button>
              </div>
            </div>
          )}

          {/* List Controls */}
          {viewMode === "list" && (
            <div className="flex items-center gap-3 h-12">
              {isSearchMode ? (
                <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200 relative z-40">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="搜索任务..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-white rounded-xl text-sm font-medium outline-none focus:ring-2 transition-all text-gray-700 shadow-lg border border-transparent"
                      style={{ "--tw-ring-color": `${themeColor}40` }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsSearchMode(false);
                      setSearchQuery("");
                    }}
                    className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-500 transition-colors shadow-md"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide p-1 items-center">
                    {[
                      { id: "active", label: "进行中" },
                      { id: "completed", label: "已完成" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setFilterType(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all font-bold flex-shrink-0 border border-transparent ${
                          filterType === tab.id
                            ? "text-white shadow-md transform scale-105"
                            : "bg-white/40 text-gray-500 hover:bg-white/70"
                        }`}
                        style={
                          filterType === tab.id
                            ? {
                                backgroundColor: themeColor,
                                boxShadow: `0 4px 12px ${themeColor}40`,
                              }
                            : {}
                        }
                      >
                        {tab.label}
                      </button>
                    ))}

                    {filterType !== "completed" &&
                      totalPages > 1 &&
                      currentPage > 1 && (
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-2 rounded-full bg-white/40 hover:bg-white/70 text-gray-500 border border-transparent transition-all flex items-center justify-center ml-1 shadow-sm"
                          title="回到第一页"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                      )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setIsSearchMode(true)}
                      className="p-2.5 rounded-xl bg-white/40 hover:bg-white/80 text-gray-500 transition-all border border-transparent hover:shadow-sm"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowTagFilterMenu(!showTagFilterMenu)}
                        className={`p-2.5 rounded-xl flex items-center justify-center transition-all border border-transparent ${
                          activeTagFilters.length > 0
                            ? "bg-gray-800 text-white shadow-md"
                            : "bg-white/40 text-gray-500 hover:bg-white/80 hover:shadow-sm"
                        }`}
                        style={{
                          position: "relative",
                          zIndex: showTagFilterMenu ? 51 : "auto",
                        }}
                      >
                        {activeTagFilters.length > 0 ? (
                          <span className="text-xs font-bold">
                            {activeTagFilters.length}
                          </span>
                        ) : (
                          <Filter className="w-4 h-4" />
                        )}
                      </button>

                      {showTagFilterMenu && (
                        <>
                          <Backdrop
                            onClick={() => setShowTagFilterMenu(false)}
                            zIndex="z-40"
                          />
                          <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/60 z-50 w-44 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 max-h-80 overflow-y-auto">
                            <button
                              onClick={() => {
                                setActiveTagFilters([]);
                                setShowTagFilterMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors text-gray-500"
                            >
                              清除筛选
                            </button>
                            <div className="h-px bg-gray-100 my-1"></div>

                            <FilterOption
                              onClick={() => toggleFilter(NO_TAG_ID)}
                              color="#9CA3AF"
                              label="🔘 只看无标签"
                              active={activeTagFilters.includes(NO_TAG_ID)}
                            />

                            <div className="h-px bg-gray-100 my-1"></div>

                            {FIXED_TAGS.map((tag) => (
                              <FilterOption
                                key={tag.id}
                                onClick={() => toggleFilter(tag.id)}
                                color={
                                  tag.id === "forgettable"
                                    ? MORANDI_YELLOW
                                    : tag.color || themeColor
                                }
                                label={tag.label}
                                active={activeTagFilters.includes(tag.id)}
                                dark={tag.id === "important"}
                              />
                            ))}

                            {customTagsList.length > 0 && (
                              <div className="h-px bg-gray-100 my-1"></div>
                            )}
                            {customTagsList.map((tag) => (
                              <FilterOption
                                key={tag}
                                onClick={() => toggleFilter(tag)}
                                color={themeColor}
                                label={tag}
                                active={activeTagFilters.includes(tag)}
                                dark
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        {/* Main Content */}
        <main
          className="flex-1 flex flex-col overflow-hidden relative"
          ref={listContainerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={viewMode === "list" ? onTouchStart : undefined}
          onTouchMove={viewMode === "list" ? onTouchMove : undefined}
          onTouchEnd={viewMode === "list" ? onTouchEnd : undefined}
        >
          {/* A. List View */}
          {viewMode === "list" && (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between pb-24 scroll-smooth snap-y snap-mandatory overscroll-contain relative z-0 scrollbar-hide">
              <div className="space-y-3.5 snap-start">
                {(filterType !== "completed" &&
                  currentViewTasks.length === 0 &&
                  baseFilteredTasks.length === 0) ||
                (filterType === "completed" &&
                  Object.values(groupedCompletedTasks || {}).every(
                    (g) => g.length === 0
                  )) ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 h-full opacity-60">
                    <div className="bg-white/50 p-8 rounded-full mb-6 backdrop-blur-sm shadow-sm">
                      <AlertCircle
                        className="w-12 h-12 opacity-30"
                        style={{ color: themeColor }}
                      />
                    </div>
                    <p className="text-sm text-gray-400 font-medium tracking-wide">
                      暂无任务
                    </p>
                  </div>
                ) : (
                  <>
                    {filterType === "completed" && groupedCompletedTasks ? (
                      <div className="space-y-4">
                        {renderCompletedGroup(
                          "今日完成",
                          "today",
                          groupedCompletedTasks.today
                        )}
                        {renderCompletedGroup(
                          "近三天",
                          "threeDays",
                          groupedCompletedTasks.threeDays
                        )}
                        {renderCompletedGroup(
                          "一周内",
                          "week",
                          groupedCompletedTasks.week
                        )}
                        {renderCompletedGroup(
                          "一个月内",
                          "month",
                          groupedCompletedTasks.month
                        )}
                        {renderCompletedGroup(
                          "更早之前",
                          "earlier",
                          groupedCompletedTasks.earlier
                        )}
                      </div>
                    ) : (
                      <div
                        key={currentPage}
                        className={`space-y-3.5 animate-in fade-in ease-out fill-mode-forwards ${
                          slideDirection === "next"
                            ? "slide-in-from-right-8"
                            : "slide-in-from-left-8"
                        }`}
                      >
                        {currentViewTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            toggleTask={toggleTask}
                            deleteTask={deleteTask}
                            themeColor={themeColor}
                            onShowDetail={setSelectedTask}
                            isDragging={task.id === draggedTaskId}
                            onPointerDown={handlePointerDown}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* B. Timeline View */}
          {viewMode === "timeline" && (
            <div className="flex-1 flex flex-col h-full relative">
              <div className="flex items-center justify-between px-6 py-3 bg-white/30 border-b border-white/20 flex-shrink-0 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span
                    className="font-serif font-bold text-base text-gray-700"
                    style={{ color: themeColor }}
                  >
                    {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}
                    月
                  </span>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="flex bg-white/40 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => setCalendarViewType("created")}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                      calendarViewType === "created"
                        ? "bg-white shadow-sm text-gray-800"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    按创建
                  </button>
                  <button
                    onClick={() => setCalendarViewType("due")}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                      calendarViewType === "due"
                        ? "bg-white shadow-sm text-gray-800"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    按截止
                  </button>
                </div>
              </div>

              <div
                ref={timelineRef}
                className="flex-1 overflow-x-auto flex snap-x snap-mandatory scrollbar-hide"
              >
                {daysInMonth.map((date) => {
                  const dateStr = date.toLocaleDateString("zh-CN");
                  const dayTasks = tasksByDate[dateStr] || [];
                  const isToday =
                    new Date().toLocaleDateString("zh-CN") === dateStr;
                  return (
                    <div
                      key={dateStr}
                      id={`day-col-${dateStr}`}
                      className={`flex-shrink-0 w-[20%] min-w-[80px] border-r border-white/20 flex flex-col snap-start h-full transition-colors ${
                        isToday ? "bg-white/40" : ""
                      }`}
                    >
                      <div
                        className={`text-center py-4 border-b border-white/20 flex-shrink-0 sticky top-0 z-10 bg-white/80 backdrop-blur-sm`}
                      >
                        <div
                          className="text-lg font-serif font-bold mb-1"
                          style={{ color: isToday ? themeColor : "#9CA3AF" }}
                        >
                          {date.getDate()}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                          {
                            ["日", "一", "二", "三", "四", "五", "六"][
                              date.getDay()
                            ]
                          }
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar p-1 scrollbar-hide">
                        {dayTasks.map((task) => {
                          const styles = getCalendarTaskStyle(task);
                          return (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className={`px-2 py-2 text-xs font-medium leading-tight cursor-pointer transition-opacity border-b border-white/10 ${styles.className}`}
                              style={styles.style}
                            >
                              <span className={`break-words line-clamp-3`}>
                                {task.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleReturnToToday}
                className="absolute bottom-24 right-6 p-3 rounded-full shadow-lg text-white transition-transform active:scale-95 z-30"
                style={{ backgroundColor: themeColor }}
                title="回到今天"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* C. Log View */}
          {viewMode === "log" && (
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-8 relative min-h-[60vh]">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200/50 pb-4">
                  <h2 className="font-serif font-bold text-xl text-gray-700">
                    文本日志
                  </h2>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-colors bg-white border border-gray-100 shadow-sm active:scale-95"
                    style={{ color: copySuccess ? "#10B981" : themeColor }}
                  >
                    {copySuccess ? (
                      <CheckCheck className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copySuccess ? "已复制" : "复制全部"}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-600 leading-loose font-mono bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                  {generateTextLog()}
                </pre>
              </div>
            </div>
          )}

          {/* D. Stats View */}
          {viewMode === "stats" && (
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-6 relative min-h-[60vh]">
                <h2 className="font-serif font-bold text-xl text-gray-700 mb-6">
                  数据趋势
                </h2>
                <div className="flex gap-3 mb-8">
                  {[7, 30, 100].map((days) => (
                    <button
                      key={days}
                      onClick={() => setStatsRange(days)}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all border border-transparent ${
                        statsRange === days
                          ? "text-white shadow-md scale-105"
                          : "bg-white/60 text-gray-500 hover:bg-white hover:shadow-sm"
                      }`}
                      style={
                        statsRange === days
                          ? { backgroundColor: themeColor }
                          : {}
                      }
                    >
                      近{days}天
                    </button>
                  ))}
                </div>
                <div className="w-full h-64 relative border-l border-b border-gray-300/50 mb-8">
                  {(() => {
                    if (chartData.length === 0)
                      return (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                          数据不足
                        </div>
                      );
                    const maxVal = Math.max(
                      ...chartData.map((d) =>
                        Math.max(d.created, d.completed, 5)
                      )
                    );
                    const width = 100;
                    const height = 100;
                    const dx =
                      chartData.length > 1 ? width / (chartData.length - 1) : 0;
                    const createdPoints = chartData
                      .map(
                        (d, i) =>
                          `${chartData.length > 1 ? i * dx : 50},${
                            height - (d.created / maxVal) * height
                          }`
                      )
                      .join(" ");
                    const completedPoints = chartData
                      .map(
                        (d, i) =>
                          `${chartData.length > 1 ? i * dx : 50},${
                            height - (d.completed / maxVal) * height
                          }`
                      )
                      .join(" ");
                    return (
                      <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full h-full overflow-visible drop-shadow-sm"
                      >
                        <text
                          x="-2"
                          y="0"
                          fontSize="4"
                          fill="#999"
                          textAnchor="end"
                        >
                          {maxVal}
                        </text>
                        <text
                          x="-2"
                          y={height}
                          fontSize="4"
                          fill="#999"
                          textAnchor="end"
                        >
                          0
                        </text>
                        {[0.25, 0.5, 0.75].map((p) => (
                          <line
                            key={p}
                            x1="0"
                            y1={height * p}
                            x2={width}
                            y2={height * p}
                            stroke="#ddd"
                            strokeWidth="0.5"
                            strokeDasharray="3"
                            strokeOpacity="0.5"
                          />
                        ))}
                        {chartData.length > 1 ? (
                          <>
                            <polyline
                              points={createdPoints}
                              fill="none"
                              stroke="#F87171"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="drop-shadow-sm"
                            />
                            <polyline
                              points={completedPoints}
                              fill="none"
                              stroke={themeColor}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="drop-shadow-sm"
                            />
                          </>
                        ) : (
                          <>
                            <circle
                              cx="50"
                              cy={
                                height -
                                (chartData[0].created / maxVal) * height
                              }
                              r="2"
                              fill="#F87171"
                            />
                            <circle
                              cx="50"
                              cy={
                                height -
                                (chartData[0].completed / maxVal) * height
                              }
                              r="2"
                              fill={themeColor}
                            />
                          </>
                        )}
                        {chartData.map((d, i) => {
                          const showLabel =
                            i === 0 ||
                            i === chartData.length - 1 ||
                            (chartData.length > 10 &&
                              i % Math.ceil(chartData.length / 5) === 0);
                          if (!showLabel) return null;
                          const x = chartData.length > 1 ? i * dx : 50;
                          return (
                            <text
                              key={i}
                              x={x}
                              y={height + 8}
                              fontSize="3"
                              fill="#999"
                              textAnchor="middle"
                            >
                              {d.date}
                            </text>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>
                <div className="flex justify-center gap-8 text-xs font-medium border-t border-gray-200/50 pt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 shadow-sm" />
                    <span className="text-gray-500">发布任务</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shadow-sm"
                      style={{ backgroundColor: themeColor }}
                    />
                    <span className="text-gray-500">完成任务</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Pagination Dots & Number (Fixed at bottom) */}
        {viewMode === "list" &&
          filterType !== "completed" &&
          totalPages > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none z-30">
              {/* Dots */}
              <div className="flex justify-center gap-2.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-sm ${
                      i + 1 === currentPage
                        ? "w-8 opacity-100"
                        : "w-1.5 opacity-30"
                    }`}
                    style={{
                      backgroundColor:
                        i + 1 === currentPage ? themeColor : "#9CA3AF",
                    }}
                  />
                ))}
              </div>
              {/* Number */}
              <span
                className="text-sm font-bold opacity-60 font-serif"
                style={{ color: themeColor }}
              >
                {currentPage} <span className="text-[10px] opacity-50">/</span>{" "}
                {totalPages}
              </span>
            </div>
          )}

        {/* FAB (Floating Action Button) */}
        {viewMode !== "log" && viewMode !== "stats" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="absolute bottom-8 right-6 p-4 rounded-[2rem] text-white transition-all duration-300 hover:scale-110 active:scale-95 z-50 group"
            style={{
              backgroundImage: `linear-gradient(135deg, ${themeColor}, ${themeColor}ee)`,
              boxShadow: `0 10px 30px -5px ${themeColor}90`,
            }}
          >
            <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}

        {/* Add Modal (Glass Panel) - 包含标签选择 */}
        {isAddModalOpen && (
          <div className="absolute inset-0 z-[60] flex flex-col justify-start pt-[4vh] bg-gray-900/20 backdrop-blur-sm p-6 animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-2xl w-full max-w-sm mx-auto rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden animate-in slide-in-from-top-10 duration-500 border border-white/60 ring-1 ring-white/50 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-5 border-b border-gray-100/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  {/* Mode Toggle - 增大字体 */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setAddMode("single")}
                    className={`text-lg font-black transition-colors ${
                      addMode === "single" ? "text-gray-800" : "text-gray-300"
                    }`}
                  >
                    单条
                  </button>
                  <div className="w-0.5 h-4 bg-gray-200 rounded-full"></div>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setAddMode("batch")}
                    className={`text-lg font-black transition-colors ${
                      addMode === "batch" ? "text-gray-800" : "text-gray-300"
                    }`}
                  >
                    批量
                  </button>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100/80 text-gray-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Content Area - 缩窄间距: 改 p-5 为 px-5 pt-2 pb-5 */}
              <div className="px-5 pt-2 pb-5 flex-1 overflow-y-auto scrollbar-hide min-h-0">
                {/* 标签选择区域 (增大字体) */}
                <div className="mb-3 space-y-2">
                  {/* 行1: 固定3个 */}
                  <div className="flex gap-2">
                    {FIXED_TAGS.map((tag) => (
                      <TagBtn
                        key={tag.id}
                        label={tag.label}
                        color={
                          tag.id === "forgettable" ? MORANDI_YELLOW : themeColor
                        }
                        active={newTaskTags.includes(tag.id)}
                        onClick={() => toggleNewTaskTag(tag.id)}
                        // Styling logic for presets
                        light={tag.id === "urgent"}
                        dark={tag.id === "important"}
                        customText={tag.id === "forgettable" ? "#78350F" : null}
                        // 字体从 text-sm 增大到 text-base
                        className="flex-1 justify-center text-base py-3"
                      />
                    ))}
                  </div>
                  {/* 行2: 自定义标签 */}
                  <div className="flex gap-2 flex-wrap">
                    {customTagsList.map((tag) => (
                      <div key={tag} className="relative group">
                        <TagBtn
                          label={tag}
                          color={themeColor}
                          active={newTaskTags.includes(tag)}
                          onClick={() => toggleNewTaskTag(tag)}
                          light
                          className="text-base py-2 px-4"
                        />
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomTag(tag);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 批量模式下也显示日期选择 (通用) - 缩窄间距 */}
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400 ml-1" />
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="bg-transparent text-sm font-medium text-gray-600 outline-none flex-1"
                  />
                  {newTaskDueDate && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setNewTaskDueDate("")}
                      className="p-1 rounded-full hover:bg-gray-200 text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <textarea
                  autoFocus
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    addMode === "batch"
                      ? "批量模式: 每行一个任务..."
                      : "输入任务内容..."
                  }
                  className="w-full h-28 p-4 rounded-2xl bg-gray-50/50 border border-gray-200/50 focus:bg-white focus:ring-2 focus:border-transparent outline-none resize-none text-gray-800 leading-relaxed transition-all placeholder-gray-400 mb-3 text-base"
                  style={{ "--tw-ring-color": themeColor }}
                />

                {/* 子任务输入 (仅单条模式) */}
                {addMode === "single" && (
                  <div className="mb-2">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newSubtaskInput}
                        onChange={(e) => setNewSubtaskInput(e.target.value)}
                        placeholder="添加子任务..."
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white outline-none"
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddSubtask()
                        }
                      />
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleAddSubtask}
                        className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    {newTaskSubtasks.length > 0 && (
                      <div className="space-y-1 max-h-20 overflow-y-auto scrollbar-hide">
                        {newTaskSubtasks.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-2 text-sm text-gray-600 pl-2 py-1"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                            {st.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fixed Footer - 独立于滚动区域，防止键盘遮挡 */}
              <div className="p-4 border-t border-gray-100/50 shrink-0 bg-white/50 backdrop-blur-sm">
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-gray-500 bg-gray-100/80 hover:bg-gray-200/80 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={!inputText.trim()}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 hover:shadow-2xl hover:-translate-y-0.5"
                    style={{
                      backgroundColor: themeColor,
                      boxShadow: `0 8px 25px ${themeColor}50`,
                    }}
                  >
                    确认添加
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal (Refactored) */}
        {selectedTask && (
          <>
            <Backdrop onClick={() => setSelectedTask(null)} zIndex="z-[65]" />
            <div
              className={`absolute inset-0 z-[70] flex flex-col transition-all duration-300 ${
                isDetailEditing ? "justify-start pt-[4vh]" : "justify-center"
              } items-center p-6 animate-in fade-in pointer-events-none`}
            >
              {/* 修改点1：max-h-[85vh] 改为 max-h-[60vh]，缩小高度占用 */}
              <div className="bg-white/95 backdrop-blur-2xl w-full max-w-sm rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-300 relative border border-white/60 ring-1 ring-white/50 pointer-events-auto flex flex-col max-h-[60vh]">
                <div className="p-4 border-b border-gray-100/50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gray-100/50 text-gray-500">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="font-serif font-bold text-xl text-gray-800">
                      任务详情
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="p-2 rounded-full hover:bg-gray-100/80 text-gray-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 修改点2：p-5 改为 px-5 pt-2 pb-5，大幅减少顶部空白 */}
                <div className="px-5 pt-2 pb-5 overflow-y-auto scrollbar-hide">
                  {/* 标签管理 */}
                  <div className="mb-4 space-y-2">
                    <div className="flex gap-1.5">
                      {FIXED_TAGS.map((tag) => (
                        <TagBtn
                          key={tag.id}
                          label={tag.label}
                          color={
                            tag.id === "forgettable"
                              ? MORANDI_YELLOW
                              : themeColor
                          }
                          active={(selectedTask.tags || []).includes(tag.id)}
                          onClick={() =>
                            updateTaskTags(
                              selectedTask.id,
                              tag.id,
                              !(selectedTask.tags || []).includes(tag.id)
                            )
                          }
                          light={tag.id === "urgent"}
                          dark={tag.id === "important"}
                          customText={
                            tag.id === "forgettable" ? "#78350F" : null
                          }
                          // 字体从 text-sm 增大到 text-base
                          className="flex-1 justify-center text-base py-3"
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {/* Custom Tags & Add Button */}
                      {customTagsList.map((tag) => (
                        <div key={tag} className="relative group">
                          <TagBtn
                            label={tag}
                            color={themeColor}
                            active={(selectedTask.tags || []).includes(tag)}
                            onClick={() =>
                              updateTaskTags(
                                selectedTask.id,
                                tag,
                                !(selectedTask.tags || []).includes(tag)
                              )
                            }
                            light
                            // 字体从 text-sm 增大到 text-base
                            className="text-base py-2 px-4"
                          />
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomTag(tag);
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <form
                        onSubmit={handleCreateCustomTag}
                        className="flex gap-1"
                      >
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="+"
                          className="w-8 px-1 py-2 text-center text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:w-20 transition-all outline-none"
                        />
                      </form>
                    </div>
                  </div>

                  {/* 日期设置区 */}
                  <div className="mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={selectedTask.dueDate || ""}
                      onChange={(e) =>
                        updateTaskDueDate(selectedTask.id, e.target.value)
                      }
                      className="bg-transparent text-sm font-medium text-gray-600 outline-none flex-1"
                    />
                    {selectedTask.dueDate && (
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateTaskDueDate(selectedTask.id, null)}
                        className="p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
                        title="清除日期"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <textarea
                    value={selectedTask.text}
                    onFocus={() => setIsDetailEditing(true)}
                    // Removed onBlur to fix jumping/closing issue
                    onChange={(e) => {
                      const newText = e.target.value;
                      setSelectedTask((prev) => ({
                        ...prev,
                        text: newText,
                      }));
                      setTasks((prevTasks) =>
                        prevTasks.map((t) =>
                          t.id === selectedTask.id ? { ...t, text: newText } : t
                        )
                      );
                    }}
                    className="w-full bg-transparent text-gray-700 text-lg leading-relaxed border-t border-gray-100/80 pt-4 font-medium outline-none resize-none h-auto min-h-[100px] focus:bg-white/50 transition-colors rounded-lg px-2 -mx-2 mb-4"
                    placeholder="输入任务内容..."
                  />

                  {/* 子任务模块 */}
                  <div className="mb-4">
                    <div className="space-y-2 mb-3">
                      {(selectedTask.subtasks || []).map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center gap-2 group"
                        >
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              updateSubtask(selectedTask.id, st.id)
                            }
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              st.completed
                                ? "bg-gray-400 border-gray-400"
                                : "border-gray-300"
                            }`}
                          >
                            {st.completed && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>
                          <span
                            className={`text-sm flex-1 ${
                              st.completed
                                ? "text-gray-400 line-through"
                                : "text-gray-600"
                            }`}
                          >
                            {st.text}
                          </span>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              deleteSubtask(selectedTask.id, st.id)
                            }
                            className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="添加子任务..."
                      // Add onFocus to trigger modal slide up
                      onFocus={() => setIsDetailEditing(true)}
                      // Removed onBlur
                      className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg outline-none border border-transparent focus:border-gray-200"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addSubtaskToExisting(selectedTask.id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100/80 text-[10px] text-gray-400 flex justify-between items-center">
                    <span>
                      创建:{" "}
                      {new Date(selectedTask.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSelectedTask(null)}
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 font-bold text-base hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSelectedTask(null)}
                        className="px-4 py-2 rounded-lg text-white font-bold text-base shadow-sm transition-all active:scale-95"
                        style={{ backgroundColor: themeColor }}
                      >
                        确认
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Undo Toast */}
        {showUndoToast && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <button
              onClick={handleUndo}
              className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 text-sm font-medium hover:scale-105 transition-transform"
            >
              <Undo2 className="w-4 h-4" />
              已删除 (点击撤销)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub Components ---

const NavIcon = ({ onClick, active, icon: Icon, themeColor }) => (
  <button
    onClick={onClick}
    className={`p-2.5 rounded-full transition-all duration-300 ${
      active
        ? "bg-white shadow-sm scale-110"
        : "hover:bg-white/50 hover:scale-105 text-gray-400"
    }`}
    style={active ? { color: themeColor } : {}}
  >
    <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
  </button>
);

const FilterOption = ({ onClick, color, label, active, dark }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-3 rounded-xl text-xs font-bold hover:bg-gray-50/80 transition-all flex items-center gap-3 group"
    style={{ color: color, filter: dark ? "brightness(0.7)" : "none" }}
  >
    <span
      className={`w-2 h-2 rounded-full transition-all ${
        active
          ? "scale-125 ring-2 ring-offset-2 ring-offset-white"
          : "opacity-40 group-hover:opacity-100"
      }`}
      style={{ backgroundColor: color, "--tw-ring-color": color }}
    ></span>
    {label}
  </button>
);

const TagBtn = ({
  label,
  color,
  active,
  onClick,
  light,
  dark,
  customText,
  compact,
  className,
}) => (
  <button
    onMouseDown={(e) => e.preventDefault()} // 防止抢占焦点导致软键盘收起
    onClick={onClick}
    className={`${
      compact ? "px-3 py-2 text-[10px]" : "px-5 py-2.5 text-xs"
    } font-bold border transition-all duration-300 active:scale-95 rounded-xl ${
      active
        ? "border-transparent shadow-md scale-105"
        : "bg-gray-50/50 text-gray-400 border-transparent hover:bg-gray-100"
    } ${className || ""}`}
    style={
      active
        ? {
            backgroundColor: light ? `${color}15` : color,
            color: customText || (light ? color : "white"),
            borderColor: light ? color : "transparent",
          }
        : {}
    }
  >
    {label}
  </button>
);

function TaskItem({
  task,
  toggleTask,
  deleteTask,
  themeColor,
  onShowDetail,
  isDragging,
  onPointerDown,
}) {
  const dateObj = new Date(task.createdAt);
  const dateWatermark = `${dateObj.getMonth() + 1}.${dateObj.getDate()}`;
  const isLongText = task.text.length > 30;

  const getDueStatus = () => {
    if (!task.dueDate || task.completed) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return {
        text: `逾期 ${Math.abs(diffDays)} 天`,
        color: themeColor,
        isOverdue: true,
      };
    if (diffDays === 0) return { text: "今天截止", color: `${themeColor}CC` };
    if (diffDays === 1) return { text: "明天截止", color: `${themeColor}80` };
    return { text: `${diffDays}天后截止`, color: `${themeColor}60` };
  };

  const dueStatus = getDueStatus();

  const subtaskProgress =
    task.subtasks && task.subtasks.length > 0
      ? `${task.subtasks.filter((t) => t.completed).length}/${
          task.subtasks.length
        }`
      : null;

  const getGradientStyle = () => {
    const tags = task.tags || [];
    const isUrgent = tags.includes("urgent");
    const isImportant = tags.includes("important");
    const isForgettable = tags.includes("forgettable");

    // 优先级颜色逻辑
    const PRIORITY_COLORS = {
      URGENT_IMPORTANT: "#C98C93",
      IMPORTANT: "#6B8E88",
      URGENT: "#9C8CB9",
      FORGETTABLE: "#E6D5A7",
    };

    if (isUrgent && isImportant)
      return {
        background: `linear-gradient(90deg, ${themeColor}E6 0%, ${themeColor}33 40%)`,
        Icon: AlertTriangle,
        iconColor: themeColor,
      };
    if (isImportant)
      return {
        background: `linear-gradient(90deg, ${themeColor}BF 0%, ${themeColor}26 40%)`,
        Icon: Star,
        iconColor: `${themeColor}80`,
      };
    if (isUrgent)
      return {
        background: `linear-gradient(90deg, ${themeColor}80 0%, ${themeColor}1A 40%)`,
        Icon: Zap,
        iconColor: `${themeColor}26`,
      };
    if (isForgettable)
      return {
        background: `linear-gradient(90deg, ${MORANDI_YELLOW}E6 0%, ${MORANDI_YELLOW}33 40%)`,
        Icon: Coffee,
        iconColor: MORANDI_YELLOW,
        isYellow: true,
      };
    return null;
  };
  const styleConfig = getGradientStyle();

  const watermarkStyle =
    styleConfig && !styleConfig.isYellow
      ? { color: "white", opacity: 0.15 }
      : { color: themeColor, opacity: 0.06 };

  return (
    <div
      data-task-id={task.id}
      onPointerDown={(e) => onPointerDown && onPointerDown(e, task.id)}
      className={`group relative bg-white/80 backdrop-blur-md rounded-[1.2rem] px-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-white/60 transition-all duration-300 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-1 overflow-hidden h-[60px] flex items-center select-none ${
        task.completed ? "opacity-50 grayscale-[0.8]" : ""
      } ${isDragging ? "dragging-card z-50" : ""}`}
    >
      {styleConfig && !task.completed && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: styleConfig.background }}
        />
      )}

      {styleConfig && styleConfig.Icon && !task.completed && (
        <div className="absolute right-[-10px] bottom-[-15px] z-0 pointer-events-none opacity-15 transform rotate-12">
          <styleConfig.Icon
            size={80}
            color={styleConfig.iconColor}
            strokeWidth={1.5}
          />
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <span
          className="text-[5rem] font-serif font-bold whitespace-nowrap leading-none tracking-tighter"
          style={watermarkStyle}
        >
          {dateWatermark}
        </span>
      </div>

      <div className="relative z-10 flex items-center gap-4 w-full h-full">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTask(task.id);
          }}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-[2px] flex items-center justify-center transition-all duration-300 cursor-pointer z-20 ${
            task.completed
              ? "scale-90"
              : "bg-transparent hover:scale-110 border-gray-300"
          }`}
          style={
            task.completed
              ? {
                  backgroundColor: "#f8f9fa",
                  borderColor: themeColor,
                  color: themeColor,
                }
              : {}
          }
        >
          {task.completed && <Check className="w-3 h-3" strokeWidth={4} />}
        </button>

        {/* Text & Info */}
        <div
          className="flex-1 min-w-0 cursor-pointer h-full flex flex-col justify-center"
          onClick={() => onShowDetail && onShowDetail(task)}
        >
          <div className="flex items-center gap-2">
            <p
              className={`text-[15px] font-medium break-words whitespace-pre-wrap line-clamp-1 ${
                task.completed
                  ? "line-through text-gray-400 decoration-gray-300"
                  : "text-gray-700"
              }`}
            >
              {task.text}
            </p>
            {subtaskProgress && (
              <div className="flex items-center gap-0.5 text-[10px] text-gray-400 bg-white/50 px-1.5 rounded-md">
                <ListChecks className="w-3 h-3" /> {subtaskProgress}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Merged Interaction Area (Fixed Layout) */}
        <div className="relative flex flex-col items-end justify-center h-full z-20 w-16 group/right">
          {/* Default: Due Date (Big Text) - Hidden on Hover */}
          <div
            className={`transition-all duration-200 absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-end ${
              task.completed ? "opacity-0" : "group-hover/right:opacity-0"
            }`}
          >
            {dueStatus && (
              <span
                className="text-xs font-bold whitespace-nowrap"
                style={{
                  color: dueStatus.color,
                  fontSize: dueStatus.isOverdue ? "14px" : "11px",
                }}
              >
                {dueStatus.text}
              </span>
            )}
          </div>

          {/* Hover: Delete Button (Reveal) - Visible on Hover */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 scale-50 group-hover/right:opacity-100 group-hover/right:scale-100 transition-all duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(task);
              }}
              className="p-2 bg-white/80 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-full shadow-sm transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
