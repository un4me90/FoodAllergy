import { getMeal, getTodayDateString, MealInfo } from '../services/api';
import { createMealCard } from '../components/MealCard';
import {
  getNotificationPermission,
  isNotificationSupported,
  isSubscribed,
} from '../services/push';
import { ChildProfile, getChildren, getSchool } from '../services/storage';

function formatDate(dateStr: string): string {
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(4, 6));
  const day = Number(dateStr.slice(6, 8));
  return `${year}.${month}.${day}.`;
}

function getHeaderTitle(): string {
  return '석암초 안전급식';
}

function getHeaderLabel(): string {
  return '급식 식단 및 알레르기 정보';
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function getSafeChildren(children: ChildProfile[]): ChildProfile[] {
  return children
    .filter(child => child && Array.isArray(child.allergens))
    .map((child, index) => ({
      ...child,
      name: child.name?.trim() || `자녀 ${index + 1}`,
      allergens: child.allergens.filter(code => Number.isInteger(code) && code > 0),
    }));
}

function getDangerousDishNames(meal: MealInfo, allergens: number[]): string[] {
  return meal.dishes
    .filter(dish => dish.allergens.some(code => allergens.includes(code)))
    .map(dish => dish.name);
}

function createFallbackMealSection(meal: MealInfo): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card';
  card.appendChild(createMealCard(meal, []));
  return card;
}

function createChildMealSection(meal: MealInfo, child: ChildProfile): HTMLElement {
  const section = document.createElement('section');
  section.className = 'child-meal-section';

  const titleRow = document.createElement('div');
  titleRow.className = 'child-meal-header';

  const title = document.createElement('div');
  title.className = 'child-meal-title';
  title.textContent = child.name;

  const status = document.createElement('div');
  status.className = 'child-meal-status';

  const dangerousDishNames = getDangerousDishNames(meal, child.allergens);
  if (child.allergens.length === 0) {
    status.textContent = '알레르기 미입력';
  } else if (dangerousDishNames.length === 0) {
    status.textContent = '주의 메뉴 없음';
    status.classList.add('safe');
  } else {
    status.textContent = `주의 메뉴 ${dangerousDishNames.length}개`;
    status.classList.add('danger');
  }

  titleRow.appendChild(title);
  titleRow.appendChild(status);
  section.appendChild(titleRow);

  const summary = document.createElement('div');
  summary.className = 'child-meal-summary';

  if (dangerousDishNames.length > 0) {
    summary.textContent = dangerousDishNames.join(', ');
  } else if (child.allergens.length === 0) {
    summary.classList.add('muted');
    summary.textContent = '설정에서 이 자녀의 알레르기를 입력하면 위험 메뉴를 따로 보여드립니다.';
  } else {
    summary.classList.add('muted');
    summary.textContent = '오늘은 등록한 알레르기에 해당하는 주의 메뉴가 없습니다.';
  }

  section.appendChild(summary);

  const card = document.createElement('div');
  card.className = 'card child-meal-card';
  card.appendChild(createMealCard(meal, child.allergens));
  section.appendChild(card);

  return section;
}

export function renderHome(container: HTMLElement, onSettings: () => void): void {
  const school = getSchool();
  const children = getSafeChildren(getChildren());
  const today = getTodayDateString();
  let activeChildIndex = 0;

  container.innerHTML = `
    <div class="page">
      <div class="header header-card">
        <div class="header-text">
          <div class="header-topline">
            <span class="header-date">${formatDate(today)}</span>
            <span class="header-label">${getHeaderLabel()}</span>
          </div>
          <h1>${getHeaderTitle()}</h1>
        </div>
        <button class="header-icon-btn" id="settings-btn" title="설정" aria-label="설정">⚙</button>
      </div>
      <div class="content">
        ${isIOS() && !isStandalone() ? `
          <div class="ios-install-banner">
            iPhone에서 알림을 받으려면 Safari에서 홈 화면에 추가한 뒤에 사용해 주세요. (iOS 16.4+)
          </div>
        ` : ''}
        <div id="push-banner-slot"></div>
        <div id="meal-content">
          <div class="loading"><div class="spinner"></div> 급식 정보를 불러오는 중...</div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#settings-btn')?.addEventListener('click', onSettings);

  const mealContent = container.querySelector('#meal-content') as HTMLElement;
  const pushBannerSlot = container.querySelector('#push-banner-slot') as HTMLElement;

  void renderPushBanner();
  void loadMeal();

  async function renderPushBanner() {
    if (!isNotificationSupported()) return;
    if (getNotificationPermission() !== 'default') return;
    if (await isSubscribed()) return;

    pushBannerSlot.innerHTML = `
      <div class="alert-banner info" id="push-banner">
        <span class="alert-icon">알림</span>
        <div class="alert-text">
          <div class="alert-title">알림을 설정하시겠어요?</div>
          <div class="alert-desc">설정 화면에서 알림을 켜면 매일 급식과 자녀별 주의 알레르기 메뉴를 받을 수 있습니다.</div>
        </div>
      </div>
    `;
  }

  async function loadMeal() {
    if (!school) return;

    let meals: MealInfo[];
    try {
      meals = await getMeal(school.regionCode, school.schoolCode, today);
    } catch (err: unknown) {
      const apiError = err as { code?: string };
      if (apiError.code === 'API_KEY_PERMISSION') {
        mealContent.innerHTML = `
          <div class="alert-banner danger">
            <span class="alert-icon">주의</span>
            <div class="alert-text">
              <div class="alert-title">API 권한이 필요합니다.</div>
              <div class="alert-desc">
                NEIS API의 급식식단정보 서비스 권한이 없습니다.<br><br>
                open.neis.go.kr에서 급식식단정보 서비스를 활성화해 주세요.
              </div>
            </div>
          </div>
        `;
      } else {
        mealContent.innerHTML = `
          <div class="empty-state">
            <div class="icon">!</div>
            <p>급식 정보를 불러오지 못했습니다.<br>잠시 후 다시 시도해 주세요.</p>
            <button class="btn btn-ghost" style="margin-top:1rem;width:auto;padding:0.5rem 1.5rem" onclick="location.reload()">다시 시도</button>
          </div>
        `;
      }
      return;
    }

    try {
      renderMeals(meals);
    } catch (err) {
      console.error('[home] failed to render family meal view:', err);
      renderFallbackMeals(meals);
    }
  }

  function renderFallbackMeals(meals: MealInfo[]) {
    if (meals.length === 0) {
      mealContent.innerHTML = `
        <div class="empty-state">
          <div class="icon">🍽</div>
          <p>오늘 급식 정보가 없습니다.<br>(방학 또는 급식이 없는 날일 수 있습니다)</p>
        </div>
      `;
      return;
    }

    let activeMealIndex = meals.findIndex(meal => meal.mealTypeCode === '2');
    if (activeMealIndex < 0) activeMealIndex = 0;

    const wrap = document.createElement('div');
    const cardWrap = document.createElement('div');
    wrap.appendChild(cardWrap);

    function updateCard() {
      cardWrap.innerHTML = '';
      cardWrap.appendChild(createFallbackMealSection(meals[activeMealIndex]));
    }

    if (meals.length > 1) {
      const tabs = document.createElement('div');
      tabs.className = 'meal-tabs';

      meals.forEach((meal, index) => {
        const tab = document.createElement('button');
        tab.className = 'meal-tab' + (index === activeMealIndex ? ' active' : '');
        tab.textContent = meal.mealType;
        tab.addEventListener('click', () => {
          activeMealIndex = index;
          tabs.querySelectorAll('.meal-tab').forEach((item, itemIndex) => {
            item.classList.toggle('active', itemIndex === index);
          });
          updateCard();
        });
        tabs.appendChild(tab);
      });

      wrap.insertBefore(tabs, cardWrap);
    }

    updateCard();
    mealContent.innerHTML = '';
    mealContent.appendChild(wrap);
  }

  function renderMeals(meals: MealInfo[]) {
    if (meals.length === 0) {
      mealContent.innerHTML = `
        <div class="empty-state">
          <div class="icon">🍽</div>
          <p>오늘 급식 정보가 없습니다.<br>(방학 또는 급식이 없는 날일 수 있습니다)</p>
        </div>
      `;
      return;
    }

    let activeMealIndex = meals.findIndex(meal => meal.mealTypeCode === '2');
    if (activeMealIndex < 0) activeMealIndex = 0;

    const contentWrap = document.createElement('div');

    if (children.length === 0) {
      const banner = document.createElement('div');
      banner.className = 'alert-banner info';
      banner.innerHTML = `
        <span class="alert-icon">안내</span>
        <div class="alert-text">
          <div class="alert-desc">설정에서 자녀를 등록하고 알레르기를 입력하면 자녀별 주의 메뉴를 더 정확하게 보여드립니다.</div>
        </div>
      `;
      contentWrap.appendChild(banner);
    }

    if (meals.length > 1) {
      const mealTabs = document.createElement('div');
      mealTabs.className = 'meal-tabs';

      meals.forEach((meal, index) => {
        const tab = document.createElement('button');
        tab.className = 'meal-tab' + (index === activeMealIndex ? ' active' : '');
        tab.textContent = meal.mealType;
        tab.addEventListener('click', () => {
          activeMealIndex = index;
          mealTabs.querySelectorAll('.meal-tab').forEach((item, itemIndex) => {
            item.classList.toggle('active', itemIndex === index);
          });
          updateMealSection();
        });
        mealTabs.appendChild(tab);
      });

      contentWrap.appendChild(mealTabs);
    }

    const summaryBanner = document.createElement('div');
    summaryBanner.className = 'family-summary-banner';
    contentWrap.appendChild(summaryBanner);

    const childTabs = document.createElement('div');
    childTabs.className = 'setup-child-tabs';
    contentWrap.appendChild(childTabs);

    const sectionWrap = document.createElement('div');
    contentWrap.appendChild(sectionWrap);

    function updateChildTabs() {
      childTabs.innerHTML = '';

      if (children.length <= 1) {
        childTabs.style.display = 'none';
        return;
      }

      childTabs.style.display = 'flex';
      children.forEach((child, index) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'setup-child-tab' + (index === activeChildIndex ? ' active' : '');
        tab.textContent = child.name;
        tab.addEventListener('click', () => {
          activeChildIndex = index;
          updateChildTabs();
          updateMealSection();
        });
        childTabs.appendChild(tab);
      });
    }

    function updateMealSection() {
      const meal = meals[activeMealIndex];

      summaryBanner.innerHTML = '';
      const summaryTitle = document.createElement('div');
      summaryTitle.className = 'family-summary-title';
      summaryTitle.textContent = `${meal.mealType} 자녀별 급식 확인`;

      const summaryText = document.createElement('div');
      summaryText.className = 'family-summary-text';
      if (children.length > 1) {
        summaryText.textContent = `${children[activeChildIndex].name} 기준으로 오늘 급식을 보여드립니다.`;
      } else {
        summaryText.textContent = '등록한 자녀 기준으로 오늘 급식을 안내합니다.';
      }

      summaryBanner.appendChild(summaryTitle);
      summaryBanner.appendChild(summaryText);

      sectionWrap.innerHTML = '';
      if (children.length === 0) {
        sectionWrap.appendChild(createFallbackMealSection(meal));
        return;
      }

      sectionWrap.appendChild(createChildMealSection(meal, children[activeChildIndex]));
    }

    updateChildTabs();
    updateMealSection();
    mealContent.innerHTML = '';
    mealContent.appendChild(contentWrap);
  }
}
