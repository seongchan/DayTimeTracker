import { App, Modal, Notice } from "obsidian";
import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { createRoot, Root } from "react-dom/client";
import { t } from "./locale/helpers";

export interface CustomCategory {
    name: string;
    displayName: string;
    color: string;
    isDefault?: boolean;
    // For backward-compatibility support:
    displayNameKo?: string;
    displayNameEn?: string;
}

export interface TimelineLogEntry {
    type: "daytime-tracker";
    start: string;
    end: string;
    category: string;
    color: string;
    content: string; // Mapped to "제목" (Title) - matches category name
    todoId?: number; // Linked To-Do item ID
    notes?: string;  // Mapped to "내용" (Content - Notes)
    // 현재는 카테고리명을 노출하는데 나중에 필요 시 입력한 제목이 노출되도록 한다
    title?: string;
}

export interface TimelineTodoItem {
    id: number;
    content: string;
    checked: boolean;
}

export const DEFAULT_CATEGORIES: CustomCategory[] = [
    { name: "Work", displayName: "Work", color: "#d0e1fd", isDefault: true },
    { name: "Study", displayName: "Study", color: "#ebd3f8", isDefault: true },
    { name: "Rest", displayName: "Rest", color: "#d1f2e5", isDefault: true },
    { name: "Reading", displayName: "Reading", color: "#fdecd0", isDefault: true },
    { name: "Exercise", displayName: "Exercise", color: "#e2e5e9", isDefault: true }
];

export const getCategoryLabel = (categoryObj: CustomCategory | undefined, lang: string): string => {
    if (!categoryObj) return "";
    return categoryObj.displayName || (lang === "ko" ? categoryObj.displayNameKo : categoryObj.displayNameEn) || categoryObj.name;
};

interface TimelineModalComponentProps {
    logEntry: TimelineLogEntry | null;
    startTime: string;
    endTime: string;
    todos: TimelineTodoItem[];
    initialTodoId: number | null;
    defaultContent: string;
    language: string;
    categories: CustomCategory[];
    onSave: (entry: TimelineLogEntry) => void;
    onDelete: () => void;
    onCancel: () => void;
}

export const TimelineModalComponent: React.FC<TimelineModalComponentProps> = ({
    logEntry,
    startTime,
    endTime,
    todos,
    initialTodoId,
    defaultContent,
    language,
    categories,
    onSave,
    onDelete,
    onCancel
}) => {
    const [start, setStart] = useState(logEntry ? logEntry.start : startTime);
    const [end, setEnd] = useState(logEntry ? logEntry.end : endTime);
    const [notes, setNotes] = useState(logEntry?.notes || "");
    const [category, setCategory] = useState(logEntry ? logEntry.category : (categories[0]?.name || DEFAULT_CATEGORIES[0].name));
    const [color, setColor] = useState(logEntry ? logEntry.color : (categories[0]?.color || DEFAULT_CATEGORIES[0].color));
    
    // Linked Todo state
    const linkedTodoId = logEntry?.todoId || initialTodoId || null;

    // Find the linked todo if exists
    const linkedTodo = linkedTodoId ? todos.find(t => t.id === linkedTodoId) : null;

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus with a small timeout to bypass Obsidian's modal initialization race condition
    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                // Move cursor to the end of text
                const length = textareaRef.current.value.length;
                textareaRef.current.setSelectionRange(length, length);
            }
        }, 50);

        return () => window.clearTimeout(timer);
    }, []);

    const handleSave = () => {
        // Validate time format (HH:mm)
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
            new Notice(t("INVALID_TIME_FORMAT", language));
            return;
        }

        // Validate start is before end
        const startMin = timeToMinutes(start);
        const endMin = timeToMinutes(end);
        if (startMin >= endMin) {
            new Notice(t("END_TIME_MUST_BE_LATER", language));
            return;
        }

        const newEntry: TimelineLogEntry = {
            type: "daytime-tracker",
            start,
            end,
            category,
            color,
            content: category // Content defaults to category name
        };

        if (linkedTodoId !== null) {
            newEntry.todoId = linkedTodoId;
        }

        if (notes.trim()) {
            newEntry.notes = notes.trim();
        }

        // 나중에 제목 입력 필드를 추가하면 아래처럼 title을 채운다.
        // if (title.trim()) {
        //     newEntry.title = title.trim();
        // }

        onSave(newEntry);
    };

    function timeToMinutes(timeStr: string): number {
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
    }

    const activeCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

    return (
        <div className="timeline-modal-container">
            {/* 시간설정 */}
            <div className="timeline-modal-field">
                <label>{t("FIELD_TIME_SETTING", language)}</label>
                <div className="timeline-modal-time-inputs">
                    <input
                        type="text"
                        value={start}
                        placeholder="09:00"
                        onChange={(e) => setStart(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                    <input
                        type="text"
                        value={end}
                        placeholder="10:00"
                        onChange={(e) => setEnd(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                </div>
            </div>

            {/* 카테고리 */}
            <div className="timeline-modal-field">
                <label>{t("FIELD_CATEGORY", language)}</label>
                <div className="timeline-modal-color-chips">
                    {activeCategories.map((chip) => (
                        <div
                            key={chip.name}
                            className={`timeline-modal-color-chip ${category === chip.name ? "is-selected" : ""}`}
                            onClick={() => {
                                setCategory(chip.name);
                                setColor(chip.color);
                            }}
                        >
                            <div
                                className="timeline-modal-color-preview"
                                style={{ backgroundColor: chip.color }}
                            />
                            <span>{getCategoryLabel(chip, language)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 내용 (상세 메모) */}
            <div className="timeline-modal-field">
                <label>{t("FIELD_CONTENT", language)}</label>
                <textarea
                    ref={textareaRef}
                    value={notes}
                    placeholder={t("FIELD_CONTENT_PLACEHOLDER", language)}
                    onChange={(e) => setNotes(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    rows={4}
                />
            </div>

            {/* 연계된 할일 (해당사항 있을 때만 단순 정보 텍스트 노출) */}
            {linkedTodo && (
                <div className="timeline-modal-field">
                    <label>{t("FIELD_LINKED_TODO", language)}</label>
                    <div className="timeline-modal-linked-todo-text">
                        {linkedTodo.content}
                    </div>
                </div>
            )}

            {/* 버튼 */}
            <div className="timeline-modal-buttons">
                {logEntry && (
                    <button className="is-delete" onClick={onDelete}>
                        {t("BTN_DELETE", language)}
                    </button>
                )}
                <button onClick={onCancel}>{t("BTN_CANCEL", language)}</button>
                <button className="mod-cta" onClick={handleSave}>
                    {t("BTN_SAVE", language)}
                </button>
            </div>
        </div>
    );
};

export class TimelineModal extends Modal {
    private root: Root | null = null;
    private logEntry: TimelineLogEntry | null;
    private startTime: string;
    private endTime: string;
    private todos: TimelineTodoItem[];
    private initialTodoId: number | null;
    private defaultContent: string;
    private language: string;
    private categories: CustomCategory[];
    private themeMode: string;
    private onSave: (entry: TimelineLogEntry) => void;
    private onDelete?: () => void;

    constructor(
        app: App,
        logEntry: TimelineLogEntry | null,
        startTime: string,
        endTime: string,
        todos: TimelineTodoItem[],
        initialTodoId: number | null,
        defaultContent: string,
        language: string,
        categories: CustomCategory[],
        themeMode: string,
        onSave: (entry: TimelineLogEntry) => void,
        onDelete?: () => void
    ) {
        super(app);
        this.logEntry = logEntry;
        this.startTime = startTime;
        this.endTime = endTime;
        this.todos = todos;
        this.initialTodoId = initialTodoId;
        this.defaultContent = defaultContent;
        this.language = language;
        this.categories = categories;
        this.themeMode = themeMode;
        this.onSave = onSave;
        this.onDelete = onDelete;
    }

    onOpen() {
        this.containerEl.addClass("timeline-custom-modal-container");
        // "default"(옵시디언 테마 기본값)는 실제 활성 테마 색상을 알 수 없으므로
        // 페이퍼 화이트 모양으로 표현한다.
        this.containerEl.addClass(this.themeMode === "dark" ? "theme-force-dark" : "theme-force-light");
        const { contentEl } = this;
        contentEl.empty();
        
        const titleText = this.logEntry 
            ? t("MODAL_TITLE_EDIT", this.language) 
            : t("MODAL_TITLE_RECORD", this.language);
        this.titleEl.setText(titleText);

        this.root = createRoot(contentEl);
        this.root.render(
            <TimelineModalComponent
                logEntry={this.logEntry}
                startTime={this.startTime}
                endTime={this.endTime}
                todos={this.todos}
                initialTodoId={this.initialTodoId}
                defaultContent={this.defaultContent}
                language={this.language}
                categories={this.categories}
                onSave={(entry) => {
                    this.onSave(entry);
                    this.close();
                }}
                onDelete={() => {
                    if (this.onDelete) {
                        this.onDelete();
                    }
                    this.close();
                }}
                onCancel={() => this.close()}
            />
        );
    }

    onClose() {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }
}
