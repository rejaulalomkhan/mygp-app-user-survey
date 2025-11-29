/**
 * MyGP Survey Application - Configuration
 * Author: Arman Azij
 * Description: Application configuration and settings
 */

const CONFIG = {
    // ============================================
    // API CONFIGURATION
    // ============================================
    
    /**
     * Google Apps Script Web App URL
     * Update this URL after deploying your Google Apps Script
     */
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzVBtlDbLdAmpDpkSary5JSd_ZVuVh30S1OTqRt7duntTGokGMQpVVbMzyj_PD5XJnaCg/exec",
    
    // ============================================
    // TIMING CONFIGURATION
    // ============================================
    
    /**
     * Auto-refresh interval in milliseconds
     * Default: 30000 (30 seconds)
     */
    AUTO_REFRESH_INTERVAL: 30000,
    
    /**
     * Toast notification duration in milliseconds
     * Default: 3000 (3 seconds)
     */
    TOAST_DURATION: 3000,
    
    /**
     * Number animation settings
     */
    ANIMATION: {
        DURATION: 50,  // Duration per step in milliseconds
        STEPS: 20      // Number of animation steps
    },
    
    // ============================================
    // DATA CONFIGURATION
    // ============================================
    
    /**
     * Local storage key for saving survey data
     */
    STORAGE_KEY: 'surveyData',
    
    /**
     * List of professions
     */
    PROFESSIONS: [
        'ডাক্তার',
        'ইঞ্জিনিয়ার',
        'ছাত্র',
        'চাকুরিজীবি',
        'ব্যবসায়ী',
        'পথচারী'
    ],
    
    /**
     * Profession icons mapping (Bootstrap Icons)
     */
    PROFESSION_ICONS: {
        'ডাক্তার': 'bi-hospital',
        'ইঞ্জিনিয়ার': 'bi-gear',
        'ছাত্র': 'bi-mortarboard',
        'চাকুরিজীবি': 'bi-briefcase',
        'ব্যবসায়ী': 'bi-currency-dollar',
        'পথচারী': 'bi-person-walking'
    },
    
    /**
     * Usage reasons
     */
    REASONS: {
        MB_DATA: 'মিনিট/ডাটা দেখা বা ক্রয় করার জন্য',
        SOCIAL_AD: 'সোশ্যাল এড দেখার জন্য',
        BOTH: 'উভয়'
    },
    
    // ============================================
    // CHART CONFIGURATION
    // ============================================
    
    /**
     * Chart.js color schemes
     */
    CHART_COLORS: {
        /**
         * Colors for profession distribution chart (Doughnut)
         */
        professions: [
            '#FF6384',  // Red - ডাক্তার
            '#36A2EB',  // Blue - ইঞ্জিনিয়ার
            '#FFCE56',  // Yellow - ছাত্র
            '#4BC0C0',  // Cyan - চাকুরিজীবি
            '#9966FF',  // Purple - ব্যবসায়ী
            '#FF9F40'   // Orange - পথচারী
        ],
        
        /**
         * Colors for usage reason chart (Bar)
         */
        usage: [
            'rgba(54, 162, 235, 0.8)',   // Blue - মিনিট/এমবি চেক
            'rgba(255, 99, 132, 0.8)',   // Red - এড দেখা
            'rgba(255, 206, 86, 0.8)'    // Yellow - উভয়
        ]
    },
    
    /**
     * Chart.js common options
     */
    CHART_OPTIONS: {
        responsive: true,
        maintainAspectRatio: false
    },
    
    // ============================================
    // UI CONFIGURATION
    // ============================================
    
    /**
     * Phone number default prefix
     */
    PHONE_PREFIX: '88',
    
    /**
     * Date format locale
     */
    DATE_LOCALE: 'bn-BD',
    
    /**
     * Table settings
     */
    TABLE: {
        MAX_HEIGHT: '500px',
        EMPTY_MESSAGE: 'কোন ডেটা নেই'
    },
    
    // ============================================
    // FEATURE FLAGS
    // ============================================
    
    /**
     * Enable/disable features
     */
    FEATURES: {
        AUTO_REFRESH: true,
        DEBUG_MODE: false,
        OFFLINE_MODE: true,
        EXCEL_EXPORT: true
    },
    
    // ============================================
    // MESSAGES
    // ============================================
    
    /**
     * Toast notification messages
     */
    MESSAGES: {
        SUCCESS: {
            SUBMIT: 'সার্ভে সফলভাবে জমা হয়েছে এবং Google Sheets এ সংরক্ষিত হয়েছে!',
            LOAD: 'ডেটা সফলভাবে লোড হয়েছে',
            EXCEL_DOWNLOAD: 'এক্সেল ডাউনলোড সফল হয়েছে!'
        },
        ERROR: {
            SERVER: 'সার্ভার এরর',
            NETWORK: 'ইন্টারনেট সংযোগ সমস্যা',
            NO_DATA: 'কোন ডেটা নেই',
            INVALID_FORMAT: 'ডেটা ফরম্যাট সঠিক নয়',
            DUPLICATE_PHONE: 'এই ফোন নম্বরটি ইতিমধ্যে ব্যবহার করা হয়েছে! একই নম্বর দিয়ে দ্বিতীয়বার এন্ট্রি দেওয়া যাবে না।'
        },
        WARNING: {
            OFFLINE: 'অফলাইন মোডে কাজ করছে',
            PARTIAL_SYNC: 'আংশিক সিংক সম্পন্ন হয়েছে'
        }
    },
    
    // ============================================
    // EXCEL CONFIGURATION
    // ============================================
    
    /**
     * Excel export settings
     */
    EXCEL: {
        FILENAME_PREFIX: 'MyGP_Survey',
        SHEET_NAMES: {
            SUMMARY: 'সামগ্রিক রিপোর্ট',
            ALL_DATA: 'সকল ডেটা',
            ALL_ENTRIES: 'সকল এন্ট্রি'
        },
        COLUMN_WIDTHS: {
            SERIAL: 10,
            NAME: 20,
            PHONE: 15,
            PROFESSION: 15,
            USAGE: 15,
            REASON: 35,
            DATE: 15
        }
    },
    
    // ============================================
    // DEVELOPMENT SETTINGS
    // ============================================
    
    /**
     * Development mode settings
     */
    DEV: {
        CONSOLE_LOG: true,
        SHOW_ERRORS: true,
        MOCK_DATA: false
    }
};

// Make config read-only (prevent accidental modifications)
Object.freeze(CONFIG);
Object.freeze(CONFIG.ANIMATION);
Object.freeze(CONFIG.PROFESSION_ICONS);
Object.freeze(CONFIG.REASONS);
Object.freeze(CONFIG.CHART_COLORS);
Object.freeze(CONFIG.CHART_OPTIONS);
Object.freeze(CONFIG.TABLE);
Object.freeze(CONFIG.FEATURES);
Object.freeze(CONFIG.MESSAGES);
Object.freeze(CONFIG.EXCEL);
Object.freeze(CONFIG.DEV);

