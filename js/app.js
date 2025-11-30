/**
 * MyGP Survey Application - JavaScript
 * Author: Arman Azij
 * Description: Main application logic for MyGP survey system
 */

// ============================================
// CONFIGURATION (from config.js)
// ============================================
// CONFIG object is loaded from js/config.js
const GOOGLE_SCRIPT_URL = CONFIG.GOOGLE_SCRIPT_URL;

// ============================================
// STATE MANAGEMENT
// ============================================
let surveyData = [];
let autoRefreshInterval = null;
let professionChart, usageChart;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing app...');
    
    // Load data from localStorage (if internet is not available)
    surveyData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || [];
    
    // Update UI
    updateDashboard();
    generateProfessionReports();
    initializeCharts();
    updateSurveyFormTable();
    
    // Try to load data from Google Sheets (silent mode - no notification)
    loadFromGoogleSheets(false);
    
    // Start auto-refresh: load data every 30 seconds
    startAutoRefresh();
    
    // Add phone prefix to phone number input on focus
    const phoneInput = document.getElementById('phoneNumber');
    if (phoneInput) {
        phoneInput.addEventListener('focus', function() {
            if (this.value === '') {
                this.value = CONFIG.PHONE_PREFIX;
            }
        });
    } else {
        console.error('Phone input not found!');
    }
    
    // Initialize form handlers
    console.log('Initializing form handlers...');
    initializeFormHandlers();
});

// ============================================
// AUTO-REFRESH FUNCTIONALITY
// ============================================
function startAutoRefresh() {
    // Clear previous interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Auto-refresh based on CONFIG
    autoRefreshInterval = setInterval(function() {
        loadFromGoogleSheets(false); // silent mode
    }, CONFIG.AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// ============================================
// DATA LOADING FROM GOOGLE SHEETS
// ============================================
/**
 * Refresh data with loader (called from refresh buttons)
 */
async function refreshDataWithLoader() {
    try {
        showLoader('ডাটা লোড হচ্ছে...', 'অনুগ্রহ করে অপেক্ষা করুন');
        await loadFromGoogleSheets(true, false); // Don't show loader again, already shown
        // Loader will be hidden in loadFromGoogleSheets() before showing toast
    } catch (error) {
        console.error('Error refreshing data:', error);
        // Hide loader on unexpected error
        const loaderOverlay = document.getElementById('loaderOverlay');
        if (loaderOverlay && loaderOverlay.classList.contains('show')) {
            hideLoader();
        }
    }
}

async function loadFromGoogleSheets(showNotification = true, showLoaderOverlay = false) {
    // Show loader if requested (usually for manual refresh)
    if (showLoaderOverlay) {
        showLoader();
    }
    
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getData&t=${Date.now()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const textResponse = await response.text();
            
            try {
                const data = JSON.parse(textResponse);
                
                if (data.status === "success" && data.data && Array.isArray(data.data)) {
                    // Compare with previous data
                    const oldLength = surveyData.length;
                    surveyData = data.data;
                    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(surveyData));
                    
                    // Update UI
                    updateDashboard();
                    generateProfessionReports();
                    updateCharts();
                    updateSurveyFormTable();
                    
                    // Hide loader BEFORE showing toast notification
                    // Check if loader was shown (either by showLoaderOverlay or by refreshDataWithLoader)
                    const loaderOverlay = document.getElementById('loaderOverlay');
                    if (loaderOverlay && loaderOverlay.classList.contains('show')) {
                        hideLoader();
                    }
                    
                    // Show toast notification after loader is hidden
                    if (showNotification) {
                        if (surveyData.length > oldLength) {
                            showToast(`✓ ${surveyData.length} টি এন্ট্রি লোড হয়েছে (${surveyData.length - oldLength} টি নতুন)`, 'success');
                        } else {
                            showToast(`✓ ${surveyData.length} টি এন্ট্রি লোড হয়েছে`, 'success');
                        }
                    }
                } else if (data.status === "error") {
                    // Hide loader BEFORE showing toast
                    const loaderOverlay = document.getElementById('loaderOverlay');
                    if (loaderOverlay && loaderOverlay.classList.contains('show')) {
                        hideLoader();
                    }
                    if (showNotification) {
                        showToast('সার্ভার এরর: ' + data.message, 'error');
                    }
                } else {
                    // Hide loader BEFORE showing toast
                    const loaderOverlay = document.getElementById('loaderOverlay');
                    if (loaderOverlay && loaderOverlay.classList.contains('show')) {
                        hideLoader();
                    }
                    if (showNotification) {
                        showToast('ডেটা ফরম্যাট সঠিক নয়', 'warning');
                    }
                }
            } catch (parseError) {
                // Hide loader BEFORE showing toast
                const loaderOverlay = document.getElementById('loaderOverlay');
                if (loaderOverlay && loaderOverlay.classList.contains('show')) {
                    hideLoader();
                }
                if (showNotification) {
                    showToast('সার্ভার থেকে সঠিক JSON ডেটা আসেনি', 'error');
                }
            }
        } else {
            // Hide loader BEFORE showing toast
            const loaderOverlay = document.getElementById('loaderOverlay');
            if (loaderOverlay && loaderOverlay.classList.contains('show')) {
                hideLoader();
            }
            if (showNotification) {
                showToast(`সার্ভার এরর (${response.status})`, 'error');
            }
        }
    } catch (error) {
        // Hide loader BEFORE showing toast
        const loaderOverlay = document.getElementById('loaderOverlay');
        if (loaderOverlay && loaderOverlay.classList.contains('show')) {
            hideLoader();
        }
        
        // Only show error on manual refresh
        if (showNotification) {
            showToast('ইন্টারনেট সংযোগ বা সার্ভার সমস্যা আছে', 'warning');
        }
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
/**
 * Normalize phone number for comparison
 * Removes spaces, dashes, plus signs, country codes, and leading zeros
 * @param {string} phone - Phone number to normalize
 * @returns {string} - Normalized phone number
 */
function normalizePhoneNumber(phone) {
    if (!phone) return '';
    // Convert to string if not already
    const phoneStr = String(phone);
    return phoneStr
        .replace(/[-\s+]/g, '')   // Remove dashes, spaces, plus signs
        .replace(/^880/, '')     // Remove country code 880
        .replace(/^88/, '')       // Remove 88 prefix if exists
        .replace(/^0/, '');       // Remove leading 0
}

/**
 * Check if phone number already exists in survey data
 * @param {string} phoneNumber - Phone number to check
 * @returns {boolean} - True if duplicate exists
 */
function isDuplicatePhoneNumber(phoneNumber) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    return surveyData.some(entry => {
        if (!entry.phoneNumber) return false;
        const existingPhone = normalizePhoneNumber(entry.phoneNumber);
        return existingPhone === normalizedPhone;
    });
}

// ============================================
// FORM HANDLERS
// ============================================
function initializeFormHandlers() {
    console.log('Setting up form handlers...');
    
    const surveyForm = document.getElementById('surveyForm');
    if (!surveyForm) {
        console.error('Survey form not found!');
        return;
    }
    
    console.log('Survey form found:', surveyForm);
    
    // Enable/Disable Reason Field - Setup BEFORE form submission
    document.querySelectorAll('input[name="useMyGP"]').forEach(radio => {
        radio.addEventListener('change', function() {
            console.log('Radio changed:', this.value);
            const reasonField = document.getElementById('reason');
            if (this.value === 'yes') {
                reasonField.disabled = false;
                reasonField.required = true;
            } else {
                reasonField.disabled = true;
                reasonField.required = false;
                reasonField.value = '';
            }
        });
    });
    
    // Form submission
    surveyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted!');
        
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const useMyGP = document.querySelector('input[name="useMyGP"]:checked');
        const reasonField = document.getElementById('reason');
        
        console.log('Form data:', {
            phoneNumber,
            useMyGP: useMyGP ? useMyGP.value : 'not selected',
            reason: reasonField.value
        });
        
        // Validate MyGP selection
        if (!useMyGP) {
            showToast('অনুগ্রহ করে MyGP ব্যবহার সম্পর্কে উত্তর দিন', 'warning');
            return;
        }
        
        // Validate reason field if MyGP is "yes"
        if (useMyGP.value === 'yes' && !reasonField.value) {
            showToast('অনুগ্রহ করে MyGP ব্যবহারের কারণ নির্বাচন করুন', 'warning');
            reasonField.focus();
            return;
        }
        
        // Check for duplicate phone number
        if (isDuplicatePhoneNumber(phoneNumber)) {
            showToast(CONFIG.MESSAGES.ERROR.DUPLICATE_PHONE, 'error');
            // Highlight the phone input field
            const phoneInput = document.getElementById('phoneNumber');
            phoneInput.focus();
            phoneInput.style.borderColor = '#dc3545';
            setTimeout(() => {
                phoneInput.style.borderColor = '';
            }, 3000);
            return; // Stop form submission
        }
        
        console.log('All validations passed. Showing loader...');
        
        // Show loader
        showLoader();
        
        const formData = {
            id: Date.now(),
            name: document.getElementById('name').value,
            phoneNumber: phoneNumber,
            profession: document.getElementById('profession').value,
            useMyGP: document.querySelector('input[name="useMyGP"]:checked').value,
            reason: document.getElementById('reason').value,
            timestamp: new Date().toISOString()
        };

        // Save to localStorage first
        surveyData.push(formData);
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(surveyData));
        
        // Try to send data to Google Sheets
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(formData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.status === "success") {
                    hideLoader();
                    showToast('সার্ভে সফলভাবে জমা হয়েছে এবং Google Sheets এ সংরক্ষিত হয়েছে!', 'success');
                } else {
                    hideLoader();
                    showToast('সার্ভে জমা হয়েছে, কিন্তু Google Sheets এ সংরক্ষণ করতে সমস্যা হয়েছে: ' + result.message, 'warning');
                }
            } else {
                hideLoader();
                showToast('সার্ভে জমা হয়েছে, কিন্তু Google Sheets এ সংরক্ষণ করতে সমস্যা হয়েছে', 'warning');
            }
        } catch (error) {
            console.error("Google Sheets এ ডেটা পাঠাতে সমস্যা:", error);
            hideLoader();
            showToast('সার্ভে জমা হয়েছে, কিন্তু ইন্টারনেট সংযোগ সমস্যার কারণে Google Sheets এ সংরক্ষণ করা যায়নি', 'warning');
        }
        
        this.reset();
        document.getElementById('reason').disabled = true;
        
        updateDashboard();
        generateProfessionReports();
        updateCharts();
        updateSurveyFormTable();
        
        console.log('Form submission complete!');
    });
    
    console.log('Form handlers initialized successfully!');
}

// ============================================
// LOADER FUNCTIONS
// ============================================
function showLoader(message = 'সাবমিট হচ্ছে...', subtext = 'অনুগ্রহ করে অপেক্ষা করুন') {
    const loaderOverlay = document.getElementById('loaderOverlay');
    const loaderText = loaderOverlay.querySelector('.loader-text');
    const loaderSubtext = loaderOverlay.querySelector('.loader-subtext');
    
    if (loaderText) loaderText.textContent = message;
    if (loaderSubtext) loaderSubtext.textContent = subtext;
    
    loaderOverlay.classList.add('show');
}

function hideLoader() {
    document.getElementById('loaderOverlay').classList.remove('show');
}

// ============================================
// DASHBOARD UPDATE
// ============================================
function updateDashboard() {
    const totalSurveyed = surveyData.length;
    const myGPUsers = surveyData.filter(d => d.useMyGP === 'yes').length;
    
    // Count by reason (includes check - "উভয়" will be counted in both)
    const adViewers = surveyData.filter(d => d.reason && d.reason.includes('এড')).length;
    const mbCheckers = surveyData.filter(d => d.reason && (d.reason.includes('মিনিট') || d.reason.includes('ডাটা'))).length;
    
    // Calculate percentage
    const adViewersPercent = myGPUsers > 0 ? Math.round((adViewers/myGPUsers)*100) : 0;
    const mbCheckersPercent = myGPUsers > 0 ? Math.round((mbCheckers/myGPUsers)*100) : 0;

    animateNumber('totalSurveyed', totalSurveyed);
    animateNumber('myGPUsers', myGPUsers);
    animateNumber('adViewers', adViewers);
    animateNumber('mbCheckers', mbCheckers);
    
    // Update percentages
    const adPercentEl = document.getElementById('adViewersPercentDash');
    if (adPercentEl) adPercentEl.textContent = adViewersPercent + '%';
    
    const mbPercentEl = document.getElementById('mbCheckersPercentDash');
    if (mbPercentEl) mbPercentEl.textContent = mbCheckersPercent + '%';
}

// ============================================
// NUMBER ANIMATION
// ============================================
function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) {
        return;
    }
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / CONFIG.ANIMATION.STEPS;
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, CONFIG.ANIMATION.DURATION);
}

// ============================================
// SURVEY FORM TAB TABLE UPDATE
// ============================================
function updateSurveyFormTable() {
    const totalEntries = surveyData.length;
    const myGPUsers = surveyData.filter(d => d.useMyGP === 'yes').length;
    
    // Count by reason (includes check - "উভয়" will be counted in both)
    const mbCheckers = surveyData.filter(d => d.reason && (d.reason.includes('মিনিট') || d.reason.includes('ডাটা'))).length;
    const adViewers = surveyData.filter(d => d.reason && d.reason.includes('এড')).length;
    const bothReasons = surveyData.filter(d => d.reason === 'উভয়').length;
    
    // Calculate percentage
    const mbCheckersPercent = myGPUsers > 0 ? Math.round((mbCheckers/myGPUsers)*100) : 0;
    const adViewersPercent = myGPUsers > 0 ? Math.round((adViewers/myGPUsers)*100) : 0;
    const bothReasonsPercent = myGPUsers > 0 ? Math.round((bothReasons/myGPUsers)*100) : 0;

    // Update summary cards in survey form tab
    animateNumber('surveyTotalEntries', totalEntries);
    animateNumber('surveyMyGPUsers', myGPUsers);
    
    animateNumber('surveyMbCheckers', mbCheckers);
    const mbPercentEl = document.getElementById('surveyMbCheckersPercent');
    if (mbPercentEl) mbPercentEl.textContent = mbCheckersPercent + '%';
    
    animateNumber('surveyAdViewers', adViewers);
    const adPercentEl = document.getElementById('surveyAdViewersPercent');
    if (adPercentEl) adPercentEl.textContent = adViewersPercent + '%';
    
    animateNumber('surveyBothReasons', bothReasons);
    const bothPercentEl = document.getElementById('surveyBothReasonsPercent');
    if (bothPercentEl) bothPercentEl.textContent = bothReasonsPercent + '%';

    // Update table
    const tbody = document.getElementById('surveyEntriesTableBody');
    
    if (surveyData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-5">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    কোন ডেটা নেই
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    // Show latest entries first (reversed order)
    [...surveyData].reverse().forEach((d, index) => {
        const row = `
            <tr>
                <td>${surveyData.length - index}</td>
                <td>${d.name || '-'}</td>
                <td>${d.phoneNumber}</td>
                <td>${d.profession}</td>
                <td>${d.useMyGP === 'yes' ? '<span class="badge bg-success">হ্যাঁ</span>' : '<span class="badge bg-danger">না</span>'}</td>
                <td>${d.reason || '-'}</td>
                <td>${new Date(d.timestamp).toLocaleDateString('bn-BD')}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ============================================
// EXCEL DOWNLOAD FUNCTIONS
// ============================================
function downloadAllEntriesExcel() {
    if (surveyData.length === 0) {
        showToast('কোন ডেটা নেই। প্রথমে ডেটা লোড করুন।', 'warning');
        return;
    }

    try {
        // Create workbook
        const wb = XLSX.utils.book_new();

        // All Data Sheet
        const allDataRows = [
            ['ক্রমিক', 'নাম', 'ফোন নম্বর', 'পেশা', 'MyGP ব্যবহার', 'কারণ', 'তারিখ']
        ];

        surveyData.forEach((d, index) => {
            allDataRows.push([
                index + 1,
                d.name || '-',
                d.phoneNumber || '-',
                d.profession || '-',
                d.useMyGP === 'yes' ? 'হ্যাঁ' : 'না',
                d.reason || '-',
                d.timestamp ? new Date(d.timestamp).toLocaleDateString('bn-BD') : '-'
            ]);
        });

        const allDataSheet = XLSX.utils.aoa_to_sheet(allDataRows);
        allDataSheet['!cols'] = [
            { wch: 10 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 35 },
            { wch: 15 }
        ];

        // Add sheet to workbook
        XLSX.utils.book_append_sheet(wb, allDataSheet, 'সকল এন্ট্রি');

        // Download
        const filename = `All_Entries_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        showToast(`${surveyData.length} টি এন্ট্রি সহ এক্সেল ডাউনলোড হয়েছে!`, 'success');
    } catch (error) {
        showToast('এক্সেল ডাউনলোড করতে সমস্যা হয়েছে: ' + error.message, 'error');
    }
}

// ============================================
// PROFESSION REPORTS
// ============================================
function generateProfessionReports() {
    const professions = CONFIG.PROFESSIONS;
    const icons = CONFIG.PROFESSION_ICONS;

    const reportsContainer = document.getElementById('professionReports');
    reportsContainer.innerHTML = '';

    professions.forEach(profession => {
        const professionData = surveyData.filter(d => d.profession === profession);
        const total = professionData.length;
        const myGPUsers = professionData.filter(d => d.useMyGP === 'yes').length;
        const adViewers = professionData.filter(d => d.reason && d.reason.includes('এড')).length;
        const mbCheckers = professionData.filter(d => d.reason && (d.reason.includes('মিনিট') || d.reason.includes('ডাটা'))).length;

        const card = `
            <div class="profession-card" onclick="showProfessionDetail('${profession}')">
                <div class="profession-header">
                    <h4><i class="bi ${icons[profession]}"></i> ${profession}</h4>
                    <i class="bi bi-file-earmark-text view-report-icon" title="রিপোর্ট দেখুন"></i>
                </div>
                <div class="row">
                    <div class="col-md-3">
                        <div class="text-center">
                            <div class="percentage-circle">
                                <span class="percentage-text">${total}</span>
                            </div>
                            <p class="mb-0"><strong>মোট সার্ভে</strong></p>
                        </div>
                    </div>
                    <div class="col-md-9">
                        <div class="mb-3">
                            <small class="text-muted">MyGP ব্যবহারকারী</small>
                            <div class="progress">
                                <div class="progress-bar" style="width: ${total > 0 ? (myGPUsers/total)*100 : 0}%">
                                    ${total > 0 ? Math.round((myGPUsers/total)*100) : 0}%
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted">এড দেখেন</small>
                            <div class="progress">
                                <div class="progress-bar bg-info" style="width: ${total > 0 ? (adViewers/total)*100 : 0}%">
                                    ${total > 0 ? Math.round((adViewers/total)*100) : 0}%
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted">এমবি চেক করেন</small>
                            <div class="progress">
                                <div class="progress-bar bg-warning" style="width: ${total > 0 ? (mbCheckers/total)*100 : 0}%">
                                    ${total > 0 ? Math.round((mbCheckers/total)*100) : 0}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        reportsContainer.innerHTML += card;
    });
}

function showProfessionDetail(profession) {
    const professionData = surveyData.filter(d => d.profession === profession);
    const modal = `
        <div class="modal fade" id="professionModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, #00b0f0 0%, #0088cc 100%); color: white;">
                        <h5 class="modal-title"><i class="bi bi-file-earmark-bar-graph"></i> ${profession} - বিস্তারিত রিপোর্ট</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover" id="professionTable">
                                <thead style="background: #f8f9fa;">
                                    <tr>
                                        <th>ক্রমিক</th>
                                        <th>নাম</th>
                                        <th>ফোন নম্বর</th>
                                        <th>MyGP ব্যবহার</th>
                                        <th>কারণ</th>
                                        <th>তারিখ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${professionData.map((d, index) => `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td>${d.name || '-'}</td>
                                            <td>${d.phoneNumber}</td>
                                            <td>${d.useMyGP === 'yes' ? '<span class="badge bg-success">হ্যাঁ</span>' : '<span class="badge bg-danger">না</span>'}</td>
                                            <td>${d.reason || '-'}</td>
                                            <td>${new Date(d.timestamp).toLocaleDateString('bn-BD')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> বন্ধ করুন
                        </button>
                        <button type="button" class="btn btn-success" onclick="downloadProfessionReport('${profession}')">
                            <i class="bi bi-file-earmark-excel"></i> এক্সেল ডাউনলোড
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    const modalElement = new bootstrap.Modal(document.getElementById('professionModal'));
    modalElement.show();
    
    document.getElementById('professionModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function downloadProfessionReport(profession) {
    const professionData = surveyData.filter(d => d.profession === profession);
    
    if (professionData.length === 0) {
        showToast('এই পেশার জন্য কোন ডেটা নেই', 'warning');
        return;
    }

    try {
        // Create workbook
        const wb = XLSX.utils.book_new();

        // Data Sheet
        const dataRows = [
            ['ক্রমিক', 'নাম', 'ফোন নম্বর', 'MyGP ব্যবহার', 'কারণ', 'তারিখ']
        ];

        professionData.forEach((d, index) => {
            dataRows.push([
                index + 1,
                d.name || '-',
                d.phoneNumber || '-',
                d.useMyGP === 'yes' ? 'হ্যাঁ' : 'না',
                d.reason || '-',
                d.timestamp ? new Date(d.timestamp).toLocaleDateString('bn-BD') : '-'
            ]);
        });

        const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);
        dataSheet['!cols'] = [
            { wch: 10 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 35 },
            { wch: 15 }
        ];

        // Add sheet to workbook
        XLSX.utils.book_append_sheet(wb, dataSheet, profession);

        // Generate filename
        const filename = `${profession}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);
        
        showToast(`${profession} - ${professionData.length} টি এন্ট্রি সহ রিপোর্ট ডাউনলোড হয়েছে!`, 'success');
    } catch (error) {
        showToast('রিপোর্ট ডাউনলোড করতে সমস্যা হয়েছে: ' + error.message, 'error');
    }
}

// ============================================
// CHARTS
// ============================================
function initializeCharts() {
    // Profession Distribution Chart
    const ctx1 = document.getElementById('professionChart').getContext('2d');
    professionChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: CONFIG.PROFESSIONS,
            datasets: [{
                data: getProfessionData(),
                backgroundColor: CONFIG.CHART_COLORS.professions
            }]
        },
        options: {
            responsive: CONFIG.CHART_OPTIONS.responsive,
            maintainAspectRatio: CONFIG.CHART_OPTIONS.maintainAspectRatio,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'পেশাভিত্তিক বিতরণ'
                }
            }
        }
    });

    // Usage Reason Chart
    const ctx2 = document.getElementById('usageChart').getContext('2d');
    usageChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['মিনিট/এমবি চেক', 'এড দেখা', 'উভয়'],
            datasets: [{
                label: 'ব্যবহারকারী',
                data: getUsageData(),
                backgroundColor: CONFIG.CHART_COLORS.usage
            }]
        },
        options: {
            responsive: CONFIG.CHART_OPTIONS.responsive,
            maintainAspectRatio: CONFIG.CHART_OPTIONS.maintainAspectRatio,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'MyGP ব্যবহারের কারণ'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function getProfessionData() {
    return CONFIG.PROFESSIONS.map(p => surveyData.filter(d => d.profession === p).length);
}

function getUsageData() {
    // Count only specific categories (not including "উভয়")
    const mbCheckersOnly = surveyData.filter(d => d.reason === 'মিনিট/ডাটা দেখা বা ক্রয় করার জন্য').length;
    const adViewersOnly = surveyData.filter(d => d.reason === 'সোশ্যাল এড দেখার জন্য').length;
    const both = surveyData.filter(d => d.reason === 'উভয়').length;
    return [mbCheckersOnly, adViewersOnly, both];
}

function updateCharts() {
    if (professionChart) {
        professionChart.data.datasets[0].data = getProfessionData();
        professionChart.update();
    }
    if (usageChart) {
        usageChart.data.datasets[0].data = getUsageData();
        usageChart.update();
    }
}

// ============================================
// EXPORT OVERALL REPORT
// ============================================
async function exportData() {
    if (surveyData.length === 0) {
        showToast('কোন ডেটা নেই', 'warning');
        return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary Statistics Sheet
    const professions = CONFIG.PROFESSIONS;
    
    const summaryData = [
        ['MyGP সার্ভে সামগ্রিক রিপোর্ট', '', '', '', '', ''],
        ['রিপোর্ট তারিখ:', new Date().toLocaleDateString('bn-BD'), '', '', '', ''],
        ['মোট সার্ভে:', surveyData.length, '', '', '', ''],
        ['', '', '', '', '', ''],
        ['পেশা', 'মোট সার্ভে', 'MyGP ব্যবহারকারী', 'এড দেখেন', 'এমবি চেক করেন', 'ব্যবহারের হার']
    ];

    professions.forEach(profession => {
        const profData = surveyData.filter(d => d.profession === profession);
        const total = profData.length;
        const myGPUsers = profData.filter(d => d.useMyGP === 'yes').length;
        const adViewers = profData.filter(d => d.reason && d.reason.includes('এড')).length;
        const mbCheckers = profData.filter(d => d.reason && (d.reason.includes('মিনিট') || d.reason.includes('ডাটা'))).length;
        const percentage = total > 0 ? Math.round((myGPUsers/total)*100) : 0;

        summaryData.push([
            profession,
            total,
            myGPUsers,
            adViewers,
            mbCheckers,
            `${percentage}%`
        ]);
    });

    // Add overall statistics
    const totalSurveyed = surveyData.length;
    const myGPUsers = surveyData.filter(d => d.useMyGP === 'yes').length;
    const adViewers = surveyData.filter(d => d.reason && d.reason.includes('এড')).length;
    const mbCheckers = surveyData.filter(d => d.reason && (d.reason.includes('মিনিট') || d.reason.includes('ডাটা'))).length;

    summaryData.push(['', '', '', '', '', '']);
    summaryData.push(['সর্বমোট', totalSurveyed, myGPUsers, adViewers, mbCheckers, `${totalSurveyed > 0 ? Math.round((myGPUsers/totalSurveyed)*100) : 0}%`]);

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths
    summarySheet['!cols'] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 }
    ];

    // All Data Sheet
    const allDataHeaders = [['ক্রমিক', 'নাম', 'ফোন নম্বর', 'পেশা', 'MyGP ব্যবহার', 'কারণ', 'তারিখ']];
    
    const allData = surveyData.map((d, index) => [
        index + 1,
        d.name || '-',
        d.phoneNumber,
        d.profession,
        d.useMyGP === 'yes' ? 'হ্যাঁ' : 'না',
        d.reason || '-',
        new Date(d.timestamp).toLocaleDateString('bn-BD')
    ]);

    const allDataSheet = XLSX.utils.aoa_to_sheet([...allDataHeaders, ...allData]);

    // Set column widths for all data
    allDataSheet['!cols'] = [
        { wch: 8 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 30 },
        { wch: 15 }
    ];

    // Individual profession sheets
    professions.forEach(profession => {
        const profData = surveyData.filter(d => d.profession === profession);
        
        if (profData.length > 0) {
            const profHeaders = [['ক্রমিক', 'নাম', 'ফোন নম্বর', 'MyGP ব্যবহার', 'কারণ', 'তারিখ']];
            const profRows = profData.map((d, index) => [
                index + 1,
                d.name || '-',
                d.phoneNumber,
                d.useMyGP === 'yes' ? 'হ্যাঁ' : 'না',
                d.reason || '-',
                new Date(d.timestamp).toLocaleDateString('bn-BD')
            ]);

            const profSheet = XLSX.utils.aoa_to_sheet([...profHeaders, ...profRows]);
            profSheet['!cols'] = [
                { wch: 8 },
                { wch: 20 },
                { wch: 15 },
                { wch: 15 },
                { wch: 30 },
                { wch: 15 }
            ];

            XLSX.utils.book_append_sheet(wb, profSheet, profession);
        }
    });

    // Add summary and all data sheets
    XLSX.utils.book_append_sheet(wb, summarySheet, 'সামগ্রিক রিপোর্ট');
    XLSX.utils.book_append_sheet(wb, allDataSheet, 'সকল ডেটা');

    // Generate filename
    const filename = `MyGP_Survey_Overall_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
    
    showToast('সম্পূর্ণ রিপোর্ট সফলভাবে ডাউনলোড হয়েছে!', 'success');
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi ${type === 'success' ? 'bi-check-circle-fill text-success' : type === 'warning' ? 'bi-exclamation-triangle-fill text-warning' : type === 'error' ? 'bi-x-circle-fill text-danger' : 'bi-info-circle-fill text-info'} me-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, CONFIG.TOAST_DURATION);
}

// ============================================
// TAB CHANGE HANDLER
// ============================================
document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
    tab.addEventListener('shown.bs.tab', function() {
        if (this.id === 'dashboard-tab') {
            updateCharts();
        }
    });
});

