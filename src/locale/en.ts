const en = {
    // Sidebar View
    NO_NOTE_OPEN: "No note open",
    NO_NOTE_OPEN_DESC: "Please select an active note to view or edit logs.",
    CREATE_TODAYS_NOTE: "Create today's daily note",
    TODAYS_NOTE: "Today",
    EXPORT_PDF: "Print",
    EXPORT_PDF_DESC: "Export timeline to a printable HTML file.",
    EXPORT_SUCCESS: "Timeline HTML file has been generated. Open it in a browser to save as PDF!",
    
    // To-Do Section
    TODAY_TODOS: "Today's To-Dos",
    NEW_TODO_PLACEHOLDER: "Add a new to-do... (Enter)",
    NO_TODOS: "No to-dos for today.",
    DELETE_TODO: "Delete",
    
    // Dialogs / Alerts
    CONFIRM_RECORD_TIMELINE: "Would you like to record this to-do on the timeline?",
    CONFIRM_DELETE_LINKED_LOG: "Would you like to delete the linked timeline record as well?",
    CONFIRM_DELETE_TODO: "Are you sure you want to delete the to-do '{title}'?",
    INVALID_TIME_FORMAT: "Invalid time format. (e.g. 09:00)",
    END_TIME_MUST_BE_LATER: "End time must be later than start time.",
    
    // Timeline Modal
    MODAL_TITLE_RECORD: "What did you do?",
    MODAL_TITLE_EDIT: "Edit Daily Activity",
    FIELD_TIME_SETTING: "Time Setting",
    FIELD_TITLE: "Title",
    FIELD_TITLE_PLACEHOLDER: "Enter a title.",
    FIELD_CONTENT: "Content",
    FIELD_CONTENT_PLACEHOLDER: "Enter detailed content.",
    FIELD_LINKED_TODO: "Linked To-Do",
    FIELD_CATEGORY: "Category",
    
    // Buttons
    BTN_DELETE: "Delete",
    BTN_CANCEL: "Cancel",
    BTN_SAVE: "Save",
    
    // Settings Tab
    SETTINGS_TITLE: "DayTime Tracker Settings",
    SETTING_GENERAL_SECTION: "General",
    SETTING_START_HOUR_NAME: "Day Start Hour",
    SETTING_START_HOUR_DESC: "Set the start hour to display on the timeline.",
    SETTING_END_HOUR_NAME: "Day End Hour",
    SETTING_END_HOUR_DESC: "Set the end hour to display on the timeline. (Supports up to midnight 24:00)",
    SETTING_HIDE_PROPERTIES_NAME: "Hide Document Properties Block",
    SETTING_HIDE_PROPERTIES_DESC: "Completely hide the properties editor (metadata container) at the top of the editor and reading views.",
    ALERT_START_BEFORE_END: "Start hour must be earlier than end hour.",
    ALERT_END_AFTER_START: "End hour must be later than start hour.",
    
    // Theme Mode
    SETTING_THEME_MODE_NAME: "Background Theme Mode",
    SETTING_THEME_MODE_DESC: "Select the background color theme for the sidebar view.",
    THEME_MODE_DEFAULT: "System Default",
    THEME_MODE_LIGHT: "Light",
    THEME_MODE_DARK: "Dark",
    
    // Custom Categories
    SETTING_CATEGORIES_SECTION: "Category Management",
    SETTING_CATEGORIES_DESC: "Customize the categories and colors used in your daily logs.",
    SETTING_CAT_DISPLAY_NAME_PLACEHOLDER: "Display Name",
    SETTING_ADD_CATEGORY_NAME: "Add New Category",
    SETTING_ADD_CATEGORY_DESC: "Enter a name (max 10 chars) and pick a color to add a new category.",
    SETTING_ADD_CATEGORY_PLACEHOLDER: "Category Name",
    BTN_ADD: "Add",
    
    // Alerts / Validations
    ALERT_TODO_LENGTH_LIMIT: "To-Do content cannot exceed 20 characters.",
    ALERT_CAT_LIMIT_MIN: "You must keep at least 5 categories.",
    ALERT_CAT_LIMIT_MAX: "You cannot have more than 10 categories.",
    ALERT_CAT_NAME_LIMIT: "Category name cannot exceed 10 characters.",
    ALERT_CAT_NAME_EMPTY: "Please enter a category name.",
    ALERT_CAT_NAME_EXISTS: "This category name already exists.",
};

export default en;
