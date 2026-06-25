import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView, Notice, getLanguage } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { TimelineView } from "./TimelineView";
import { t } from "./locale/helpers";
import { DEFAULT_CATEGORIES, CustomCategory } from "./TimelineModal";

export const TIMELINE_VIEW_TYPE = "daytime-tracker-view";

export interface DayTimeTrackerSettings {
    startHour: number;
    endHour: number;
    hidePropertiesBlock: boolean;
    language: string;
    categories: CustomCategory[];
    themeMode: string;
}

const DEFAULT_SETTINGS: DayTimeTrackerSettings = {
    startHour: 0,
    endHour: 24,
    hidePropertiesBlock: true,
    language: "",
    categories: [],
    themeMode: "light",
};

export default class DayTimeTrackerPlugin extends Plugin {
    settings: DayTimeTrackerSettings = DEFAULT_SETTINGS;

    async onload() {
        await this.loadSettings();
        this.updatePropertiesBlockClass();

        // Register the custom view creator
        this.registerView(
            TIMELINE_VIEW_TYPE,
            (leaf) => new DayTimeTrackerView(leaf, this)
        );

        // Add a ribbon icon to open the timeline
        this.addRibbonIcon("calendar-clock", "DayTime Tracker", () => {
            void this.activateView();
        });

        // Add a command to open the timeline
        this.addCommand({
            id: "open-timeline",
            name: "Open timeline",
            callback: () => {
                void this.activateView();
            },
        });

        // Add settings tab
        this.addSettingTab(new DayTimeTrackerSettingTab(this.app, this));
    }

    onunload() {
        // Clean up global body class
        activeDocument.body.classList.remove("daytime-tracker-hide-properties");
    }

    async loadSettings() {
        const savedData = (await this.loadData()) as Partial<DayTimeTrackerSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
        if (!this.settings.language) {
            const obsidianLang = getLanguage() || "en";
            this.settings.language = (obsidianLang === "ko") ? "ko" : "en";
            await this.saveSettings();
        }
        if (!this.settings.categories || this.settings.categories.length === 0) {
            this.settings.categories = [...DEFAULT_CATEGORIES];
            await this.saveSettings();
        } else {
            // Migrate old categories to single displayName
            let migrated = false;
            this.settings.categories.forEach(cat => {
                if (!cat.displayName) {
                    cat.displayName = cat.displayNameEn || cat.displayNameKo || cat.name;
                    migrated = true;
                }
            });
            if (migrated) {
                await this.saveSettings();
            }
        }
        // Migrate from old format if any defaults are missing or layout is different
        const hasExercise = this.settings.categories.some(c => c.name === "Exercise");
        const hasReading = this.settings.categories.some(c => c.name === "Reading");
        if (!hasReading && hasExercise) {
            // Re-initialize default categories to match the user's requested 5 items
            this.settings.categories = [...DEFAULT_CATEGORIES];
            await this.saveSettings();
        }
        if (!this.settings.themeMode) {
            this.settings.themeMode = "light";
            await this.saveSettings();
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updatePropertiesBlockClass();
        // Trigger event to notify react components that settings changed
        this.app.workspace.trigger("daytime-tracker:settings-changed");
    }

    updatePropertiesBlockClass() {
        if (this.settings.hidePropertiesBlock) {
            activeDocument.body.classList.add("daytime-tracker-hide-properties");
        } else {
            activeDocument.body.classList.remove("daytime-tracker-hide-properties");
        }
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            // Place it in the right sidebar (leaf)
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({
                    type: TIMELINE_VIEW_TYPE,
                    active: true,
                });
            }
        }

        if (leaf) {
            void workspace.revealLeaf(leaf);
        }
    }
}

class DayTimeTrackerView extends ItemView {
    private root: Root | null = null;
    private plugin: DayTimeTrackerPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: DayTimeTrackerPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return TIMELINE_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "DayTime Tracker";
    }

    getIcon(): string {
        return "calendar-clock";
    }

    async onOpen() {
        // Add class to container for css scoping
        this.containerEl.addClass("daytime-tracker-view-container");
        this.contentEl.empty();
        
        this.root = createRoot(this.contentEl);
        this.render();
    }

    render() {
        if (this.root) {
            this.root.render(
                <React.StrictMode>
                    <TimelineView plugin={this.plugin} />
                </React.StrictMode>
            );
        }
    }

    async onClose() {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }
}

class DayTimeTrackerSettingTab extends PluginSettingTab {
    plugin: DayTimeTrackerPlugin;

    constructor(app: App, plugin: DayTimeTrackerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass("daytime-tracker-settings");

        const lang = this.plugin.settings.language;

        const mainTitleSetting = new Setting(containerEl)
            .setName(t("SETTINGS_TITLE", lang))
            .setHeading();
        mainTitleSetting.settingEl.addClass("daytime-settings-main-title");

        new Setting(containerEl)
            .setName(t("SETTING_GENERAL_SECTION", lang))
            .setHeading();

        const formatHourOption = (h: number): string => {
            if (h === 0) return lang === "ko" ? "오전 12시 (00:00)" : "12 AM (00:00)";
            if (h === 24) return lang === "ko" ? "자정 (24:00)" : "Midnight (24:00)";
            if (h === 12) return lang === "ko" ? "오후 12시 (12:00)" : "12 PM (12:00)";
            if (h < 12) return lang === "ko" ? `오전 ${h}시` : `${h} AM`;
            return lang === "ko" ? `오후 ${h - 12}시` : `${h - 12} PM`;
        };

        new Setting(containerEl)
            .setName(t("SETTING_START_HOUR_NAME", lang))
            .setDesc(t("SETTING_START_HOUR_DESC", lang))
            .addDropdown((dropdown) => {
                for (let i = 0; i <= 23; i++) {
                    dropdown.addOption(String(i), formatHourOption(i));
                }
                dropdown
                    .setValue(String(this.plugin.settings.startHour))
                    .onChange(async (value) => {
                        const val = parseInt(value, 10);
                        if (val >= this.plugin.settings.endHour) {
                            new Notice(t("ALERT_START_BEFORE_END", lang));
                            dropdown.setValue(String(this.plugin.settings.startHour));
                            return;
                        }
                        this.plugin.settings.startHour = val;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName(t("SETTING_END_HOUR_NAME", lang))
            .setDesc(t("SETTING_END_HOUR_DESC", lang))
            .addDropdown((dropdown) => {
                for (let i = 1; i <= 24; i++) {
                    dropdown.addOption(String(i), formatHourOption(i));
                }
                dropdown
                    .setValue(String(this.plugin.settings.endHour))
                    .onChange(async (value) => {
                        const val = parseInt(value, 10);
                        if (val <= this.plugin.settings.startHour) {
                            new Notice(t("ALERT_END_AFTER_START", lang));
                            dropdown.setValue(String(this.plugin.settings.endHour));
                            return;
                        }
                        this.plugin.settings.endHour = val;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName(t("SETTING_HIDE_PROPERTIES_NAME", lang))
            .setDesc(t("SETTING_HIDE_PROPERTIES_DESC", lang))
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.hidePropertiesBlock)
                    .onChange(async (value) => {
                        this.plugin.settings.hidePropertiesBlock = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName(lang === "ko" ? "언어 (Language)" : "Language")
            .setDesc(lang === "ko" ? "플러그인 UI의 표시 언어를 선택합니다." : "Select the display language for the plugin UI.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("ko", "한국어 (Korean)")
                    .addOption("en", "English")
                    .setValue(lang)
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        // Forced Theme setting tab
        new Setting(containerEl)
            .setName(t("SETTING_THEME_MODE_NAME", lang))
            .setDesc(t("SETTING_THEME_MODE_DESC", lang))
            .addDropdown((dropdown) => {
                // "옵시디언 테마 기본값"(default)은 더 이상 옵션으로 노출하지 않는다.
                // 과거 배포본에서 이 값을 선택해둔 사용자의 설정은 그대로 유지되고,
                // 드롭다운에는 라이트로 표시되다가 사용자가 직접 바꾸면 그때부터
                // light/dark 중 하나로 저장된다.
                dropdown
                    .addOption("light", t("THEME_MODE_LIGHT", lang))
                    .addOption("dark", t("THEME_MODE_DARK", lang))
                    .setValue(this.plugin.settings.themeMode === "dark" ? "dark" : "light")
                    .onChange(async (value) => {
                        this.plugin.settings.themeMode = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Categories Management Section
        new Setting(containerEl)
            .setName(t("SETTING_CATEGORIES_SECTION", lang))
            .setHeading();
        
        const categoriesDesc = containerEl.createEl("p", { 
            text: t("SETTING_CATEGORIES_DESC", lang),
            cls: "daytime-tracker-settings-desc"
        });
        categoriesDesc.setCssStyles({
            fontSize: "var(--font-ui-smaller)",
            color: "var(--text-muted)",
            marginTop: "0px",
            marginBottom: "12px"
        });

        new Setting(containerEl)
            .setName(lang === "ko" ? "기본 카테고리 색상 재설정" : "Reset Default Categories")
            .setDesc(lang === "ko" ? "카테고리와 색상을 원래의 파스텔톤 기본값으로 재설정합니다." : "Reset all categories and colors to the default pastel values.")
            .addButton((btn) => {
                btn.setButtonText(lang === "ko" ? "재설정" : "Reset")
                    .setDestructive()
                    .onClick(async () => {
                        this.plugin.settings.categories = [...DEFAULT_CATEGORIES];
                        await this.plugin.saveSettings();
                        new Notice(lang === "ko" ? "카테고리가 기본값으로 재설정되었습니다." : "Categories reset to default values.");
                        this.display();
                    });
            });

        const categories = this.plugin.settings.categories || [];
        categories.forEach((cat, idx) => {
            const isDefaultCat = cat.isDefault || cat.name === "Work" || cat.name === "Study" || cat.name === "Rest" || cat.name === "Reading" || cat.name === "Exercise";
            
            const settingRow = new Setting(containerEl)
                .setName("");
            settingRow.settingEl.addClass("daytime-category-setting-item");

            // All categories have a single editable display name field
            settingRow.addText((txt) => {
                txt.setPlaceholder(t("SETTING_CAT_DISPLAY_NAME_PLACEHOLDER", lang))
                   .setValue(cat.displayName || cat.name)
                   .onChange(async (value) => {
                       const val = value.trim();
                       cat.displayName = val;
                       cat.displayNameKo = val;
                       cat.displayNameEn = val;
                       await this.plugin.saveSettings();
                   });
                txt.inputEl.maxLength = 10;
                txt.inputEl.setCssStyles({ width: "190px" });
            });

            // Color picker
            settingRow.addColorPicker((picker) => {
                picker.setValue(cat.color)
                    .onChange(async (value) => {
                        this.plugin.settings.categories[idx].color = value;
                        await this.plugin.saveSettings();
                    });
            });

            // Delete button (Only for custom categories)
            if (!isDefaultCat) {
                settingRow.addButton((btn) => {
                    btn.setButtonText("X")
                        .setDestructive()
                        .onClick(async () => {
                            this.plugin.settings.categories.splice(idx, 1);
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });
            }
        });

        // Add Category Setting Row
        if (categories.length < 10) {
            let newName = "";
            let newColor = "#95A5A6";

            new Setting(containerEl)
                .setName(t("SETTING_ADD_CATEGORY_NAME", lang))
                .setDesc(t("SETTING_ADD_CATEGORY_DESC", lang))
                .addText((text) => {
                    text.setPlaceholder(t("SETTING_ADD_CATEGORY_PLACEHOLDER", lang))
                        .onChange((value) => {
                            newName = value;
                        });
                    text.inputEl.maxLength = 10;
                })
                .addColorPicker((picker) => {
                    picker.setValue(newColor)
                        .onChange((value) => {
                            newColor = value;
                        });
                })
                .addButton((btn) => {
                    btn.setButtonText(t("BTN_ADD", lang))
                        .setCta()
                        .onClick(async () => {
                            const trimmedName = newName.trim();
                            if (!trimmedName) {
                                new Notice(t("ALERT_CAT_NAME_EMPTY", lang));
                                return;
                            }
                            if (trimmedName.length > 10) {
                                new Notice(t("ALERT_CAT_NAME_LIMIT", lang));
                                return;
                            }
                            if (this.plugin.settings.categories.length >= 10) {
                                new Notice(t("ALERT_CAT_LIMIT_MAX", lang));
                                return;
                            }
                            const exists = this.plugin.settings.categories.some(
                                (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
                            );
                            if (exists) {
                                new Notice(t("ALERT_CAT_NAME_EXISTS", lang));
                                return;
                            }

                            this.plugin.settings.categories.push({
                                name: trimmedName,
                                displayName: trimmedName,
                                displayNameKo: trimmedName,
                                displayNameEn: trimmedName,
                                color: newColor
                            });
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });
        }
    }
}
