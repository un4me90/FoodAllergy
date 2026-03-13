import { getMeal, getTodayDateString, MealInfo } from '../services/api';
import { createMealCard } from '../components/MealCard';
import {
  getNotificationPermission,
  isNotificationSupported,
  isSubscribed,
} from '../services/push';
import { getAllergens, getSchool } from '../services/storage';

function formatDate(dateStr: string): string {
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(4, 6));
  const day = Number(dateStr.slice(6, 8));
  return `${year}.${month}.${day}.`;
}

function getHeaderTitle(): string {
  return '석암초 안전급식';
}

function getHeaderSubtitle(): string {
  return '석암초 안전급식';
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function renderHome(container: HTMLElement, onSettings: () => void): void {
  const school = getSchool();
  const userAllergens = getAllergens();
  const today = getTodayDateString();
  const schoolName = school?.name || '학교';

  container.innerHTML = `
    <div class="page">
      <div class="header header-card">
        <div class="header-text">
          <div class="header-kicker">석암초 안전급식</div>
          <h1>${getHeaderTitle()}</h1>
          <div class="header-subtitle">${getHeaderSubtitle()}</div>
          <div class="header-meta">${formatDate(today)} ${schoolName}</div>
        </div>
        <button class="header-icon-btn" id="settings-btn" title="설정" aria-label="설정">⚙</button>
      </div>
      <div class="content">
        ${isIOS() && !isStandalone() ? `
          <div class="ios-install-banner">
            iPhone에서 알림을 받으려면 Safari에서 홈 화면에 추가한 뒤 사용해 주세요. (iOS 16.4+)
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
          <div class="alert-desc">설정 화면에서 알림을 켜면 매일 아침 급식과 맞춤 알레르기 알림을 받을 수 있습니다.</div>
        </div>
      </div>
    `;
  }

  async function loadMeal() {
    if (!school) return;

    try {
      const meals = await getMeal(school.regionCode, school.schoolCode, today);
      renderMeals(meals);
    } catch (err: unknown) {
      const apiError = err as { code?: string };
      if (apiError.code === 'API_KEY_PERMISSION') {
        mealContent.innerHTML = `
          <div class="alert-banner danger">
            <span class="alert-icon">주의</span>
            <div class="alert-text">
              <div class="alert-title">API 권한이 필요합니다</div>
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
    }
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

    let activeMealIndex = meals.findIndex((meal) => meal.mealTypeCode === '2');
    if (activeMealIndex < 0) activeMealIndex = 0;

    const el = document.createElement('div');

    if (userAllergens.length === 0) {
      const banner = document.createElement('div');
      banner.className = 'alert-banner info';
      banner.innerHTML = `
        <span class="alert-icon">안내</span>
        <div class="alert-text">
          <div class="alert-desc">설정에서 알레르기를 선택하면 주의 메뉴를 더 정확하게 강조해 드립니다.</div>
        </div>
      `;
      el.appendChild(banner);
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
          updateMealCard();
        });
        tabs.appendChild(tab);
      });

      el.appendChild(tabs);
    }

    const cardWrap = document.createElement('div');
    cardWrap.className = 'card';
    el.appendChild(cardWrap);

    function updateMealCard() {
      cardWrap.innerHTML = '';
      cardWrap.appendChild(createMealCard(meals[activeMealIndex], userAllergens));
    }

    updateMealCard();
    mealContent.innerHTML = '';
    mealContent.appendChild(el);
  }
}
