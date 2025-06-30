// --- Global Variables ---
// *** สำคัญ: เปลี่ยนเป็น Web App URL ที่ได้จากการ Deploy Apps Script ***


const scriptURL = 'https://script.google.com/macros/s/AKfycbwkebYkHKmOQ70-STvMfC6uuUy9MknB9NxrVeRWgQasUFuYP1CacRod_xjroh2-yLle-A/exec';
let userProfile = {};

window.onload = async function () {
  try {
    await liff.init({ liffId: '2006679138-wW8N5Zol' });
    if (!liff.isLoggedIn()) liff.login();

    const profile = await liff.getProfile();
    userProfile = {
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl
    };

    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('inputSection').style.display = 'block';
  } catch (err) {
    document.getElementById('loadingMessage').innerText = 'โหลด LIFF ไม่สำเร็จ';
    console.error(err);
  }

  document.getElementById('checkIdCardBtn').addEventListener('click', checkIdCard);
  document.getElementById('saveConsentBtn').addEventListener('click', saveConsent);
};

function checkIdCard() {
  const idCard = document.getElementById('idCardInput').value.trim();
  if (!/^\\d{13}$/.test(idCard)) {
    showError('errorMessage', 'กรุณากรอกเลขบัตรให้ถูกต้อง');
    return;
  }

  fetch(`${scriptURL}?action=checkIdCard&idCard=${idCard}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        document.getElementById('userTitle').innerText = data.title;
        document.getElementById('userFirstName').innerText = data.firstName;
        document.getElementById('userLastName').innerText = data.lastName;
        document.getElementById('pdpaContent').innerText = data.pdpaContent;
        userProfile.idCard = idCard;
        userProfile.title = data.title;
        document.getElementById('pdpaSection').style.display = 'block';
      } else {
        showError('errorMessage', data.message);
      }
    }).catch(() => showError('errorMessage', 'เกิดข้อผิดพลาด'));
}

function saveConsent() {
  if (!document.getElementById('consentCheckbox').checked) {
    showError('saveErrorMessage', 'กรุณาติ๊กยอมรับก่อน');
    return;
  }

  const formData = new URLSearchParams();
  formData.append('action', 'saveConsent');
  formData.append('lineUserId', userProfile.lineUserId);
  formData.append('idCard', userProfile.idCard);
  formData.append('consentStatus', '1');
  formData.append('displayName', userProfile.displayName);
  formData.append('pictureUrl', userProfile.pictureUrl);
  formData.append('title', userProfile.title);

  fetch(scriptURL, { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        document.getElementById('successMessage').innerText = data.message;
      } else {
        showError('saveErrorMessage', data.message);
      }
    })
    .catch(() => showError('saveErrorMessage', 'ไม่สามารถบันทึกได้'));
}

function showError(id, message) {
  document.getElementById(id).innerText = message;
}
