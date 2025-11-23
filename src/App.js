import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Trash2, Check, Search, ListTodo, CalendarDays, LayoutList, Palette, 
  FileText, Copy, CheckCheck, X, ChevronLeft, ChevronRight, ChevronDown, 
  LineChart, XCircle, AlertCircle, TrendingUp, Filter, Tag, RotateCcw, Maximize2,
  ChevronsLeft, Zap, Star, Coffee, AlertTriangle, Settings2
} from 'lucide-react';

/**
 * 移动端待办事项管理应用 (v10.1 - 新建打标 & 无标签筛选版)
 * - 新增：筛选器增加 "只看无标签"
 * - 新增：新建任务弹窗增加标签选择功能 (含互斥逻辑)
 * - 优化：标签选择逻辑统一
 */

// --- 莫兰迪高级色板 ---
const MORANDI_THEMES = [
  { color: '#6B8E88', name: '青瓷 (Celadon)' },
  { color: '#9C8CB9', name: '雾紫 (Dusty Purple)' },
  { color: '#C98C93', name: '胭脂 (Rouge)' },
  { color: '#7FB0A2', name: '薄荷 (Mint)' },
  { color: '#6D7C8C', name: '岩灰 (Slate)' },
  { color: '#B59078', name: '褐土 (Clay)' },
  { color: '#95A5A6', name: '冷灰 (Concrete)' },
  { color: '#D4A5D9', name: '丁香 (Lilac)' },
];

const MORANDI_YELLOW = '#E6D5A7'; 
const ITEMS_PER_PAGE = 7;

// --- 优先级配色常量 ---
const PRIORITY_COLORS = {
  URGENT_IMPORTANT: '#C98C93', 
  IMPORTANT: '#6B8E88',       
  URGENT: '#9C8CB9',          
  FORGETTABLE: '#E6D5A7',     
};

// 特殊筛选ID
const NO_TAG_ID = '__no_tag__';

// 默认预设标签
const PRESET_TAGS = [
  { id: 'urgent', label: '⚡ 紧急', color: PRIORITY_COLORS.URGENT },
  { id: 'important', label: '⭐ 重要', color: PRIORITY_COLORS.IMPORTANT },
  { id: 'forgettable', label: '🧠 易忘', color: PRIORITY_COLORS.FORGETTABLE }
];

export default function App() {
  // --- 状态管理 ---
  const [tasks, setTasks] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('todoList');
        return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
    }
    return [];
  });

  // 自定义标签列表状态
  const [customTagsList, setCustomTagsList] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('customTags');
        return saved ? JSON.parse(saved) : ['工作', '生活']; 
      } catch (e) { return ['工作', '生活']; }
    }
    return ['工作', '生活'];
  });

  // UI 状态
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [inputText, setInputText] = useState('');
  const [newTagInput, setNewTagInput] = useState(''); 
  
  // 新增：新建任务时的标签状态
  const [newTaskTags, setNewTaskTags] = useState([]);

  const [filterType, setFilterType] = useState('active'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  const [activeTagFilters, setActiveTagFilters] = useState([]); 
  const [showTagFilterMenu, setShowTagFilterMenu] = useState(false);

  const [viewMode, setViewMode] = useState('list'); 
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statsRange, setStatsRange] = useState(7);
  const [currentPage, setCurrentPage] = useState(1);
  const [slideDirection, setSlideDirection] = useState('next');
  const [expandedGroups, setExpandedGroups] = useState({
    today: false, threeDays: false, week: false, month: false, earlier: false
  });
  const [isDetailEditing, setIsDetailEditing] = useState(false);

  const [themeIndex, setThemeIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedColor = localStorage.getItem('themeColor');
      const idx = MORANDI_THEMES.findIndex(t => t.color === savedColor);
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
    if (viewMode === 'timeline') {
      setTimeout(() => {
        const todayStr = new Date().toLocaleDateString('zh-CN');
        const todayEl = document.getElementById(`day-col-${todayStr}`);
        if (todayEl) {
          todayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
    }
  };

  const handleReturnToToday = () => {
    const now = new Date();
    const isSameMonth = currentMonth.getMonth() === now.getMonth() && currentMonth.getFullYear() === now.getFullYear();
    
    if (!isSameMonth) {
      setCurrentMonth(now);
    } else {
      scrollToToday();
    }
  };

  useEffect(() => { localStorage.setItem('todoList', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('themeColor', themeColor); }, [themeColor]);
  useEffect(() => { localStorage.setItem('customTags', JSON.stringify(customTagsList)); }, [customTagsList]);
  
  useEffect(() => { setCurrentPage(1); }, [filterType, searchQuery, activeTagFilters]); 
  useEffect(() => { scrollToToday(); }, [viewMode, currentMonth]);

  // --- 核心逻辑 ---
  const handleBatchAdd = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return;
    
    // 将选中的标签应用到所有新任务
    const newTasks = lines.map(line => ({
      id: crypto.randomUUID(),
      text: line,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      tags: [...newTaskTags] // 复制当前选中的标签
    }));

    setTasks([...newTasks, ...tasks]); 
    setInputText('');
    setNewTaskTags([]); // 重置标签选择
    setIsAddModalOpen(false); 
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const nextStatus = !task.completed;
        return { ...task, completed: nextStatus, completedAt: nextStatus ? new Date().toISOString() : null };
      }
      return task;
    }));
  };

  // 通用标签互斥处理逻辑
  const processTagMutex = (currentTags, tagToAdd) => {
    if (tagToAdd === 'forgettable') {
      // 如果选了易忘，清除紧急和重要
      const tempTags = currentTags.filter(t => t !== 'urgent' && t !== 'important');
      return [...new Set([...tempTags, tagToAdd])];
    } else if (tagToAdd === 'urgent' || tagToAdd === 'important') {
      // 如果选了紧急或重要，清除易忘
      const tempTags = currentTags.filter(t => t !== 'forgettable');
      return [...new Set([...tempTags, tagToAdd])];
    } else {
      // 自定义标签直接添加
      return [...new Set([...currentTags, tagToAdd])];
    }
  };

  // 1. 新建任务时的标签切换
  const toggleNewTaskTag = (tag) => {
    setNewTaskTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return processTagMutex(prev, tag);
      }
    });
  };

  // 2. 编辑任务时的标签更新
  const updateTaskTags = (taskId, tag, isActive) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const currentTags = task.tags || [];
        let newTags;
        
        if (isActive) {
          newTags = processTagMutex(currentTags, tag);
        } else {
          newTags = currentTags.filter(t => t !== tag);
        }
        
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({ ...task, tags: newTags });
        }
        return { ...task, tags: newTags };
      }
      return task;
    }));
  };

  const handleCreateCustomTag = (e) => {
    e.preventDefault();
    const tag = newTagInput.trim();
    if (tag && !customTagsList.includes(tag)) {
      setCustomTagsList([...customTagsList, tag]);
    }
    setNewTagInput('');
  };

  const handleDeleteCustomTag = (tagToDelete) => {
    if(window.confirm(`确定删除标签“${tagToDelete}”吗？`)) {
      setCustomTagsList(customTagsList.filter(t => t !== tagToDelete));
      setTasks(tasks.map(t => ({
        ...t,
        tags: t.tags ? t.tags.filter(tag => tag !== tagToDelete) : []
      })));
      setActiveTagFilters(activeTagFilters.filter(t => t !== tagToDelete));
      
      // 也要从新建任务的临时状态中移除
      setNewTaskTags(prev => prev.filter(t => t !== tagToDelete));
    }
  };

  const deleteTask = (task) => {
    if (window.confirm(`确定要删除“${task.text}”这个任务吗？`)) {
      setTasks(tasks.filter(t => t.id !== task.id));
      if (selectedTask && selectedTask.id === task.id) setSelectedTask(null);
    }
  };

  const getPriorityScore = (task) => {
    const tags = task.tags || [];
    if (tags.includes('urgent') && tags.includes('important')) return 3;
    if (tags.includes('important')) return 2;
    if (tags.includes('urgent')) return 1;
    return 0;
  };

  // 切换筛选器 (多选)
  const toggleFilter = (tag) => {
    setActiveTagFilters(prev => {
      // 如果点击了“无标签”，则清除其他筛选，只保留“无标签”
      // 或者：如果点击了其他标签，则清除“无标签”
      // 这里采用共存逻辑，但实际上 NoTag 和其他 Tag 是互斥的集合，交集为空。
      
      if (tag === NO_TAG_ID) {
         // 如果选中无标签，通常意味着用户只想看无标签的，清除其他
         return prev.includes(NO_TAG_ID) ? [] : [NO_TAG_ID];
      }

      // 如果选了普通标签，先清除 NO_TAG_ID
      let newFilters = prev.filter(t => t !== NO_TAG_ID);
      
      if (newFilters.includes(tag)) {
        return newFilters.filter(t => t !== tag);
      } else {
        return [...newFilters, tag];
      }
    });
  };

  // --- 数据处理 ---
  
  const checkFilterMatch = (task) => {
    if (activeTagFilters.length === 0) return true;
    
    // 处理“无标签”筛选
    if (activeTagFilters.includes(NO_TAG_ID)) {
       return !task.tags || task.tags.length === 0;
    }

    const taskTags = task.tags || [];
    return activeTagFilters.every(filter => taskTags.includes(filter));
  };

  const groupedCompletedTasks = useMemo(() => {
    if (filterType !== 'completed') return null;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const groups = { today: [], threeDays: [], week: [], month: [], earlier: [] };

    const completedTasks = tasks
      .filter(t => t.completed && (searchQuery ? t.text.toLowerCase().includes(searchQuery.toLowerCase()) : true))
      .filter(t => checkFilterMatch(t)) 
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

    completedTasks.forEach(task => {
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
    if (filterType === 'completed') return []; 
    let result = tasks.filter(task => {
      if (filterType === 'active' && task.completed) return false;
      if (searchQuery && !task.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (!checkFilterMatch(task)) return false; 
      return true;
    });
    result.sort((a, b) => {
      const scoreA = getPriorityScore(a);
      const scoreB = getPriorityScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return result;
  }, [tasks, filterType, searchQuery, activeTagFilters]);

  const totalPages = useMemo(() => {
    if (filterType === 'completed') return 1; 
    return Math.ceil(baseFilteredTasks.length / ITEMS_PER_PAGE) || 1;
  }, [baseFilteredTasks, filterType]);

  const currentViewTasks = useMemo(() => {
    if (filterType === 'completed') return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return baseFilteredTasks.slice(start, start + ITEMS_PER_PAGE);
  }, [baseFilteredTasks, currentPage, filterType]);

  // 滑动翻页
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const onTouchStart = (e) => { touchEnd.current = null; touchStart.current = e.targetTouches[0].clientX; };
  const onTouchMove = (e) => { touchEnd.current = e.targetTouches[0].clientX; };
  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (distance > 50 && currentPage < totalPages) { setSlideDirection('next'); setCurrentPage(p => p + 1); }
    if (distance < -50 && currentPage > 1) { setSlideDirection('prev'); setCurrentPage(p => p - 1); }
  };

  const toggleGroup = (groupKey) => { setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] })); };

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, rate };
  }, [tasks]);

  const chartData = useMemo(() => {
    const rawData = [];
    const now = new Date();
    for (let i = statsRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('zh-CN');
      const isSameDay = (isoString) => {
        if (!isoString) return false;
        return new Date(isoString).toLocaleDateString('zh-CN') === dateStr;
      };
      rawData.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`, 
        fullDate: dateStr,
        created: tasks.filter(t => isSameDay(t.createdAt)).length,
        completed: tasks.filter(t => isSameDay(t.completedAt)).length
      });
    }
    let firstDataIndex = rawData.findIndex(d => d.created > 0 || d.completed > 0);
    if (firstDataIndex === -1) return [rawData[rawData.length - 1]];
    return rawData.slice(firstDataIndex);
  }, [tasks, statsRange]);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) { days.push(new Date(date)); date.setDate(date.getDate() + 1); }
    return days;
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const groups = {};
    tasks.forEach(task => {
      const dateKey = new Date(task.createdAt).toLocaleDateString('zh-CN');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    });
    return groups;
  }, [tasks]);

  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const generateTextLog = () => {
    const lines = tasks.map(t => {
      const createDate = new Date(t.createdAt).toLocaleDateString();
      const status = t.completed ? '[已完成]' : '[待办]';
      let timeInfo = `创建于:${createDate}`;
      if (t.completed && t.completedAt) timeInfo += ` | 完成于:${new Date(t.completedAt).toLocaleString()}`;
      
      // 生成标签字符串
      const tagNames = (t.tags || []).map(tag => {
        const preset = PRESET_TAGS.find(p => p.id === tag);
        return preset ? preset.label.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '') : tag; // 简单去emoji
      });
      const tagsStr = tagNames.length > 0 ? ` [${tagNames.join(',')}]` : '';

      return `${status} ${t.text}${tagsStr} (${timeInfo})`;
    });
    return lines.join('\n') || '暂无数据';
  };

  const [copySuccess, setCopySuccess] = useState(false);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateTextLog()).then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); });
  };

  const getCalendarTaskStyle = (task) => {
    const tags = task.tags || [];
    const isUrgent = tags.includes('urgent');
    const isImportant = tags.includes('important');
    const isForgettable = tags.includes('forgettable');

    if (task.completed) {
        return { className: "bg-gray-100/50 border-gray-200 text-gray-400 line-through decoration-gray-400" };
    }
    if (isUrgent && isImportant) {
        return { style: { backgroundColor: themeColor, color: '#fff', borderColor: themeColor }, className: "font-medium shadow-sm" };
    }
    if (isImportant) {
        return { style: { backgroundColor: `${themeColor}80`, color: '#fff', borderColor: themeColor }, className: "font-medium shadow-sm" };
    }
    if (isUrgent) {
        return { style: { backgroundColor: `${themeColor}26`, color: '#374151', borderColor: `${themeColor}40` } };
    }
    if (isForgettable) {
        return { style: { backgroundColor: MORANDI_YELLOW, color: '#78350F', borderColor: '#D4C596' }, className: "font-medium" };
    }
    return { className: "bg-white/60 border-gray-200/50 text-gray-700 hover:bg-white/80" };
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
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">{title}</span>
            <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 bg-gray-200/50 rounded-full text-[10px] font-bold text-gray-600">{groupTasks.length}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="space-y-3 px-1">
            {groupTasks.map(task => (
              <TaskItem key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} themeColor={themeColor} onShowDetail={setSelectedTask} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans selection:bg-gray-200"> 
      {/* ... Background & Header ... */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[80%] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob" style={{ backgroundColor: themeColor }}></div>
        <div className="absolute top-[10%] -right-[20%] w-[70%] h-[70%] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-2000" style={{ backgroundColor: '#E6D5A7' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-4000" style={{ backgroundColor: themeColor }}></div>
      </div>

      <div className="max-w-md mx-auto h-screen flex flex-col relative shadow-[0_0_60px_-15px_rgba(0,0,0,0.1)] bg-white/40 backdrop-blur-xl overflow-hidden ring-1 ring-white/50">
        
        <header className="p-6 pb-2 sticky top-0 z-20 bg-white/60 backdrop-blur-xl border-b border-white/40">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl shadow-lg text-white transition-transform duration-500 hover:rotate-3 hover:scale-105" style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -5px ${themeColor}80` }}>
                <ListTodo className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-gray-800">Todo List</h1>
            </div>

            <div className="flex gap-1 items-center bg-white/50 p-1 rounded-full border border-white/50 shadow-sm backdrop-blur-md">
              <NavIcon onClick={() => setViewMode('stats')} active={viewMode === 'stats'} icon={LineChart} themeColor={themeColor} />
              <NavIcon onClick={() => setViewMode(viewMode === 'timeline' ? 'list' : 'timeline')} active={viewMode === 'list' || viewMode === 'timeline'} icon={viewMode === 'timeline' ? LayoutList : CalendarDays} themeColor={themeColor} />
              <NavIcon onClick={() => setViewMode('log')} active={viewMode === 'log'} icon={FileText} themeColor={themeColor} />
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <button onClick={() => setShowThemePicker(!showThemePicker)} className="p-2 rounded-full transition-all hover:bg-white relative">
                <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: themeColor }}></div>
              </button>
            </div>
            
            {showThemePicker && (
              <div className="absolute top-20 right-6 bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 z-50 grid grid-cols-4 gap-3 w-64 p-5 animate-in fade-in zoom-in-95 duration-300">
                {MORANDI_THEMES.map((t, idx) => (
                  <button key={t.color} onClick={() => { setThemeIndex(idx); setShowThemePicker(false); }} className="w-10 h-10 rounded-2xl border-2 transition-all hover:scale-110 hover:shadow-md group relative" style={{ backgroundColor: t.color, borderColor: themeColor === t.color ? '#333' : 'transparent' }}>
                    {themeColor === t.color && <div className="absolute inset-0 flex items-center justify-center"><Check className="w-4 h-4 text-white/80" strokeWidth={3} /></div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {viewMode !== 'log' && viewMode !== 'stats' && (
            <div className="mb-4 relative h-8 w-full bg-white/60 rounded-2xl overflow-hidden shadow-sm border border-white/60">
              <div className="h-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) flex items-center justify-end pr-3 relative" style={{ width: `${Math.max(stats.rate, 8)}%`, backgroundColor: themeColor }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
              </div>
              <div className="absolute inset-0 flex justify-between items-center px-4 text-xs font-bold pointer-events-none">
                <span className={`drop-shadow-sm transition-colors duration-300 ${stats.rate > 12 ? 'text-white' : 'text-gray-500'}`}>{stats.rate}% 完成</span>
                <div className="flex gap-1 items-center text-gray-400 font-medium">
                   <span style={{ color: themeColor }} className="text-sm">{stats.completed}</span>
                   <span className="text-[10px] opacity-50">/</span>
                   <span>{stats.total}</span>
                </div>
              </div>
            </div>
          )}

          {/* List Controls */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-3 h-12">
              {isSearchMode ? (
                <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input autoFocus type="text" placeholder="搜索任务..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-white/80 rounded-xl text-sm font-medium outline-none focus:ring-2 transition-all text-gray-700 shadow-sm border border-gray-100" style={{ '--tw-ring-color': `${themeColor}40` }} />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle className="w-4 h-4" /></button>}
                  </div>
                  <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }} className="p-2 rounded-xl bg-gray-100/50 hover:bg-gray-200/50 text-gray-500 transition-colors">取消</button>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide p-1 items-center">
                    {[{ id: 'active', label: '进行中' }, { id: 'completed', label: '已完成' }].map(tab => (
                      <button key={tab.id} onClick={() => setFilterType(tab.id)} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all font-bold flex-shrink-0 border border-transparent ${filterType === tab.id ? 'text-white shadow-md transform scale-105' : 'bg-white/40 text-gray-500 hover:bg-white/70'}`} style={filterType === tab.id ? { backgroundColor: themeColor, boxShadow: `0 4px 12px ${themeColor}40` } : {}}>{tab.label}</button>
                    ))}
                    
                    {filterType !== 'completed' && totalPages > 1 && currentPage > 1 && (
                       <button onClick={() => setCurrentPage(1)} className="px-3 py-2 rounded-full bg-white/40 hover:bg-white/70 text-gray-500 border border-transparent transition-all flex items-center justify-center ml-1 shadow-sm" title="回到第一页"><ChevronsLeft className="w-4 h-4" /></button>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setIsSearchMode(true)} className="p-2.5 rounded-xl bg-white/40 hover:bg-white/80 text-gray-500 transition-all border border-transparent hover:shadow-sm"><Search className="w-4 h-4" /></button>
                    <div className="relative">
                      <button 
                        onClick={() => setShowTagFilterMenu(!showTagFilterMenu)} 
                        className={`p-2.5 rounded-xl flex items-center justify-center transition-all border border-transparent ${activeTagFilters.length > 0 ? 'bg-gray-800 text-white shadow-md' : 'bg-white/40 text-gray-500 hover:bg-white/80 hover:shadow-sm'}`}
                      >
                        {activeTagFilters.length > 0 ? <span className="text-xs font-bold">{activeTagFilters.length}</span> : <Filter className="w-4 h-4" />}
                      </button>
                      {showTagFilterMenu && (
                        <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/60 z-50 w-44 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 max-h-80 overflow-y-auto">
                          <button onClick={() => { setActiveTagFilters([]); setShowTagFilterMenu(false); }} className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors text-gray-500">清除筛选</button>
                          <div className="h-px bg-gray-100 my-1"></div>
                          
                          <FilterOption 
                             onClick={() => toggleFilter(NO_TAG_ID)} 
                             color="#9CA3AF" 
                             label="🔘 只看无标签" 
                             active={activeTagFilters.includes(NO_TAG_ID)} 
                          />

                          <div className="h-px bg-gray-100 my-1"></div>
                          
                          {PRESET_TAGS.map(tag => (
                            <FilterOption 
                              key={tag.id} 
                              onClick={() => toggleFilter(tag.id)} 
                              color={tag.color === PRIORITY_COLORS.URGENT || tag.color === PRIORITY_COLORS.IMPORTANT ? themeColor : tag.color}
                              label={tag.label} 
                              active={activeTagFilters.includes(tag.id)} 
                              dark={tag.id === 'important'}
                            />
                          ))}

                          {customTagsList.length > 0 && <div className="h-px bg-gray-100 my-1"></div>}
                          {customTagsList.map(tag => (
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
          onTouchStart={viewMode === 'list' ? onTouchStart : undefined}
          onTouchMove={viewMode === 'list' ? onTouchMove : undefined}
          onTouchEnd={viewMode === 'list' ? onTouchEnd : undefined}
        >
          
          {/* A. List View */}
          {viewMode === 'list' && (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between pb-24 scroll-smooth">
              <div className="space-y-3.5">
                {(filterType !== 'completed' && currentViewTasks.length === 0 && baseFilteredTasks.length === 0) || (filterType === 'completed' && Object.values(groupedCompletedTasks || {}).every(g => g.length === 0)) ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 h-full opacity-60">
                    <div className="bg-white/50 p-8 rounded-full mb-6 backdrop-blur-sm shadow-sm"><AlertCircle className="w-12 h-12 opacity-30" style={{ color: themeColor }} /></div>
                    <p className="text-sm text-gray-400 font-medium tracking-wide">暂无任务</p>
                  </div>
                ) : (
                  <>
                    {filterType === 'completed' && groupedCompletedTasks ? (
                      <div className="space-y-4">
                        {renderCompletedGroup('今日完成', 'today', groupedCompletedTasks.today)}
                        {renderCompletedGroup('近三天', 'threeDays', groupedCompletedTasks.threeDays)}
                        {renderCompletedGroup('一周内', 'week', groupedCompletedTasks.week)}
                        {renderCompletedGroup('一个月内', 'month', groupedCompletedTasks.month)}
                        {renderCompletedGroup('更早之前', 'earlier', groupedCompletedTasks.earlier)}
                      </div>
                    ) : (
                      <div 
                        key={currentPage}
                        className={`space-y-3.5 animate-in fade-in duration-500 ease-out fill-mode-forwards ${slideDirection === 'next' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'}`}
                      >
                        {currentViewTasks.map(task => (
                          <TaskItem key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} themeColor={themeColor} onShowDetail={setSelectedTask} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ... (Timeline, Log, Stats Views remain the same) ... */}
          {/* B. Timeline View */}
          {viewMode === 'timeline' && (
            <div className="flex-1 flex flex-col h-full relative">
              <div className="flex items-center justify-between px-6 py-3 bg-white/30 border-b border-white/20 flex-shrink-0 backdrop-blur-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm border border-transparent hover:border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                <span className="font-serif font-bold text-lg text-gray-700" style={{ color: themeColor }}>{currentMonth.getFullYear()} . {currentMonth.getMonth() + 1}</span>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm border border-transparent hover:border-gray-100"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
              </div>
              <div ref={timelineRef} className="flex-1 overflow-x-auto flex snap-x snap-mandatory">
                {daysInMonth.map((date) => {
                  const dateStr = date.toLocaleDateString('zh-CN');
                  const dayTasks = tasksByDate[dateStr] || [];
                  const isToday = new Date().toLocaleDateString('zh-CN') === dateStr;
                  return (
                    <div key={dateStr} id={`day-col-${dateStr}`} className={`flex-shrink-0 w-[20%] min-w-[80px] border-r border-white/20 flex flex-col snap-start h-full transition-colors ${isToday ? 'bg-white/40' : ''}`}>
                      <div className={`text-center py-4 border-b border-white/20 flex-shrink-0 sticky top-0 z-10 bg-white/80 backdrop-blur-sm`}>
                        <div className="text-lg font-serif font-bold mb-1" style={{ color: isToday ? themeColor : '#9CA3AF' }}>{date.getDate()}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{['日','一','二','三','四','五','六'][date.getDay()]}</div>
                      </div>
                      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar p-1">
                        {dayTasks.map(task => {
                          const styles = getCalendarTaskStyle(task);
                          return (
                            <div 
                              key={task.id} 
                              onClick={() => setSelectedTask(task)} 
                              className={`p-2 mb-1.5 rounded-lg border text-[11px] leading-tight cursor-pointer transition-colors shadow-sm ${styles.className}`}
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
              <button onClick={handleReturnToToday} className="absolute bottom-24 right-6 p-3 rounded-full shadow-lg text-white transition-transform active:scale-95 z-30" style={{ backgroundColor: themeColor }} title="回到今天"><RotateCcw className="w-5 h-5" /></button>
            </div>
          )}

          {/* C. Log View */}
          {viewMode === 'log' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-8 relative min-h-[60vh]">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200/50 pb-4">
                  <h2 className="font-serif font-bold text-xl text-gray-700">文本日志</h2>
                  <button onClick={copyToClipboard} className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-colors bg-white border border-gray-100 shadow-sm active:scale-95" style={{ color: copySuccess ? '#10B981' : themeColor }}>
                    {copySuccess ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copySuccess ? '已复制' : '复制全部'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-600 leading-loose font-mono bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">{generateTextLog()}</pre>
              </div>
            </div>
          )}

          {/* D. Stats View */}
          {viewMode === 'stats' && (
             <div className="flex-1 overflow-y-auto p-6">
               <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-6 relative min-h-[60vh]">
                 <h2 className="font-serif font-bold text-xl text-gray-700 mb-6">数据趋势</h2>
                 <div className="flex gap-3 mb-8">
                   {[7, 30, 100].map(days => (
                     <button key={days} onClick={() => setStatsRange(days)} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all border border-transparent ${statsRange === days ? 'text-white shadow-md scale-105' : 'bg-white/60 text-gray-500 hover:bg-white hover:shadow-sm'}`} style={statsRange === days ? { backgroundColor: themeColor } : {}}>近{days}天</button>
                   ))}
                 </div>
                 <div className="w-full h-64 relative border-l border-b border-gray-300/50 mb-8">
                   {(() => {
                     if (chartData.length === 0) return <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">数据不足</div>;
                     const maxVal = Math.max(...chartData.map(d => Math.max(d.created, d.completed, 5))); 
                     const width = 100; const height = 100;
                     const dx = chartData.length > 1 ? width / (chartData.length - 1) : 0;
                     const createdPoints = chartData.map((d, i) => `${chartData.length > 1 ? i * dx : 50},${height - (d.created / maxVal) * height}`).join(' ');
                     const completedPoints = chartData.map((d, i) => `${chartData.length > 1 ? i * dx : 50},${height - (d.completed / maxVal) * height}`).join(' ');
                     return (
                       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible drop-shadow-sm">
                         <text x="-2" y="0" fontSize="4" fill="#999" textAnchor="end">{maxVal}</text>
                         <text x="-2" y={height} fontSize="4" fill="#999" textAnchor="end">0</text>
                         {[0.25, 0.5, 0.75].map(p => <line key={p} x1="0" y1={height * p} x2={width} y2={height * p} stroke="#ddd" strokeWidth="0.5" strokeDasharray="3" strokeOpacity="0.5" />)}
                         {chartData.length > 1 ? (
                           <>
                             <polyline points={createdPoints} fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
                             <polyline points={completedPoints} fill="none" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
                           </>
                         ) : (
                           <><circle cx="50" cy={height - (chartData[0].created / maxVal) * height} r="2" fill="#F87171" /><circle cx="50" cy={height - (chartData[0].completed / maxVal) * height} r="2" fill={themeColor} /></>
                         )}
                         {chartData.map((d, i) => {
                           const showLabel = i === 0 || i === chartData.length - 1 || (chartData.length > 10 && i % Math.ceil(chartData.length / 5) === 0);
                           if (!showLabel) return null;
                           const x = chartData.length > 1 ? i * dx : 50;
                           return (
                             <text key={i} x={x} y={height + 8} fontSize="3" fill="#999" textAnchor="middle">{d.date}</text>
                           );
                         })}
                       </svg>
                     );
                   })()}
                 </div>
                 <div className="flex justify-center gap-8 text-xs font-medium border-t border-gray-200/50 pt-6">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400 shadow-sm" /><span className="text-gray-500">发布任务</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: themeColor }} /><span className="text-gray-500">完成任务</span></div>
                 </div>
               </div>
             </div>
          )}
        </main>

        {/* Pagination Dots & Number (Fixed at bottom) */}
        {viewMode === 'list' && filterType !== 'completed' && totalPages > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none z-30">
             {/* Dots */}
            <div className="flex justify-center gap-2.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <div 
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-sm ${i + 1 === currentPage ? 'w-8 opacity-100' : 'w-1.5 opacity-30'}`}
                  style={{ backgroundColor: i + 1 === currentPage ? themeColor : '#9CA3AF' }}
                />
              ))}
            </div>
            {/* Number */}
            <span className="text-sm font-bold opacity-60 font-serif" style={{ color: themeColor }}>
              {currentPage} <span className="text-[10px] opacity-50">/</span> {totalPages}
            </span>
          </div>
        )}

        {/* FAB (Floating Action Button) */}
        {viewMode !== 'log' && viewMode !== 'stats' && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="absolute bottom-8 right-6 p-4 rounded-[2rem] text-white transition-all duration-300 hover:scale-110 active:scale-95 z-50 group"
            style={{ 
              backgroundImage: `linear-gradient(135deg, ${themeColor}, ${themeColor}ee)`, 
              boxShadow: `0 10px 30px -5px ${themeColor}90` 
            }}
          >
            <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}

        {/* Add Modal (Glass Panel) - 包含标签选择 */}
        {isAddModalOpen && (
          <div className="absolute inset-0 z-[60] flex flex-col justify-start pt-[4vh] bg-gray-900/20 backdrop-blur-sm p-6 animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-2xl w-full max-w-sm mx-auto rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden animate-in slide-in-from-top-10 duration-500 border border-white/60 ring-1 ring-white/50">
              <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
                <h3 className="font-serif font-bold text-xl text-gray-800">新建任务</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100/80 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6">
                {/* 新建任务标签选择 */}
                <div className="mb-4">
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_TAGS.map(tag => (
                      <TagBtn 
                        key={tag.id}
                        label={tag.label} 
                        color={tag.color === PRIORITY_COLORS.URGENT || tag.color === PRIORITY_COLORS.IMPORTANT ? themeColor : tag.color} 
                        active={newTaskTags.includes(tag.id)} 
                        onClick={() => toggleNewTaskTag(tag.id)} 
                        light={tag.id === 'urgent'}
                        dark={tag.id === 'important'}
                        customText={tag.id === 'forgettable' ? '#78350F' : null}
                      />
                    ))}
                    {/* 自定义标签 */}
                    {customTagsList.map(tag => (
                       <TagBtn 
                          key={tag}
                          label={tag} 
                          color={themeColor} 
                          active={newTaskTags.includes(tag)} 
                          onClick={() => toggleNewTaskTag(tag)} 
                          light
                        />
                    ))}
                  </div>
                </div>

                <textarea 
                  autoFocus
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="输入任务内容...&#10;支持多行粘贴，自动拆分为多条任务"
                  className="w-full h-32 p-5 rounded-2xl bg-gray-50/50 border border-gray-200/50 focus:bg-white focus:ring-2 focus:border-transparent outline-none resize-none text-gray-800 leading-relaxed transition-all placeholder-gray-400"
                  style={{ '--tw-ring-color': themeColor }}
                />
                <div className="mt-4 flex gap-4">
                  <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 rounded-2xl text-sm font-bold text-gray-500 bg-gray-100/80 hover:bg-gray-200/80 transition-colors">取消</button>
                  <button onClick={handleBatchAdd} disabled={!inputText.trim()} className="flex-1 py-4 rounded-2xl text-sm font-bold text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 hover:shadow-2xl hover:-translate-y-0.5" style={{ backgroundColor: themeColor, boxShadow: `0 8px 25px ${themeColor}50` }}>确认添加</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal (Glass Panel) */}
        {selectedTask && (
          <div 
            className={`absolute inset-0 z-[70] flex flex-col transition-all duration-300 ${isDetailEditing ? 'justify-start pt-[10vh]' : 'justify-center'} items-center bg-gray-900/20 backdrop-blur-md p-6 animate-in fade-in`}
            onClick={(e) => {
               if (e.target === e.currentTarget) setSelectedTask(null); 
            }}
          >
            <div className="bg-white/95 backdrop-blur-2xl w-full max-w-sm rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-300 relative border border-white/60 ring-1 ring-white/50">
              <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gray-100/50 text-gray-500"><FileText className="w-5 h-5" /></div>
                  <h3 className="font-serif font-bold text-xl text-gray-800">任务详情</h3>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-2 rounded-full hover:bg-gray-100/80 text-gray-400 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="mb-8">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-[0.2em]">标签管理</p>
                  <div className="flex gap-3 flex-wrap">
                    {PRESET_TAGS.map(tag => (
                      <TagBtn 
                        key={tag.id}
                        label={tag.label} 
                        color={tag.color === PRIORITY_COLORS.URGENT || tag.color === PRIORITY_COLORS.IMPORTANT ? themeColor : tag.color} 
                        active={(selectedTask.tags || []).includes(tag.id)} 
                        onClick={() => updateTaskTags(selectedTask.id, tag.id, !(selectedTask.tags || []).includes(tag.id))} 
                        // Styling logic for presets
                        light={tag.id === 'urgent'}
                        dark={tag.id === 'important'}
                        customText={tag.id === 'forgettable' ? '#78350F' : null}
                      />
                    ))}
                  </div>
                  
                  {/* Custom Tags Section */}
                  <div className="mt-4 pt-4 border-t border-gray-100/50">
                     <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-[0.2em]">自定义标签</p>
                     <div className="flex gap-2 flex-wrap mb-3">
                        {customTagsList.map(tag => (
                          <div key={tag} className="relative group">
                             <TagBtn 
                               label={tag} 
                               color={themeColor} 
                               active={(selectedTask.tags || []).includes(tag)} 
                               onClick={() => updateTaskTags(selectedTask.id, tag, !(selectedTask.tags || []).includes(tag))} 
                               light
                             />
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleDeleteCustomTag(tag); }}
                               className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                             >
                               <X className="w-3 h-3" />
                             </button>
                          </div>
                        ))}
                     </div>
                     <form onSubmit={handleCreateCustomTag} className="flex gap-2">
                        <input 
                          type="text" 
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="新建标签..."
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-gray-300 outline-none transition-all"
                        />
                        <button 
                          type="submit" 
                          disabled={!newTagInput.trim()}
                          className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          添加
                        </button>
                     </form>
                  </div>
                </div>
                
                <textarea
                  value={selectedTask.text}
                  onFocus={() => setIsDetailEditing(true)}
                  onBlur={() => setIsDetailEditing(false)}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setSelectedTask(prev => ({ ...prev, text: newText }));
                    setTasks(prevTasks => prevTasks.map(t => t.id === selectedTask.id ? { ...t, text: newText } : t));
                  }}
                  className="w-full bg-transparent text-gray-700 text-lg leading-relaxed border-t border-gray-100/80 pt-6 font-medium outline-none resize-none h-auto min-h-[120px] focus:bg-white/50 transition-colors rounded-lg px-2 -mx-2"
                  placeholder="输入任务内容..."
                />

                <div className="mt-10 pt-6 border-t border-gray-100/80 text-xs text-gray-400 flex flex-col gap-2">
                  <div className="flex justify-between"><span>创建时间</span> <span className="font-mono">{new Date(selectedTask.createdAt).toLocaleString()}</span></div>
                  {selectedTask.completedAt && (
                    <div className="flex justify-between text-green-600/70"><span>完成时间</span> <span className="font-mono">{new Date(selectedTask.completedAt).toLocaleString()}</span></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// --- Sub Components ---
// ... (NavIcon, FilterOption, TagBtn, TaskItem code remains same as previous v9.3, no changes needed there)

const NavIcon = ({ onClick, active, icon: Icon, themeColor }) => (
  <button onClick={onClick} className={`p-2.5 rounded-full transition-all duration-300 ${active ? 'bg-white shadow-sm scale-110' : 'hover:bg-white/50 hover:scale-105 text-gray-400'}`} style={active ? { color: themeColor } : {}}>
    <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
  </button>
);

const FilterOption = ({ onClick, color, label, active, dark }) => (
  <button onClick={onClick} className="w-full text-left px-4 py-3 rounded-xl text-xs font-bold hover:bg-gray-50/80 transition-all flex items-center gap-3 group" style={{ color: color, filter: dark ? 'brightness(0.7)' : 'none' }}>
    <span className={`w-2 h-2 rounded-full transition-all ${active ? 'scale-125 ring-2 ring-offset-2 ring-offset-white' : 'opacity-40 group-hover:opacity-100'}`} style={{ backgroundColor: color, '--tw-ring-color': color }}></span>
    {label}
  </button>
);

const TagBtn = ({ label, color, active, onClick, light, dark, customText }) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 active:scale-95 ${active ? 'border-transparent shadow-md scale-105' : 'bg-gray-50/50 text-gray-400 border-transparent hover:bg-gray-100'}`}
    style={active ? { backgroundColor: light ? `${color}15` : color, color: customText || (light ? color : 'white'), borderColor: light ? color : 'transparent' } : {}}
  >
    {label}
  </button>
);

function TaskItem({ task, toggleTask, deleteTask, themeColor, onShowDetail }) {
  const dateObj = new Date(task.createdAt);
  const dateWatermark = `${dateObj.getMonth() + 1}.${dateObj.getDate()}`;
  const isLongText = task.text.length > 30;

  // --- 渐变背景样式 ---
  const getGradientStyle = () => {
    const tags = task.tags || [];
    const isUrgent = tags.includes('urgent');
    const isImportant = tags.includes('important');
    const isForgettable = tags.includes('forgettable');

    // 修改：保留底色，过渡更柔和，不再完全透明
    if (isUrgent && isImportant) return { 
      background: `linear-gradient(90deg, ${themeColor}E6 0%, ${themeColor}33 40%)`,
      Icon: AlertTriangle,
      iconColor: themeColor
    };
    if (isImportant) return { 
      background: `linear-gradient(90deg, ${themeColor}BF 0%, ${themeColor}26 40%)`,
      Icon: Star,
      iconColor: `${themeColor}80`
    };
    if (isUrgent) return { 
      background: `linear-gradient(90deg, ${themeColor}80 0%, ${themeColor}1A 40%)`,
      Icon: Zap,
      iconColor: `${themeColor}26`
    };
    if (isForgettable) return { 
      background: `linear-gradient(90deg, ${MORANDI_YELLOW}E6 0%, ${MORANDI_YELLOW}33 40%)`,
      Icon: Coffee,
      iconColor: MORANDI_YELLOW,
      isYellow: true
    };
    return null;
  };
  const styleConfig = getGradientStyle();

  // --- 智能水印样式 ---
  const watermarkStyle = styleConfig && !styleConfig.isYellow
    ? { color: 'white', opacity: 0.15 } 
    : { color: themeColor, opacity: 0.06 };

  return (
    <div className={`group relative bg-white/80 backdrop-blur-md rounded-[1.2rem] px-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-white/60 transition-all duration-300 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-1 overflow-hidden h-[60px] flex items-center ${task.completed ? 'opacity-50 grayscale-[0.8]' : ''}`}>
      
      {/* 渐变背景 */}
      {styleConfig && !task.completed && <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: styleConfig.background }} />}

      {/* 背景图标 (新增) */}
      {styleConfig && styleConfig.Icon && !task.completed && (
        <div className="absolute right-[-10px] bottom-[-15px] z-0 pointer-events-none opacity-15 transform rotate-12">
           <styleConfig.Icon size={80} color={styleConfig.iconColor} strokeWidth={1.5} />
        </div>
      )}

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <span className="text-[5rem] font-serif font-bold whitespace-nowrap leading-none tracking-tighter" style={watermarkStyle}>
          {dateWatermark}
        </span>
      </div>

      <div className="relative z-10 flex items-center gap-4 w-full h-full">
        {/* 复选框：挖空透视效果 (背景色设为App背景色) */}
        <button 
          onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} 
          className={`flex-shrink-0 w-5 h-5 rounded-full border-[2px] flex items-center justify-center transition-all duration-300 cursor-pointer z-20 ${task.completed ? 'scale-90' : 'bg-transparent hover:scale-110 border-gray-300'}`} 
          style={task.completed ? { backgroundColor: '#f8f9fa', borderColor: themeColor, color: themeColor } : {}}
        >
          {task.completed && <Check className="w-3 h-3" strokeWidth={4} />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer h-full flex items-center" onClick={() => onShowDetail && onShowDetail(task)}>
          <p className={`text-[15px] font-medium break-words whitespace-pre-wrap line-clamp-2 ${isLongText ? 'leading-snug' : 'leading-normal'} ${task.completed ? 'line-through text-gray-400 decoration-gray-300' : 'text-gray-700'}`}>{task.text}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); deleteTask(task); }} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all flex-shrink-0 z-20 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}