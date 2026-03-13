import { createAllergenCheckboxes } from '../components/AllergenCheckboxes';
import { testPush } from '../services/api';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestAndSubscribe,
  unsubscribe,
  isSubscribed,
  syncSubscriptionPreferences,
} from '../services/push';
import {
  getAllergens,
  setAllergens,
  clearSetup,
} from '../services/storage';

const FIXED_SCHOOL_NAME = '인천석암초등학교';

export function renderSettings(container: HTMLElement, onBack: () => void): void {
  let selectedAllergens: number[] = getAllergens();

  container.innerHTML = `
    <div class="page">
      <div class="header">
        <button class="header-btn" id="back-btn">←</button>
        <h1>설정</h1>
        <button class="btn btn-primary" id="save-btn" style="width:auto;padding:0.5rem 1.25rem;font-size:0.9375rem">저장</button>
      </div>
      <div class="content">
        <div class="settings-section">
          <div class="settings-section-title">학교</div>
          <div class="card" style="padding:0.875rem 1rem;display:flex;align-items:center;gap:0.5rem">
            <span style="font-size:1.25rem">🏫</span>
            <span style="font-weight:600;color:#1d4ed8">${FIXED_SCHOOL_NAME}</span>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">내 알레르기</div>
          <div class="card" style="padding:1rem">
            <div id="allergen-mount"></div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">푸시 알림</div>
          <div class="card" id="notification-card">
            <div id="notification-status">불러오는 중...</div>
          </div>
        </div>

        <div class="settings-section">
          <button class="btn btn-ghost" id="reset-btn" style="color:#dc2626">
            초기화
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#back-btn')?.addEventListener('click', onBack);

  const allergenMount = container.querySelector('#allergen-mount')!;
  allergenMount.appendChild(createAllergenCheckboxes(selectedAllergens, allergens => {
    selectedAllergens = allergens;
  }));

  container.querySelector('#save-btn')?.addEventListener('click', async () => {
    setAllergens(selectedAllergens);

    if (await isSubscribed()) {
      try {
        await syncSubscriptionPreferences();
      } catch {
        alert('알레르기 설정은 저장되었지만 서버 동기화에 실패했습니다.');
        return;
      }
    }

    alert('설정이 저장되었습니다.');
    onBack();
  });

  container.querySelector('#reset-btn')?.addEventListener('click', () => {
    if (confirm('저장된 설정을 초기화할까요?')) {
      clearSetup();
      location.hash = '/setup';
    }
  });

  void renderNotificationUI();

  async function renderNotificationUI() {
    const notifCard = container.querySelector('#notification-card')!;

    if (!isNotificationSupported()) {
      notifCard.innerHTML = `
        <div style="color:#64748b;font-size:0.9375rem">
          이 브라우저는 푸시 알림을 지원하지 않습니다.
        </div>
      `;
      return;
    }

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    if (isIOS && !standalone) {
      notifCard.innerHTML = `
        <div style="font-size:0.9375rem;color:#64748b;line-height:1.6">
          iOS에서는 Safari에서 홈 화면에 추가한 뒤 알림을 켜야 합니다.<br>
          1. Safari 공유 버튼 탭<br>
          2. 홈 화면에 추가 선택<br>
          3. 홈 화면 아이콘으로 앱 실행<br>
          4. 설정에서 알림 허용
        </div>
      `;
      return;
    }

    const permission = getNotificationPermission();
    const subscribed = await isSubscribed();

    notifCard.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'settings-item';
    row.style.cssText = 'padding:0;box-shadow:none;margin:0';

    const label = document.createElement('div');
    label.innerHTML = `
      <div style="font-weight:600">오전 7시 급식 알림</div>
      <div style="font-size:0.875rem;color:#64748b;margin-top:0.125rem">
        ${permission === 'denied'
          ? '브라우저 알림 권한이 차단되어 있습니다. 브라우저 설정에서 허용해 주세요.'
          : '당일 급식 메뉴와 내 알레르기 주의 정보를 함께 보내드립니다.'}
      </div>
    `;

    const toggleWrap = document.createElement('label');
    toggleWrap.className = 'toggle';
    toggleWrap.style.flexShrink = '0';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = subscribed;
    toggleInput.disabled = permission === 'denied';

    const slider = document.createElement('span');
    slider.className = 'toggle-slider';

    toggleWrap.appendChild(toggleInput);
    toggleWrap.appendChild(slider);
    row.appendChild(label);
    row.appendChild(toggleWrap);
    notifCard.appendChild(row);

    if (subscribed) {
      const testBtn = document.createElement('button');
      testBtn.className = 'btn btn-ghost';
      testBtn.style.cssText = 'margin-top:0.75rem;font-size:0.875rem';
      testBtn.textContent = '테스트 알림 보내기';
      testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.textContent = '전송 중...';
        try {
          await testPush();
          testBtn.textContent = '전송 완료';
        } catch {
          testBtn.textContent = '전송 실패';
        }
        setTimeout(() => {
          testBtn.textContent = '테스트 알림 보내기';
          testBtn.disabled = false;
        }, 3000);
      });
      notifCard.appendChild(testBtn);
    }

    toggleInput.addEventListener('change', async () => {
      toggleInput.disabled = true;
      if (toggleInput.checked) {
        const result = await requestAndSubscribe();
        if (!result.success) {
          alert(result.message);
          toggleInput.checked = false;
        } else {
          alert(result.message);
          void renderNotificationUI();
        }
      } else {
        await unsubscribe();
        alert('알림이 해제되었습니다.');
        void renderNotificationUI();
      }
      toggleInput.disabled = false;
    });
  }
}
