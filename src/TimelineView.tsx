import * as React from "react";
import { useState, useEffect } from "react";
import { App, TFile, Notice, FileSystemAdapter, Modal } from "obsidian";
import DayTimeTrackerPlugin from "./main";
import { TimelineLogEntry, TimelineModal, TimelineTodoItem, getCategoryLabel } from "./TimelineModal";
import { t } from "./locale/helpers";

export interface TimelineViewProps {
    plugin: DayTimeTrackerPlugin;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ plugin }) => {
    const [activeFile, setActiveFile] = useState<TFile | null>(null);
    const [logs, setLogs] = useState<TimelineLogEntry[]>([]);
    const [todos, setTodos] = useState<TimelineTodoItem[]>([]);
    const [settings, setSettings] = useState(plugin.settings);
    const [isTodosExpanded, setIsTodosExpanded] = useState(true);

    // Drag-to-select state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragEnd, setDragEnd] = useState<number | null>(null);

    // Helpers
    function timeToMinutes(timeStr: string): number {
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
    }

    function minutesToTime(minutes: number): string {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    function getTextColorForBackground(hexColor: string): string {
        if (!hexColor) return "#ffffff";
        const color = hexColor.startsWith("#") ? hexColor.substring(1) : hexColor;
        if (color.length !== 6) return "#ffffff";
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.6 ? "#1e293b" : "#ffffff";
    }

    function formatDateHeader(fileName: string): string {
        const baseName = fileName.endsWith(".md") ? fileName.slice(0, -3) : fileName;
        const match = baseName.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            const [_, y, m, d] = match;
            const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            if (!isNaN(date.getTime())) {
                const lang = settings.language;
                const dayIndex = (date.getDay() + 6) % 7; 
                let dayName = "";
                if (lang === "ko") {
                    const weekdaysKo = ["월", "화", "수", "목", "금", "토", "일"];
                    dayName = `(${weekdaysKo[dayIndex]})`;
                } else {
                    const weekdaysEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                    dayName = `(${weekdaysEn[dayIndex]})`;
                }

                // Check if the date is today
                const today = new Date();
                const isToday = today.getFullYear() === date.getFullYear() &&
                                today.getMonth() === date.getMonth() &&
                                today.getDate() === date.getDate();
                if (isToday) {
                    const todayText = lang === "ko" ? "(오늘)" : "(Today)";
                    return `${y}-${m}-${d} ${todayText}`;
                }

                return `${y}-${m}-${d} ${dayName}`;
            }
        }
        return baseName;
    }

    // Load logs and todos from frontmatter
    const loadLogs = (file: TFile) => {
        const cache = plugin.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        
        // Load logs
        const rawLogs = frontmatter?.["timeline-logs"];
        if (Array.isArray(rawLogs)) {
            const filtered = rawLogs.filter(
                (log): log is TimelineLogEntry =>
                    log &&
                    log.type === "daytime-tracker" &&
                    typeof log.start === "string" &&
                    typeof log.end === "string"
            );
            filtered.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
            setLogs(filtered);
        } else {
            setLogs([]);
        }

        // Load todos
        const rawTodos = frontmatter?.["timeline-todos"];
        if (Array.isArray(rawTodos)) {
            const filteredTodos = rawTodos.filter(
                (todo): todo is TimelineTodoItem =>
                    todo &&
                    typeof todo.id === "number" &&
                    typeof todo.content === "string" &&
                    typeof todo.checked === "boolean"
            );
            setTodos(filteredTodos);
        } else {
            setTodos([]);
        }
    };

    // Subscriptions
    useEffect(() => {
        const updateActiveFile = () => {
            const file = plugin.app.workspace.getActiveFile();
            setActiveFile(file);
            if (file) {
                loadLogs(file);
            } else {
                setLogs([]);
                setTodos([]);
            }
        };

        updateActiveFile();

        const activeLeafChangeRef = plugin.app.workspace.on("active-leaf-change", () => {
            updateActiveFile();
            // Reset drag state on file change
            setIsDragging(false);
            setDragStart(null);
            setDragEnd(null);
        });

        const metadataChangeRef = plugin.app.metadataCache.on("changed", (file) => {
            const currentFile = plugin.app.workspace.getActiveFile();
            if (currentFile && file.path === currentFile.path) {
                loadLogs(file);
            }
        });

        return () => {
            plugin.app.workspace.offref(activeLeafChangeRef);
            plugin.app.metadataCache.offref(metadataChangeRef);
        };
    }, [plugin]);

    // Subscribe to settings changes
    useEffect(() => {
        const handleSettingsChanged = () => {
            setSettings({ ...plugin.settings });
        };
        const ref = plugin.app.workspace.on("daytime-tracker:settings-changed" as any, handleSettingsChanged);
        return () => {
            plugin.app.workspace.offref(ref);
        };
    }, [plugin]);

    // Handle mouse up outside grid
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                handleMouseUp();
            }
        };
        window.addEventListener("mouseup", handleGlobalMouseUp);
        return () => {
            window.removeEventListener("mouseup", handleGlobalMouseUp);
        };
    }, [isDragging, dragStart, dragEnd]);

    // Save and update frontmatter
    const handleSave = async (newEntry: TimelineLogEntry, editIndex?: number) => {
        if (!activeFile) return;

        await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            const rawLogs = frontmatter["timeline-logs"] || [];
            const otherLogs = Array.isArray(rawLogs)
                ? rawLogs.filter((log: any) => !log || log.type !== "daytime-tracker")
                : [];

            const currentOurLogs = [...logs];
            if (editIndex !== undefined && editIndex >= 0 && editIndex < currentOurLogs.length) {
                currentOurLogs[editIndex] = newEntry;
            } else {
                currentOurLogs.push(newEntry);
            }

            frontmatter["timeline-logs"] = [...otherLogs, ...currentOurLogs];
        });

        loadLogs(activeFile);
    };

    // Delete entry
    const handleDelete = async (editIndex: number) => {
        if (!activeFile) return;

        await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            const rawLogs = frontmatter["timeline-logs"] || [];
            const otherLogs = Array.isArray(rawLogs)
                ? rawLogs.filter((log: any) => !log || log.type !== "daytime-tracker")
                : [];

            const currentOurLogs = logs.filter((_, idx) => idx !== editIndex);
            frontmatter["timeline-logs"] = [...otherLogs, ...currentOurLogs];
        });

        loadLogs(activeFile);
    };

    // To-Do managers
    const handleAddTodo = async (contentStr: string) => {
        if (!activeFile || !contentStr.trim()) return;
        const trimmed = contentStr.trim();
        if (trimmed.length > 20) {
            new Notice(t("ALERT_TODO_LENGTH_LIMIT", settings.language));
            return;
        }

        await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            const currentTodos = frontmatter["timeline-todos"] || [];
            const newTodo: TimelineTodoItem = {
                id: Date.now(),
                content: trimmed,
                checked: false
            };
            frontmatter["timeline-todos"] = [...currentTodos, newTodo];
        });

        loadLogs(activeFile);
    };

    const handleToggleTodo = async (todoId: number) => {
        if (!activeFile) return;

        const todo = todos.find(t => t.id === todoId);
        if (!todo) return;

        const willBeChecked = !todo.checked;

        if (willBeChecked) {
            const confirmModal = new ConfirmModal(
                plugin.app,
                t("CONFIRM_RECORD_TIMELINE", settings.language),
                settings.language,
                async () => {
                    // On confirm, check To-Do and open TimelineModal
                    await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                        const currentTodos = frontmatter["timeline-todos"] || [];
                        frontmatter["timeline-todos"] = currentTodos.map((t: any) => {
                            if (t && t.id === todoId) {
                                return { ...t, checked: true };
                            }
                            return t;
                        });
                    });

                    const now = new Date();
                    const h = now.getHours();
                    const startTimeStr = `${String(h).padStart(2, "0")}:00`;
                    const endTimeStr = `${String(h === 23 ? 24 : h + 1).padStart(2, "0")}:00`;

                    const modal = new TimelineModal(
                        plugin.app,
                        null,
                        startTimeStr,
                        endTimeStr,
                        todos, 
                        todoId,
                        todo.content,
                        settings.language,
                        settings.categories,
                        (newEntry) => handleSave(newEntry)
                    );
                    modal.open();
                },
                async () => {
                    // On cancel, just check To-Do without logging
                    await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                        const currentTodos = frontmatter["timeline-todos"] || [];
                        frontmatter["timeline-todos"] = currentTodos.map((t: any) => {
                            if (t && t.id === todoId) {
                                return { ...t, checked: true };
                            }
                            return t;
                        });
                    });
                    loadLogs(activeFile);
                }
            );
            confirmModal.open();
        } else {
            const linkedLogIndex = logs.findIndex(log => log.todoId === todoId);
            
            if (linkedLogIndex !== -1) {
                const confirmModal = new ConfirmModal(
                    plugin.app,
                    t("CONFIRM_DELETE_LINKED_LOG", settings.language),
                    settings.language,
                    async () => {
                        // On confirm, uncheck To-Do and delete log block
                        await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            const currentTodos = frontmatter["timeline-todos"] || [];
                            frontmatter["timeline-todos"] = currentTodos.map((t: any) => {
                                if (t && t.id === todoId) {
                                    return { ...t, checked: false };
                                }
                                return t;
                            });

                            const rawLogs = frontmatter["timeline-logs"] || [];
                            const otherLogs = Array.isArray(rawLogs)
                                ? rawLogs.filter((log: any) => !log || log.type !== "daytime-tracker")
                                : [];
                            
                            const currentOurLogs = logs.filter((_, idx) => idx !== linkedLogIndex);
                            frontmatter["timeline-logs"] = [...otherLogs, ...currentOurLogs];
                        });
                        loadLogs(activeFile);
                    },
                    async () => {
                        // On cancel, uncheck To-Do but keep log block (severing link)
                        await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            const currentTodos = frontmatter["timeline-todos"] || [];
                            frontmatter["timeline-todos"] = currentTodos.map((t: any) => {
                                if (t && t.id === todoId) {
                                    return { ...t, checked: false };
                                }
                                return t;
                            });

                            const rawLogs = frontmatter["timeline-logs"] || [];
                            const otherLogs = Array.isArray(rawLogs)
                                ? rawLogs.filter((log: any) => !log || log.type !== "daytime-tracker")
                                : [];
                            
                            const currentOurLogs = [...logs];
                            if (currentOurLogs[linkedLogIndex]) {
                                const updatedLog = { ...currentOurLogs[linkedLogIndex] };
                                delete updatedLog.todoId;
                                currentOurLogs[linkedLogIndex] = updatedLog;
                            }
                            frontmatter["timeline-logs"] = [...otherLogs, ...currentOurLogs];
                        });
                        loadLogs(activeFile);
                    }
                );
                confirmModal.open();
            } else {
                // Just uncheck To-Do
                await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                    const currentTodos = frontmatter["timeline-todos"] || [];
                    frontmatter["timeline-todos"] = currentTodos.map((t: any) => {
                        if (t && t.id === todoId) {
                            return { ...t, checked: false };
                        }
                        return t;
                    });
                });
                loadLogs(activeFile);
            }
        }
    };

    const handleDeleteTodo = async (todoId: number) => {
        if (!activeFile) return;

        const todo = todos.find(t => t.id === todoId);
        if (!todo) return;

        const message = t("CONFIRM_DELETE_TODO", settings.language).replace("{title}", todo.content);

        const confirmModal = new ConfirmModal(
            plugin.app,
            message,
            settings.language,
            async () => {
                await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                    const currentTodos = frontmatter["timeline-todos"] || [];
                    frontmatter["timeline-todos"] = currentTodos.filter((t: any) => t && t.id !== todoId);
                });
                loadLogs(activeFile);
            }
        );
        confirmModal.open();
    };

    // Drag-to-select handlers
    const handleMouseDown = (cellIndex: number) => {
        setIsDragging(true);
        setDragStart(cellIndex);
        setDragEnd(cellIndex);
    };

    const handleMouseEnter = (cellIndex: number) => {
        if (isDragging) {
            setDragEnd(cellIndex);
        }
    };

    const handleMouseUp = () => {
        if (!isDragging || dragStart === null || dragEnd === null) return;
        setIsDragging(false);

        const startIdx = Math.min(dragStart, dragEnd);
        const endIdx = Math.max(dragStart, dragEnd);

        const startMinutes = startIdx * 10;
        const endMinutes = (endIdx + 1) * 10;

        const startTimeStr = minutesToTime(startMinutes);
        const endTimeStr = minutesToTime(endMinutes);

        const modal = new TimelineModal(
            plugin.app,
            null,
            startTimeStr,
            endTimeStr,
            todos,
            null,
            "",
            settings.language,
            settings.categories,
            (newEntry) => handleSave(newEntry)
        );
        modal.open();

        setDragStart(null);
        setDragEnd(null);
    };

    const handleEdit = (entry: TimelineLogEntry, index: number) => {
        const modal = new TimelineModal(
            plugin.app,
            entry,
            entry.start,
            entry.end,
            todos,
            null,
            "",
            settings.language,
            settings.categories,
            (updatedEntry) => handleSave(updatedEntry, index),
            () => handleDelete(index)
        );
        modal.open();
    };

    const createTodaysNote = async () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        let parentPath = "";
        if (activeFile && activeFile.parent) {
            parentPath = activeFile.parent.path;
        }
        const filePath = parentPath && parentPath !== "/"
            ? `${parentPath}/${dateStr}.md`
            : `${dateStr}.md`;

        let file = plugin.app.vault.getAbstractFileByPath(filePath);
        if (!file) {
            const initialContent = `---\ntimeline-logs:\n---\n`;
            file = await plugin.app.vault.create(filePath, initialContent);
        }
        
        if (file instanceof TFile) {
            const leaf = plugin.app.workspace.getLeaf(false);
            await leaf.openFile(file);
        }
    };

    const exportToPDF = async () => {
        if (!activeFile) return;

        // Detect theme mode
        let isDark = document.body.classList.contains("theme-dark");
        if (settings.themeMode === "light") {
            isDark = false;
        } else if (settings.themeMode === "dark") {
            isDark = true;
        }

        // Define colors based on theme
        const colors = isDark ? {
            backgroundPrimary: "#1a1a1a",
            backgroundPrimaryAlt: "#202020",
            backgroundSecondary: "#242424",
            textNormal: "#e0e0e0",
            textTitle: "#ffffff",
            textMuted: "#aaaaaa",
            borderColor: "#333333",
        } : {
            backgroundPrimary: "#ffffff",
            backgroundPrimaryAlt: "#fafafa",
            backgroundSecondary: "#f7f7f7",
            textNormal: "#111111",
            textTitle: "#111111",
            textMuted: "#666666",
            borderColor: "#e5e5e5",
        };

        const dateHeader = formatDateHeader(activeFile.name);

        // Generate grid rows HTML
        let gridRowsHtml = "";
        const hours = Array.from({ length: settings.endHour - settings.startHour }, (_, i) => settings.startHour + i);
        
        for (const hour of hours) {
            const isPm = hour >= 12;
            const displayHour = hour === 0 || hour === 24 ? 12 : hour > 12 ? hour - 12 : hour;
            const ampm = hour === 24 ? "AM" : isPm ? "PM" : "AM";

            const hourStartMin = hour * 60;
            const hourEndMin = (hour + 1) * 60;

            const overlappingLogs = logs.map((log, index) => ({ log, index }))
                .filter(({ log }) => {
                    const startMin = timeToMinutes(log.start);
                    const endMin = timeToMinutes(log.end);
                    return Math.max(startMin, hourStartMin) < Math.min(endMin, hourEndMin);
                });

            let logBlocksHtml = "";
            for (const { log, index } of overlappingLogs) {
                const startMin = timeToMinutes(log.start);
                const endMin = timeToMinutes(log.end);

                const overlapStart = Math.max(startMin, hourStartMin);
                const overlapEnd = Math.min(endMin, hourEndMin);

                const startCol = (overlapStart - hourStartMin) / 10;
                const endCol = (overlapEnd - hourStartMin) / 10;

                const leftPercent = (startCol / 6) * 100;
                const widthPercent = ((endCol - startCol) / 6) * 100;

                const catObj = settings.categories.find(c => c.name === log.category);
                const displayTitle = catObj ? getCategoryLabel(catObj, settings.language) : log.category;
                const linkedTodo = log.todoId ? todos.find(t => t.id === log.todoId) : null;
                
                const tooltipText = `${log.start} ~ ${log.end} | ${displayTitle}${log.notes ? `\n${settings.language === "ko" ? "내용" : "Content"}: ${log.notes}` : ""}${linkedTodo ? `\n${settings.language === "ko" ? "연계된 할 일" : "Linked To-Do"}: ${linkedTodo.content}` : ""}`;

                const isShortBlock = (overlapEnd - overlapStart) <= 10;
                logBlocksHtml += `
                    <div class="timeline-log-block" style="left: ${leftPercent}%; width: ${widthPercent}%; background-color: ${log.color}; color: ${getTextColorForBackground(log.color)};" title="${tooltipText.replace(/"/g, '&quot;')}">
                        ${isShortBlock ? `${displayTitle} (..)` : `${displayTitle} (${log.start}-${log.end})`}
                    </div>
                `;
            }

            let cellsHtml = "";
            for (let i = 0; i < 6; i++) {
                cellsHtml += `<div class="timeline-cell"></div>`;
            }

            gridRowsHtml += `
                <div class="timeline-row">
                    <div class="timeline-hour-label">
                        <span style="font-size: 12px; font-weight: 600; margin-right: 3px;">${displayHour}</span>
                        <span style="font-size: 9px; opacity: 0.6;">${ampm}</span>
                    </div>
                    <div class="timeline-cells">
                        ${cellsHtml}
                        ${logBlocksHtml}
                    </div>
                </div>
            `;
        }

        // Generate To-Dos HTML
        let todosHtml = "";
        if (todos.length > 0) {
            todosHtml = `
                <div class="timeline-todos-container">
                    <div class="timeline-todos-header">
                        <div class="timeline-todos-title">
                            <span>${t("TODAY_TODOS", settings.language)}</span>
                            <span class="timeline-todos-count">
                                (${todos.filter(t => t.checked).length}/${todos.length})
                            </span>
                        </div>
                    </div>
                    <ul class="timeline-todos-list">
                        ${todos.map(todo => `
                            <li class="timeline-todo-item ${todo.checked ? "is-checked" : ""}">
                                <input type="checkbox" class="timeline-todo-checkbox" ${todo.checked ? "checked" : ""} disabled />
                                <span class="timeline-todo-text">${todo.content}</span>
                            </li>
                        `).join("")}
                    </ul>
                </div>
            `;
        }

        // Build HTML template
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>DayTime Tracker - ${activeFile.basename}</title>
    <style>
        :root {
            --background-primary: ${colors.backgroundPrimary};
            --background-primary-alt: ${colors.backgroundPrimaryAlt};
            --background-secondary: ${colors.backgroundSecondary};
            --text-normal: ${colors.textNormal};
            --text-title: ${colors.textTitle};
            --text-muted: ${colors.textMuted};
            --border-color: ${colors.borderColor};
            --font-interface: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        
        body {
            background-color: var(--background-primary);
            color: var(--text-normal);
            font-family: var(--font-interface);
            margin: 0;
            padding: 24px;
            display: flex;
            justify-content: center;
        }

        .export-page-wrapper {
            max-width: 800px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* Header styling */
        .daytime-tracker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 2px solid var(--border-color);
            background-color: var(--background-secondary);
            border-radius: 8px;
        }

        .daytime-tracker-title {
            font-size: 1.4em;
            font-weight: 700;
            color: var(--text-title);
            margin: 0;
        }

        .print-action-btn {
            background-color: var(--background-primary);
            border: 1px solid var(--border-color);
            color: var(--text-normal);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: all 0.15s ease;
        }

        .print-action-btn:hover {
            background-color: var(--background-secondary);
            border-color: var(--text-muted);
        }

        /* Timeline grid styling */
        .daytime-tracker-body {
            padding: 0;
        }

        .timeline-grid {
            display: flex;
            flex-direction: column;
            border-top: 1px solid var(--border-color);
            border-left: 1px solid var(--border-color);
            border-radius: 6px;
            overflow: hidden;
            background-color: var(--background-primary);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .timeline-row {
            display: flex;
            height: 44px;
            align-items: stretch;
        }

        .timeline-hour-label {
            width: 70px;
            min-width: 70px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 14px;
            font-size: 12px;
            color: var(--text-muted);
            border-bottom: 1px solid var(--border-color);
            background-color: var(--background-primary-alt);
            user-select: none;
            box-sizing: border-box;
        }

        .timeline-cells {
            flex: 1;
            display: flex;
            position: relative;
            user-select: none;
        }

        .timeline-cell {
            flex: 1;
            border-right: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            box-sizing: border-box;
        }

        .timeline-log-block {
            position: absolute;
            height: calc(100% - 8px);
            top: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
            color: #ffffff;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            padding: 0 8px;
            z-index: 10;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            box-sizing: border-box;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(0, 0, 0, 0.1);
        }

        /* To-Do section styling */
        .timeline-todos-container {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background-color: var(--background-primary);
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .timeline-todos-header {
            padding: 12px 18px;
            background-color: var(--background-secondary);
            border-bottom: 1px solid var(--border-color);
            font-weight: 600;
            font-size: 13px;
        }

        .timeline-todos-title {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .timeline-todos-count {
            color: var(--text-muted);
            font-size: 11px;
        }

        .timeline-todos-list {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .timeline-todo-item {
            display: flex;
            align-items: center;
            padding: 10px 18px;
            border-bottom: 1px solid var(--border-color);
            font-size: 13px;
            gap: 10px;
        }

        .timeline-todo-item:last-child {
            border-bottom: none;
        }

        .timeline-todo-item.is-checked .timeline-todo-text {
            text-decoration: line-through;
            color: var(--text-muted);
        }

        .timeline-todo-checkbox {
            width: 16px;
            height: 16px;
            cursor: default;
        }

        .timeline-todo-text {
            color: var(--text-normal);
        }

        /* Print styles overrides */
        @media print {
            body {
                padding: 0;
                background-color: #ffffff !important;
                color: #000000 !important;
            }

            .print-action-btn {
                display: none !important;
            }

            .daytime-tracker-header {
                background-color: transparent !important;
                border-bottom: 2px solid #000000 !important;
                border-radius: 0;
                padding: 12px 0;
            }

            .timeline-grid {
                box-shadow: none !important;
                border-top: 1.5px solid #000000 !important;
                border-left: 1.5px solid #000000 !important;
                background-color: #ffffff !important;
            }

            .timeline-hour-label {
                background-color: transparent !important;
                border-bottom: 1px solid #000000 !important;
                color: #000000 !important;
            }

            .timeline-cell {
                border-right: 1px solid #000000 !important;
                border-bottom: 1px solid #000000 !important;
            }

            .timeline-log-block {
                box-shadow: none !important;
                border: 1px solid rgba(0, 0, 0, 0.3) !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .timeline-todos-container {
                box-shadow: none !important;
                border: 1.5px solid #000000 !important;
                background-color: #ffffff !important;
                page-break-inside: avoid;
            }

            .timeline-todos-header {
                background-color: transparent !important;
                border-bottom: 1.5px solid #000000 !important;
            }

            .timeline-todo-item {
                border-bottom: 1px solid #000000 !important;
            }

            .timeline-todo-item:last-child {
                border-bottom: none;
            }
        }
    </style>
</head>
<body>
    <div class="export-page-wrapper">
        <div class="daytime-tracker-header">
            <h2 class="daytime-tracker-title">DayTime Tracker Timeline - ${dateHeader}</h2>
            <button class="print-action-btn" onclick="window.print()">${settings.language === "ko" ? "PDF로 저장 / 인쇄하기" : "Save as PDF / Print"}</button>
        </div>
        
        <div class="daytime-tracker-body">
            <div class="timeline-grid">
                ${gridRowsHtml}
            </div>
        </div>

        ${todosHtml}
    </div>
</body>
</html>`;

        const exportFileName = `Timeline-Export-${activeFile.basename}.html`;
        
        let file = plugin.app.vault.getAbstractFileByPath(exportFileName);
        if (file) {
            await plugin.app.vault.modify(file as TFile, htmlContent);
        } else {
            file = await plugin.app.vault.create(exportFileName, htmlContent);
        }

        if (file instanceof TFile) {
            // Open in default browser/app
            (plugin.app as any).openWithDefaultApp(file.path);
            new Notice(t("EXPORT_SUCCESS", settings.language));
        }
    };


    if (!activeFile) {
        return (
            <div className="daytime-tracker-empty">
                <h3>{t("NO_NOTE_OPEN", settings.language)}</h3>
                <p>{t("NO_NOTE_OPEN_DESC", settings.language)}</p>
                <button onClick={createTodaysNote} style={{ marginTop: "16px" }}>
                    {t("CREATE_TODAYS_NOTE", settings.language)}
                </button>
            </div>
        );
    }

    // Generate hours array based on setting range
    const startHour = settings.startHour;
    const endHour = settings.endHour;
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
    const dateHeader = formatDateHeader(activeFile.name);

    // Apply forced theme mode class
    const themeClass = settings.themeMode === "light" 
        ? "theme-force-light" 
        : settings.themeMode === "dark" 
            ? "theme-force-dark" 
            : "";

    return (
        <div className={`daytime-tracker-view-root ${themeClass}`} style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Main timeline grid section */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div className="daytime-tracker-header">
                    <h2 className="daytime-tracker-title">{dateHeader}</h2>
                    <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={exportToPDF} title={t("EXPORT_PDF_DESC", settings.language)}>
                            {t("EXPORT_PDF", settings.language)}
                        </button>
                        <button onClick={createTodaysNote} title={t("CREATE_TODAYS_NOTE", settings.language)}>
                            {t("TODAYS_NOTE", settings.language)}
                        </button>
                    </div>
                </div>
                
                <div className="daytime-tracker-body" style={{ flex: 1, overflowY: "auto" }}>
                    <div className="timeline-grid" onMouseLeave={() => { if (isDragging) handleMouseUp(); }}>
                        {hours.map((hour) => {
                            const isPm = hour >= 12;
                            const displayHour = hour === 0 || hour === 24 ? 12 : hour > 12 ? hour - 12 : hour;
                            const ampm = hour === 24 ? "AM" : isPm ? "PM" : "AM";

                            const hourStartMin = hour * 60;
                            const hourEndMin = (hour + 1) * 60;

                            const overlappingLogs = logs.map((log, index) => ({ log, index }))
                                .filter(({ log }) => {
                                    const startMin = timeToMinutes(log.start);
                                    const endMin = timeToMinutes(log.end);
                                    return Math.max(startMin, hourStartMin) < Math.min(endMin, hourEndMin);
                                });

                            return (
                                <div key={hour} className="timeline-row">
                                    <div className="timeline-hour-label">
                                        <span style={{ fontSize: "12px", fontWeight: "600", marginRight: "3px" }}>{displayHour}</span>
                                        <span style={{ fontSize: "9px", opacity: 0.6 }}>{ampm}</span>
                                    </div>
                                    <div className="timeline-cells">
                                        {Array.from({ length: 6 }).map((_, colIndex) => {
                                            const cellIndex = hour * 6 + colIndex;
                                            
                                            let isSelecting = false;
                                            if (isDragging && dragStart !== null && dragEnd !== null) {
                                                const min = Math.min(dragStart, dragEnd);
                                                const max = Math.max(dragStart, dragEnd);
                                                isSelecting = cellIndex >= min && cellIndex <= max;
                                            }

                                            return (
                                                <div
                                                    key={colIndex}
                                                    className={`timeline-cell ${isSelecting ? "is-selecting" : ""}`}
                                                    onMouseDown={() => handleMouseDown(cellIndex)}
                                                    onMouseEnter={() => handleMouseEnter(cellIndex)}
                                                    onMouseUp={handleMouseUp}
                                                />
                                            );
                                        })}

                                        {overlappingLogs.map(({ log, index }) => {
                                            const startMin = timeToMinutes(log.start);
                                            const endMin = timeToMinutes(log.end);

                                            const overlapStart = Math.max(startMin, hourStartMin);
                                            const overlapEnd = Math.min(endMin, hourEndMin);

                                            const startCol = (overlapStart - hourStartMin) / 10;
                                            const endCol = (overlapEnd - hourStartMin) / 10;

                                            const leftPercent = (startCol / 6) * 100;
                                            const widthPercent = ((endCol - startCol) / 6) * 100;

                                            const catObj = settings.categories.find(c => c.name === log.category);
                                            const displayTitle = catObj ? getCategoryLabel(catObj, settings.language) : log.category;
                                            const linkedTodo = log.todoId ? todos.find(t => t.id === log.todoId) : null;
                                            
                                            const tooltipText = `${log.start} ~ ${log.end} | ${displayTitle}${log.notes ? `\n${settings.language === "ko" ? "내용" : "Content"}: ${log.notes}` : ""}${linkedTodo ? `\n${settings.language === "ko" ? "연계된 할 일" : "Linked To-Do"}: ${linkedTodo.content}` : ""}`;

                                            return (
                                                <div
                                                    key={index}
                                                    className="timeline-log-block"
                                                    style={{
                                                        left: `${leftPercent}%`,
                                                        width: `${widthPercent}%`,
                                                        backgroundColor: log.color,
                                                        color: getTextColorForBackground(log.color)
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(log, index);
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                    title={tooltipText}
                                                >
                                                    {(overlapEnd - overlapStart) <= 10 ? `${displayTitle} (..)` : `${displayTitle} (${log.start}-${log.end})`}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom To-Do List section */}
            <div className="timeline-todos-container">
                <div className="timeline-todos-header" onClick={() => setIsTodosExpanded(!isTodosExpanded)}>
                    <div className="timeline-todos-title">
                        <span>{t("TODAY_TODOS", settings.language)}</span>
                        <span className="timeline-todos-count">
                            ({todos.filter(t => t.checked).length}/{todos.length})
                        </span>
                    </div>
                    <div className={`timeline-todos-toggle-icon ${!isTodosExpanded ? "is-collapsed" : ""}`}>
                        ▼
                    </div>
                </div>

                {isTodosExpanded && (
                    <div className="timeline-todos-body">
                        <div className="timeline-todos-input-wrapper">
                            <input
                                type="text"
                                maxLength={20}
                                placeholder={t("NEW_TODO_PLACEHOLDER", settings.language)}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === "Enter") {
                                        const target = e.currentTarget;
                                        handleAddTodo(target.value);
                                        target.value = "";
                                    }
                                }}
                            />
                        </div>
                        <ul className="timeline-todos-list">
                            {todos.map((todo) => (
                                <li key={todo.id} className={`timeline-todo-item ${todo.checked ? "is-checked" : ""}`}>
                                    <input
                                        type="checkbox"
                                        className="timeline-todo-checkbox"
                                        checked={todo.checked}
                                        onChange={() => handleToggleTodo(todo.id)}
                                    />
                                    <span className="timeline-todo-text" title={todo.content}>
                                        {todo.content}
                                    </span>
                                    <button
                                        className="timeline-todo-delete-btn"
                                        onClick={() => handleDeleteTodo(todo.id)}
                                        title={t("DELETE_TODO", settings.language)}
                                    >
                                        ✕
                                    </button>
                                </li>
                            ))}
                            {todos.length === 0 && (
                                <li style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "11px", padding: "12px 0" }}>
                                    {t("NO_TODOS", settings.language)}
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

class ConfirmModal extends Modal {
    private message: string;
    private onConfirm: () => void;
    private onCancel?: () => void;
    private isConfirmed = false;
    private language: string;

    constructor(app: App, message: string, language: string, onConfirm: () => void, onCancel?: () => void) {
        super(app);
        this.message = message;
        this.language = language;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
    }

    onOpen() {
        this.containerEl.addClass("timeline-custom-modal-container");
        const { contentEl } = this;
        contentEl.empty();
        
        this.titleEl.setText(this.language === "ko" ? "알림" : "Notice");
        
        const p = contentEl.createEl("p", { 
            text: this.message
        });
        p.style.marginBottom = "20px";
        p.style.fontSize = "14px";
        p.style.lineHeight = "1.5";
        p.style.color = "var(--text-normal)";

        const btnContainer = contentEl.createDiv();
        btnContainer.style.display = "flex";
        btnContainer.style.justifyContent = "flex-end";
        btnContainer.style.gap = "8px";

        const cancelBtn = btnContainer.createEl("button", {
            text: this.language === "ko" ? "취소" : "Cancel"
        });
        cancelBtn.addEventListener("click", () => {
            this.close();
        });

        const confirmBtn = btnContainer.createEl("button", {
            text: this.language === "ko" ? "확인" : "Confirm",
            cls: "mod-cta"
        });
        confirmBtn.addEventListener("click", () => {
            this.isConfirmed = true;
            this.close();
        });
    }

    onClose() {
        if (this.isConfirmed) {
            this.onConfirm();
        } else if (this.onCancel) {
            this.onCancel();
        }
    }
}
