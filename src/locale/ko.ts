import en from "./en";

const ko: typeof en = {
    // Sidebar View
    NO_NOTE_OPEN: "선택된 노트가 없습니다",
    NO_NOTE_OPEN_DESC: "일과를 기록하고 조회하려면 활성화된 노트를 선택해 주세요.",
    CREATE_TODAYS_NOTE: "오늘의 데일리 노트 생성",
    TODAYS_NOTE: "오늘",
    EXPORT_PDF: "인쇄",
    EXPORT_PDF_DESC: "타임라인을 PDF/인쇄용 HTML 파일로 내보냅니다.",
    EXPORT_SUCCESS: "타임라인 인쇄용 HTML 파일이 생성되었습니다. 브라우저 창에서 PDF로 저장하세요!",
    
    // To-Do Section
    TODAY_TODOS: "오늘 할 일",
    NEW_TODO_PLACEHOLDER: "새로운 할 일 추가... (Enter)",
    NO_TODOS: "등록된 오늘 할 일이 없습니다.",
    DELETE_TODO: "삭제",
    
    // Dialogs / Alerts
    CONFIRM_RECORD_TIMELINE: "이 할 일을 타임라인에 기록하시겠습니까?",
    CONFIRM_DELETE_LINKED_LOG: "연계된 타임라인 기록도 함께 삭제하시겠습니까?",
    CONFIRM_DELETE_TODO: "'{title}' 할 일을 삭제하시겠습니까?",
    INVALID_TIME_FORMAT: "시간 형식이 올바르지 않습니다. (예: 09:00)",
    END_TIME_MUST_BE_LATER: "종료 시간은 시작 시간보다 늦어야 합니다.",
    
    // Timeline Modal
    MODAL_TITLE_RECORD: "무엇을 했나요?",
    MODAL_TITLE_EDIT: "일과 수정",
    FIELD_TIME_SETTING: "시간 설정",
    FIELD_TITLE: "제목",
    FIELD_TITLE_PLACEHOLDER: "제목을 입력해 주세요.",
    FIELD_CONTENT: "내용",
    FIELD_CONTENT_PLACEHOLDER: "상세 내용을 입력해 주세요.",
    FIELD_LINKED_TODO: "연계된 할 일",
    FIELD_CATEGORY: "카테고리",
    
    // Buttons
    BTN_DELETE: "삭제",
    BTN_CANCEL: "취소",
    BTN_SAVE: "저장",
    
    // Settings Tab
    SETTINGS_TITLE: "DayTime Tracker 설정",
    SETTING_GENERAL_SECTION: "일반",
    SETTING_START_HOUR_NAME: "하루 시작 시간",
    SETTING_START_HOUR_DESC: "타임라인에 표시할 시작 시간(시)을 설정합니다.",
    SETTING_END_HOUR_NAME: "하루 종료 시간",
    SETTING_END_HOUR_DESC: "타임라인에 표시할 종료 시간(시)을 설정합니다. (자정 24:00까지 지원)",
    SETTING_HIDE_PROPERTIES_NAME: "문서 속성 영역(Properties) 숨기기",
    SETTING_HIDE_PROPERTIES_DESC: "노트 편집기 및 읽기 모드 상단에 표시되는 속성창(속성 제목 및 '+ 속성 추가' 버튼)을 완전히 감춥니다.",
    ALERT_START_BEFORE_END: "시작 시간은 종료 시간보다 빨라야 합니다.",
    ALERT_END_AFTER_START: "종료 시간은 시작 시간보다 늦어야 합니다.",
    
    // Theme Mode
    SETTING_THEME_MODE_NAME: "배경 테마 설정",
    SETTING_THEME_MODE_DESC: "사이드바 화면의 배경색 테마를 선택합니다.",
    THEME_MODE_DEFAULT: "옵시디언 테마 기본값",
    THEME_MODE_LIGHT: "라이트",
    THEME_MODE_DARK: "다크",
    
    // Custom Categories
    SETTING_CATEGORIES_SECTION: "카테고리 설정",
    SETTING_CATEGORIES_DESC: "일과 기록에 사용할 카테고리와 색상을 관리합니다.",
    SETTING_CAT_DISPLAY_NAME_PLACEHOLDER: "표시 이름",
    SETTING_ADD_CATEGORY_NAME: "새 카테고리 추가",
    SETTING_ADD_CATEGORY_DESC: "새 카테고리 이름(최대 10자)과 색상을 지정하여 추가합니다.",
    SETTING_ADD_CATEGORY_PLACEHOLDER: "카테고리 이름 입력...",
    BTN_ADD: "추가",
    
    // Alerts / Validations
    ALERT_TODO_LENGTH_LIMIT: "할 일 내용은 20자를 초과할 수 없습니다.",
    ALERT_CAT_LIMIT_MIN: "카테고리는 최소 5개 이상 유지해야 합니다.",
    ALERT_CAT_LIMIT_MAX: "카테고리는 최대 10개까지만 추가할 수 있습니다.",
    ALERT_CAT_NAME_LIMIT: "카테고리 이름은 10자를 초과할 수 없습니다.",
    ALERT_CAT_NAME_EMPTY: "카테고리 이름을 입력해 주세요.",
    ALERT_CAT_NAME_EXISTS: "이미 존재하는 카테고리 이름입니다.",
};

export default ko;
