import { createAllergenCheckboxes } from '../components/AllergenCheckboxes';
import { FIXED_SCHOOL } from '../config/school';
import { withAppBase } from '../config/base';
import { ChildProfile, createEmptyChildProfile, getChildren, setChildren, setSchool } from '../services/storage';

type DeviceType = 'iphone' | 'android';

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

export function renderSetup(container: HTMLElement, onComplete: () => void): void {
  let currentStep = 1;
  let selectedChildren: ChildProfile[] = getChildren();
  let selectedDevice: DeviceType | null = detectDevice();
  let activeChildIndex = 0;

  if (selectedChildren.length === 0) {
    selectedChildren = [{
      ...createEmptyChildProfile(),
      name: '첫째',
    }];
  } else {
    selectedChildren = selectedChildren.map(cloneChild);
  }

  setSchool(FIXED_SCHOOL);
  renderCurrentStep();

  function renderCurrentStep(): void {
    container.innerHTML = `
      <div class="page">
        <div class="setup-wizard">
          <div class="setup-progress">
            <div class="setup-progress-label">처음 설정</div>
            <div class="setup-progress-steps">
              ${[1, 2, 3, 4].map(step => `
                <span class="setup-progress-step${step === currentStep ? ' active' : ''}${step < currentStep ? ' done' : ''}">
                  ${step}
                </span>
              `).join('')}
            </div>
          </div>

          <div class="setup-stage-card">
            ${renderStepBody(currentStep, selectedDevice, selectedChildren, activeChildIndex)}
          </div>
        </div>
      </div>
    `;

    bindStepEvents();
  }

  function bindStepEvents(): void {
    const prevButton = container.querySelector('#setup-prev') as HTMLButtonElement | null;
    const nextButton = container.querySelector('#setup-next') as HTMLButtonElement | null;
    const finishButton = container.querySelector('#setup-finish') as HTMLButtonElement | null;
    const logoImage = container.querySelector('.setup-logo-image') as HTMLImageElement | null;

    logoImage?.addEventListener('error', () => {
      if (logoImage.dataset.fallbackApplied === 'true') {
        return;
      }

      logoImage.dataset.fallbackApplied = 'true';
      logoImage.src = '/seokam_logo_transparent_small.png';
    });

    prevButton?.addEventListener('click', () => {
      currentStep = Math.max(1, currentStep - 1);
      renderCurrentStep();
    });

    nextButton?.addEventListener('click', () => {
      if (currentStep === 3 && !validateChildren(selectedChildren)) {
        return;
      }

      currentStep = Math.min(4, currentStep + 1);
      renderCurrentStep();
    });

    if (currentStep === 3) {
      bindStepThreeEvents();
    }

    if (currentStep === 4) {
      const guide = container.querySelector('#device-guide') as HTMLElement;
      const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-device]'));

      buttons.forEach(button => {
        button.addEventListener('click', () => {
          selectedDevice = button.dataset.device === 'iphone' ? 'iphone' : 'android';
          buttons.forEach(item => item.classList.toggle('active', item === button));
          guide.innerHTML = renderDeviceGuide(selectedDevice);
          if (finishButton) {
            finishButton.disabled = false;
          }
        });
      });

      if (finishButton) {
        finishButton.disabled = selectedDevice === null;
      }
    }

    finishButton?.addEventListener('click', () => {
      if (!selectedDevice) {
        return;
      }

      if (!validateChildren(selectedChildren)) {
        currentStep = 3;
        renderCurrentStep();
        return;
      }

      setChildren(selectedChildren);
      onComplete();
    });
  }

  function bindStepThreeEvents(): void {
    const childCountSelect = container.querySelector('#setup-child-count-select') as HTMLSelectElement | null;
    const childTabButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-child-index]'));
    const nameInput = container.querySelector('#setup-child-name') as HTMLInputElement | null;
    const allergenMount = container.querySelector('#setup-child-allergens') as HTMLElement | null;

    childCountSelect?.addEventListener('change', () => {
      const count = Number(childCountSelect.value || '1');
      selectedChildren = resizeChildren(selectedChildren, count);
      activeChildIndex = Math.min(activeChildIndex, selectedChildren.length - 1);
      renderCurrentStep();
    });

    childTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        activeChildIndex = Number(button.dataset.childIndex || '0');
        renderCurrentStep();
      });
    });

    if (!nameInput || !allergenMount) {
      return;
    }

    const activeChild = selectedChildren[activeChildIndex];
    nameInput.addEventListener('input', () => {
      activeChild.name = nameInput.value;
    });

    allergenMount.appendChild(createAllergenCheckboxes(activeChild.allergens, allergens => {
      activeChild.allergens = allergens;
    }));
  }
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

function validateChildren(children: ChildProfile[]): boolean {
  if (children.length === 0) {
    alert('자녀를 한 명 이상 등록해 주세요.');
    return false;
  }

  const hasEmptyName = children.some(child => child.name.trim().length === 0);
  if (hasEmptyName) {
    alert('각 자녀의 이름 또는 구분을 입력해 주세요.');
    return false;
  }

  return true;
}

function renderStepBody(
  step: number,
  selectedDevice: DeviceType | null,
  children: ChildProfile[],
  activeChildIndex: number
): string {
  const safeActiveChild = children[Math.min(activeChildIndex, children.length - 1)];

  switch (step) {
    case 1:
      return `
        <div class="setup-slide setup-slide-hero">
          <div class="setup-step-kicker">STEP 1</div>
          <img
            class="setup-logo-image"
            src="${withAppBase('seokam_logo_transparent_small.png')}"
            alt="석암초 로고"
            loading="eager"
            decoding="async"
          />
          <h1>환영합니다</h1>
          <p class="setup-hero-copy">
            석암초 학생들의 안전한 급식을 위해 만든
            <strong>'석암초 안전급식'</strong> 앱에 오신 것을 환영합니다.
          </p>
          <button class="btn btn-primary setup-hero-button" id="setup-next">다음</button>
        </div>
      `;
    case 2:
      return `
        <div class="setup-slide">
          <div class="setup-step-kicker">STEP 2</div>
          <h2>석암초 교직원이 직접 개발한 앱입니다</h2>
          <p class="setup-slide-copy">
            석암초 학생들의 안전한 급식을 위해 전국 최초로 석암초 교직원이 직접 개발한
            <strong>'석암초 안전급식'</strong> 앱입니다.
          </p>
          <div class="selected-school-card">
            <span class="selected-school-icon">학교</span>
            <div>
              <div class="selected-school-name">${FIXED_SCHOOL.name}</div>
              <div class="selected-school-meta">${FIXED_SCHOOL.type} | ${FIXED_SCHOOL.district}</div>
            </div>
          </div>
          <div class="setup-actions">
            <button class="btn btn-ghost" id="setup-prev">이전</button>
            <button class="btn btn-primary" id="setup-next">다음</button>
          </div>
        </div>
      `;
    case 3:
      return `
        <div class="setup-slide">
          <div class="setup-step-kicker">STEP 3</div>
          <h2>자녀 수를 먼저 고르고 한 명씩 입력해 주세요</h2>
          <p class="setup-slide-copy">
            자녀 수를 먼저 선택한 뒤, 각 자녀 탭에서 이름과 알레르기를 차례대로 입력할 수 있습니다.
          </p>

          <div class="setup-child-count">
            <div class="setup-child-count-label">자녀 수</div>
            <select id="setup-child-count-select" class="form-input setup-child-count-select">
              ${[1, 2, 3, 4].map(count => `
                <option value="${count}"${children.length === count ? ' selected' : ''}>${count}명</option>
              `).join('')}
            </select>
          </div>

          <div class="setup-child-tabs">
            ${children.map((child, index) => `
              <button
                type="button"
                class="setup-child-tab${index === activeChildIndex ? ' active' : ''}"
                data-child-index="${index}"
              >
                ${child.name.trim() || getDefaultChildName(index)}
              </button>
            `).join('')}
          </div>

          <div class="setup-child-editor-card">
            <div class="setup-child-editor-top">
              <div>
                <div class="setup-child-editor-title">자녀 ${activeChildIndex + 1}</div>
                <div class="setup-child-editor-hint">현재는 ${children.length}명 기준으로 등록 중입니다.</div>
              </div>
              <div class="setup-child-editor-badge">${safeActiveChild.name.trim() || getDefaultChildName(activeChildIndex)}</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="setup-child-name">이름 또는 구분</label>
              <input
                id="setup-child-name"
                class="form-input"
                type="text"
                placeholder="예: 첫째, 민서"
                value="${escapeHtml(safeActiveChild.name)}"
              />
            </div>

            <div class="form-label">알레르기</div>
            <div id="setup-child-allergens"></div>
          </div>

          <div class="setup-actions">
            <button class="btn btn-ghost" id="setup-prev">이전</button>
            <button class="btn btn-primary" id="setup-next">다음</button>
          </div>
        </div>
      `;
    case 4:
    default:
      return `
        <div class="setup-slide">
          <div class="setup-step-kicker">STEP 4</div>
          <h2>사용 중인 기기를 선택해 주세요</h2>
          <p class="setup-slide-copy">
            아이폰과 안드로이드폰은 알림 설정 방식이 조금 다릅니다. 사용 중인 기기를 먼저 선택해 주세요.
          </p>
          <div class="device-choice-grid">
            <button class="device-choice-btn${selectedDevice === 'iphone' ? ' active' : ''}" data-device="iphone" type="button">
              <span class="device-choice-icon">iPhone</span>
              <span class="device-choice-name">아이폰</span>
            </button>
            <button class="device-choice-btn${selectedDevice === 'android' ? ' active' : ''}" data-device="android" type="button">
              <span class="device-choice-icon">Android</span>
              <span class="device-choice-name">안드로이드폰</span>
            </button>
          </div>
          <div class="device-guide-card" id="device-guide">
            ${renderDeviceGuide(selectedDevice)}
          </div>
          <div class="setup-actions">
            <button class="btn btn-ghost" id="setup-prev">이전</button>
            <button class="btn btn-primary" id="setup-finish">설정 완료</button>
          </div>
        </div>
      `;
  }
}

function detectDevice(): DeviceType | null {
  const userAgent = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'iphone';
  }
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  return null;
}

function renderDeviceGuide(device: DeviceType | null): string {
  if (device === 'iphone') {
    return `
      <div class="device-guide-title">아이폰 알림 설정 안내</div>
      <ol class="device-guide-list">
        <li>Safari에서 이 앱을 연 뒤 공유 버튼을 눌러 주세요.</li>
        <li>'홈 화면에 추가'를 선택하고 홈 화면에 앱을 배치해 주세요.</li>
        <li>홈 화면 아이콘으로 다시 앱을 실행해 주세요.</li>
        <li>앱의 설정 화면에서 알림을 켜고 iPhone 알림 권한을 허용해 주세요.</li>
      </ol>
    `;
  }

  if (device === 'android') {
    return `
      <div class="device-guide-title">안드로이드폰 알림 설정 안내</div>
      <ol class="device-guide-list">
        <li>Chrome에서 이 앱을 연 뒤 설치 또는 홈 화면 추가를 진행해 주세요.</li>
        <li>앱의 설정 화면에서 알림을 켜 주세요.</li>
        <li>브라우저 또는 앱의 알림 권한 요청이 뜨면 허용해 주세요.</li>
        <li>이후 매일 급식 정보와 자녀별 주의 메뉴를 알림으로 받을 수 있습니다.</li>
      </ol>
    `;
  }

  return `
    <div class="device-guide-title">기기 종류를 먼저 선택해 주세요</div>
    <p class="setup-slide-copy" style="margin-bottom:0">
      아이폰 또는 안드로이드폰을 선택하면 해당 기기에 맞는 알림 설정 방법을 바로 안내해 드립니다.
    </p>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
