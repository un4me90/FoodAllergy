import { createAllergenCheckboxes } from '../components/AllergenCheckboxes';
import { FIXED_SCHOOL } from '../config/school';
import { testPush } from '../services/api';
import {
  getNotificationPermission,
  hasStoredSubscription,
  isNotificationSupported,
  isPushSubscriptionSupported,
  isSubscribed,
  requestAndSubscribe,
  syncSubscriptionPreferences,
  unsubscribe,
} from '../services/push';
import {
  ChildProfile,
  clearSetup,
  createEmptyChildProfile,
  getChildren,
  getPushEnabledPreference,
  getPushSubscription,
  setPushEnabledPreference,
  setChildren,
} from '../services/storage';

function getDefaultChildName(index: number): string {
  const labels = ['첫째', '둘째', '셋째', '넷째', '다섯째'];
  return labels[index] || `자녀 ${index + 1}`;
}

function cloneChild(child: ChildProfile): ChildProfile {
  return {
    ...child,
    allergens: [...child.allergens],
  };
}

function resizeChildren(children: ChildProfile[], nextCount: number): ChildProfile[] {
  const safeCount = Math.min(5, Math.max(1, nextCount));
  const nextChildren = children.slice(0, safeCount).map(cloneChild);

  while (nextChildren.length < safeCount) {
    nextChildren.push({
      ...createEmptyChildProfile(),
      name: getDefaultChildName(nextChildren.length),
    });
  }

  return nextChildren;
}

export function renderSettings(container: HTMLElement, onBack: () => void): void {
  let children: ChildProfile[] = getChildren();
  let activeChildIndex = 0;

  if (children.length === 0) {
    children = [{
      ...createEmptyChildProfile(),
      name: '첫째',
    }];
  } else {
    children = children.map(cloneChild);
  }

  container.innerHTML = `
    <div class="page">
      <div class="header">
        <button class="header-btn" id="back-btn" aria-label="뒤로">←</button>
        <h1>설정</h1>
        <button class="btn btn-primary" id="save-btn" style="width:auto;padding:0.5rem 1.25rem;font-size:0.9375rem">저장</button>
      </div>
      <div class="content">
        <div class="settings-section">
          <div class="settings-section-title">학교</div>
          <div class="card" style="padding:0.875rem 1rem;display:flex;align-items:center;gap:0.5rem">
            <span style="font-size:1.25rem">🏫</span>
            <span style="font-weight:600;color:#1d4ed8">${FIXED_SCHOOL.name}</span>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">자녀별 알레르기</div>
          <div id="children-editor-slot"></div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">푸시 알림</div>
          <div class="card" id="notification-card">
            <div id="notification-status">불러오는 중...</div>
          </div>
        </div>

        <div class="settings-section">
          <button class="btn btn-ghost" id="reset-btn" style="color:#dc2626">
            전체 초기화
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#back-btn')?.addEventListener('click', onBack);

  renderChildrenEditor();

  container.querySelector('#save-btn')?.addEventListener('click', async () => {
    const validationError = validateChildren(children);
    if (validationError) {
      alert(validationError);
      return;
    }

    setChildren(children);

    if (await isSubscribed()) {
      try {
        await syncSubscriptionPreferences();
      } catch {
        alert('자녀 설정은 저장되었지만 서버 동기화에 실패했습니다.');
        return;
      }
    }

    alert('설정이 저장되었습니다.');
    onBack();
  });

  container.querySelector('#reset-btn')?.addEventListener('click', () => {
    void handleFullReset();
  });

  void renderNotificationUI();

  async function handleFullReset(): Promise<void> {
    if (!confirm('저장한 모든 정보를 초기화할까요?')) {
      return;
    }

    try {
      await unsubscribe();
    } catch {
      // Continue clearing local data even if remote unsubscribe fails.
    }

    clearSetup();
    location.hash = '/setup';
  }

  function renderChildrenEditor() {
    const editorSlot = container.querySelector('#children-editor-slot') as HTMLElement;
    const activeChild = children[Math.min(activeChildIndex, children.length - 1)];

    editorSlot.innerHTML = `
      <div class="child-profiles-editor">
        <div class="child-profiles-header">
          <div class="child-profiles-title">자녀별로 이름과 알레르기를 설정해 주세요.</div>
          <div class="child-profiles-subtitle">자녀 수를 고른 뒤 탭을 눌러 각 자녀의 이름과 알레르기를 입력할 수 있습니다.</div>
        </div>

        <div class="setup-child-count">
          <div class="setup-child-count-label">자녀 수</div>
          <select id="settings-child-count-select" class="form-input setup-child-count-select">
            ${[1, 2, 3, 4, 5].map(count => `
              <option value="${count}"${children.length === count ? ' selected' : ''}>${count}명</option>
            `).join('')}
          </select>
        </div>

        <div class="setup-child-tabs">
          ${children.map((child, index) => `
            <button
              type="button"
              class="setup-child-tab${index === activeChildIndex ? ' active' : ''}"
              data-settings-child-index="${index}"
            >
              ${escapeHtml(child.name.trim() || getDefaultChildName(index))}
            </button>
          `).join('')}
        </div>

        <div class="setup-child-editor-card">
          <div class="setup-child-editor-top">
            <div>
              <div class="setup-child-editor-title">자녀 ${activeChildIndex + 1}</div>
              <div class="setup-child-editor-hint">현재 선택한 자녀 정보만 수정합니다.</div>
            </div>
            <div class="setup-child-editor-badge">${escapeHtml(activeChild.name.trim() || getDefaultChildName(activeChildIndex))}</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="settings-child-name">이름 또는 구분</label>
            <input
              id="settings-child-name"
              class="form-input"
              type="text"
              placeholder="예: 첫째, 민서"
              value="${escapeHtml(activeChild.name)}"
            />
          </div>

          <div class="form-label">알레르기</div>
          <div id="settings-child-allergens"></div>
        </div>
      </div>
    `;

    const countSelect = editorSlot.querySelector('#settings-child-count-select') as HTMLSelectElement | null;
    const tabButtons = Array.from(editorSlot.querySelectorAll<HTMLButtonElement>('[data-settings-child-index]'));
    const nameInput = editorSlot.querySelector('#settings-child-name') as HTMLInputElement;
    const allergenMount = editorSlot.querySelector('#settings-child-allergens') as HTMLElement;

    countSelect?.addEventListener('change', () => {
      const count = Number(countSelect.value || '1');
      children = resizeChildren(children, count);
      activeChildIndex = Math.min(activeChildIndex, children.length - 1);
      renderChildrenEditor();
    });

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        activeChildIndex = Number(button.dataset.settingsChildIndex || '0');
        renderChildrenEditor();
      });
    });

    nameInput.addEventListener('input', () => {
      children[activeChildIndex].name = nameInput.value;
    });

    allergenMount.appendChild(createAllergenCheckboxes(activeChild.allergens, allergens => {
      children[activeChildIndex].allergens = allergens;
    }));
  }

  async function renderNotificationUI() {
    const notifCard = container.querySelector('#notification-card') as HTMLElement;

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone) {
      notifCard.innerHTML = `
        <div style="font-size:0.9375rem;color:#64748b;line-height:1.6">
          iPhone에서는 Safari에서 홈 화면에 추가한 다음에만 알림을 켤 수 있습니다.<br>
          1. Safari 공유 버튼 선택<br>
          2. 홈 화면에 추가 선택<br>
          3. 홈 화면 아이콘으로 다시 실행<br>
          4. 다시 설정 화면에서 알림 허용
        </div>
      `;
      return;
    }

    if (!isNotificationSupported()) {
      notifCard.innerHTML = `
        <div style="color:#64748b;font-size:0.9375rem">
          현재 브라우저는 알림 기능을 지원하지 않습니다.
        </div>
      `;
      return;
    }

    if (!isPushSubscriptionSupported()) {
      notifCard.innerHTML = `
        <div style="color:#64748b;font-size:0.9375rem;line-height:1.6">
          현재 브라우저 환경에서는 푸시 알림을 사용할 수 없습니다.<br>
          Android Chrome 또는 iPhone Safari 홈 화면 앱에서 다시 시도해 주세요.
        </div>
      `;
      return;
    }

    const permission = getNotificationPermission();
    const subscribed = await isSubscribed();
    const pushEnabledPreference = getPushEnabledPreference();
    const locallyStored = hasStoredSubscription();

    notifCard.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'settings-item';
    row.style.cssText = 'padding:0;box-shadow:none;margin:0';

    const label = document.createElement('div');
    label.innerHTML = `
      <div style="font-weight:600">매일 급식 알림</div>
      <div style="font-size:0.875rem;color:#64748b;margin-top:0.125rem">
        ${permission === 'denied'
          ? '브라우저 알림 권한이 차단되어 있습니다. 브라우저 설정에서 허용해 주세요.'
          : !subscribed && pushEnabledPreference
            ? '기본값은 켜짐입니다. 브라우저 권한을 허용하면 매일 급식 알림을 받을 수 있습니다.'
            : '매일 급식 메뉴와 자녀별 주의 알레르기 메뉴를 알림으로 안내합니다.'}
      </div>
      ${locallyStored ? '<div style="font-size:0.8rem;color:#16a34a;margin-top:0.35rem">이 기기에는 알림 설정 정보가 저장되어 있습니다.</div>' : ''}
    `;

    const toggleWrap = document.createElement('label');
    toggleWrap.className = 'toggle';
    toggleWrap.style.flexShrink = '0';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = subscribed || (permission !== 'denied' && pushEnabledPreference);
    toggleInput.disabled = permission === 'denied';

    const slider = document.createElement('span');
    slider.className = 'toggle-slider';

    toggleWrap.appendChild(toggleInput);
    toggleWrap.appendChild(slider);
    row.appendChild(label);
    row.appendChild(toggleWrap);
    notifCard.appendChild(row);

    const testBtn = document.createElement('button');
    testBtn.className = 'btn btn-ghost';
    testBtn.style.cssText = 'margin-top:0.75rem;font-size:0.875rem';
    testBtn.textContent = '테스트 알림 보내기';
    testBtn.disabled = !subscribed;

    if (!subscribed) {
      testBtn.style.opacity = '0.55';
      testBtn.title = '알림을 켜면 테스트할 수 있습니다.';
    }

    testBtn.addEventListener('click', async () => {
      if (!subscribed) {
        return;
      }

      testBtn.disabled = true;
      testBtn.textContent = '전송 중...';
      try {
        try {
          await syncSubscriptionPreferences();
        } catch {
          // Ignore sync errors before the direct test call.
        }

        let endpoint: string | undefined;
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          endpoint = sub?.endpoint;
        } catch {
          // Ignore and fall back to local storage below.
        }

        if (!endpoint) {
          endpoint = getPushSubscription()?.endpoint ?? undefined;
        }

        await testPush(endpoint);
        testBtn.textContent = '전송 완료';
      } catch (err: any) {
        testBtn.textContent = `전송 실패: ${err?.message || '알 수 없는 오류'}`;
      }

      setTimeout(() => {
        testBtn.textContent = '테스트 알림 보내기';
        testBtn.disabled = !subscribed;
      }, 4000);
    });
    notifCard.appendChild(testBtn);

    toggleInput.addEventListener('change', async () => {
      toggleInput.disabled = true;

      if (toggleInput.checked) {
        setPushEnabledPreference(true);
        try {
          const result = await requestAndSubscribe();
          if (!result.success) {
            alert(result.message);
            toggleInput.checked = false;
            setPushEnabledPreference(false);
          } else {
            alert(result.message);
            void renderNotificationUI();
          }
        } catch (err: any) {
          alert(`구독 실패: ${err?.message || '알 수 없는 오류'}`);
          toggleInput.checked = false;
          setPushEnabledPreference(false);
        }
      } else {
        setPushEnabledPreference(false);
        try {
          await unsubscribe();
          alert('알림이 해제되었습니다.');
        } catch (err: any) {
          alert(`해제 실패: ${err?.message || '알 수 없는 오류'}`);
        }
        void renderNotificationUI();
      }

      toggleInput.disabled = false;
    });
  }
}

function validateChildren(children: ChildProfile[]): string | null {
  if (children.length === 0) {
    return '자녀를 한 명 이상 등록해 주세요.';
  }

  if (children.some(child => child.name.trim().length === 0)) {
    return '각 자녀의 이름 또는 구분을 입력해 주세요.';
  }

  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
