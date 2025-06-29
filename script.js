// --- Global Variables ---
// *** สำคัญ: เปลี่ยนเป็น Web App URL ที่ได้จากการ Deploy Apps Script ***
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwkebYkHKmOQ70-STvMfC6uuUy9MknB9NxrVeRWgQasUFuYP1CacRod_xjroh2-yLle-A/exec';
// *** สำคัญ: เปลี่ยนเป็น LIFF ID ที่ได้จาก LINE Developers Console ***
const LIFF_ID = 'YOUR_LIFF_ID';

let lineUserId = null; // เก็บ LINE User ID
let currentUserData = null; // เก็บข้อมูลผู้ใช้ที่ดึงจาก Sheet

// --- DOM Elements ---
const loadingMessage = document.getElementById('loadingMessage');
const inputSection = document.getElementById('inputSection');
const idCardInput = document.getElementById('idCardInput');
const checkIdCardBtn = document.getElementById('checkIdCardBtn');
const errorMessage = document.getElementById('errorMessage');

const pdpaSection = document.getElementById('pdpaSection');
const userTitle = document.getElementById('userTitle');
const userFirstName = document.getElementById('userFirstName');
const userLastName = document.getElementById('userLastName');
const pdpaContentDiv = document.getElementById('pdpaContent');
const consentCheckbox = document.getElementById('consentCheckbox');
const saveConsentBtn = document.getElementById('saveConsentBtn');
const successMessage = document.getElementById('successMessage');
const saveErrorMessage = document.getElementById('saveErrorMessage');

// --- Functions ---

/**
 * ฟังก์ชันสำหรับแสดงข้อความสถานะต่างๆ
 * @param {HTMLElement} element - element ที่จะแสดง/ซ่อน
 * @param {string} type - 'show', 'hide', 'error', 'success', 'loading'
 * @param {string} message - ข้อความที่จะแสดง (ถ้ามี)
 */
function displayMessage(element, type, message = '') {
    element.textContent = message;
    element.className = `message ${type === 'loading' ? 'loading' : type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
    element.style.display = type === 'hide' ? 'none' : 'block';
}

/**
 * ตรวจสอบความถูกต้องของเลขบัตรประชาชนเบื้องต้น (Client-side validation)
 * @param {string} idCard - เลขบัตรประชาชน
 * @returns {boolean} true ถ้าถูกต้อง, false ถ้าไม่ถูกต้อง
 */
function isValidIdCard(idCard) {
    if (!idCard || idCard.length !== 13 || !/^\d{13}$/.test(idCard)) {
        displayMessage(errorMessage, 'error', 'กรุณากรอกเลขบัตรประชาชน 13 หลัก');
        return false;
    }
    // เพิ่ม Algorithm ตรวจสอบเลข 13 หลักจริงจังได้ที่นี่ หากต้องการ
    // เช่น https://www.thaicreate.com/php/169.html (ปรับเป็น JS)
    displayMessage(errorMessage, 'hide');
    return true;
}

/**
 * Initialise LIFF app
 */
async function initializeLiff() {
    displayMessage(loadingMessage, 'show', 'กำลังเชื่อมต่อ LINE LIFF...');
    try {
        await liff.init({ liffId: LIFF_ID });
        displayMessage(loadingMessage, 'hide');

        if (!liff.isLoggedIn()) {
            // กรณีผู้ใช้ยังไม่ได้ Login LINE
            displayMessage(errorMessage, 'error', 'กรุณาเข้าสู่ระบบ LINE เพื่อใช้งานแอปพลิเคชัน');
            // สามารถสั่งให้ Login ได้ทันที
            // liff.login();
            return;
        }

        const profile = await liff.getProfile();
        lineUserId = profile.userId;
        console.log('LINE User ID:', lineUserId);
        
        inputSection.style.display = 'block'; // แสดงส่วนกรอกข้อมูล
    } catch (err) {
        console.error('LIFF initialization failed', err);
        displayMessage(loadingMessage, 'hide');
        displayMessage(errorMessage, 'error', 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่อีกครั้ง');
    }
}

/**
 * เรียก Google Apps Script เพื่อตรวจสอบเลขบัตรประชาชน
 */
async function checkIdCard() {
    const idCard = idCardInput.value.trim();
    if (!isValidIdCard(idCard)) {
        return;
    }

    displayMessage(errorMessage, 'hide');
    displayMessage(loadingMessage, 'show', 'กำลังตรวจสอบข้อมูล...');
    checkIdCardBtn.disabled = true; // ปิดปุ่มชั่วคราว

    try {
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'checkIdCard',
                idCard: idCard
            }).toString()
        });

        const data = await response.json();
        displayMessage(loadingMessage, 'hide');
        checkIdCardBtn.disabled = false; // เปิดปุ่ม

        if (data.status === 'success') {
            currentUserData = { idCard: idCard, ...data }; // เก็บข้อมูลผู้ใช้
            userTitle.textContent = data.title;
            userFirstName.textContent = data.firstName;
            userLastName.textContent = data.lastName;
            pdpaContentDiv.textContent = data.pdpaContent;
            
            inputSection.style.display = 'none';
            pdpaSection.style.display = 'block';
            consentCheckbox.checked = false; // รีเซ็ต checkbox ทุกครั้งที่โหลดใหม่
            displayMessage(successMessage, 'hide');
            displayMessage(saveErrorMessage, 'hide');

        } else if (data.status === 'notFound') {
            displayMessage(errorMessage, 'error', data.message || 'ไม่พบข้อมูลเลขบัตรประชาชนนี้');
            // หรืออาจจะแสดงฟอร์มให้กรอกข้อมูลใหม่
        } else {
            displayMessage(errorMessage, 'error', data.message || 'เกิดข้อผิดพลาดในการตรวจสอบ');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        displayMessage(loadingMessage, 'hide');
        checkIdCardBtn.disabled = false;
        displayMessage(errorMessage, 'error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
    }
}

/**
 * บันทึกสถานะการยินยอม PDPA
 */
async function saveConsent() {
    if (!lineUserId) {
        displayMessage(saveErrorMessage, 'error', 'ไม่สามารถระบุผู้ใช้งาน LINE ได้ กรุณาลองใหม่');
        return;
    }
    if (!currentUserData || !currentUserData.idCard) {
        displayMessage(saveErrorMessage, 'error', 'ไม่พบข้อมูลบัตรประชาชนที่ถูกตรวจสอบ');
        return;
    }

    const consentStatus = consentCheckbox.checked ? '1' : '0';

    displayMessage(saveErrorMessage, 'hide');
    displayMessage(successMessage, 'hide');
    displayMessage(loadingMessage, 'show', 'กำลังบันทึกข้อมูล...');
    saveConsentBtn.disabled = true; // ปิดปุ่มชั่วคราว

    try {
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'saveConsent',
                lineUserId: lineUserId,
                idCard: currentUserData.idCard,
                consentStatus: consentStatus
            }).toString()
        });

        const data = await response.json();
        displayMessage(loadingMessage, 'hide');
        saveConsentBtn.disabled = false; // เปิดปุ่ม

        if (data.status === 'success') {
            displayMessage(successMessage, 'success', 'บันทึกการยินยอมสำเร็จแล้ว!');
            // สามารถปิด LIFF หรือแจ้งผู้ใช้ว่าเสร็จสิ้นได้
            // setTimeout(() => { liff.closeWindow(); }, 2000); // ปิดหน้าต่างหลังจาก 2 วินาที
        } else {
            displayMessage(saveErrorMessage, 'error', data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        displayMessage(loadingMessage, 'hide');
        saveConsentBtn.disabled = false;
        displayMessage(saveErrorMessage, 'error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลได้');
    }
}

// --- Event Listeners ---
checkIdCardBtn.addEventListener('click', checkIdCard);
saveConsentBtn.addEventListener('click', saveConsent);

// ตรวจสอบการกรอกเฉพาะตัวเลข 13 หลัก
idCardInput.addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/[^0-9]/g, ''); // ลบอักขระที่ไม่ใช่ตัวเลข
    if (event.target.value.length === 13) {
        // สามารถเรียก checkIdCard() ทันที หรือรอผู้ใช้กดปุ่ม
    }
    displayMessage(errorMessage, 'hide'); // ซ่อน error เมื่อมีการแก้ไข
});


// --- Initialize LIFF when the page loads ---
window.onload = initializeLiff;
