import { getMeal, getTodayDateString, MealInfo } from '../services/api';
import { getSchool, getAllergens } from '../services/storage';
import { createMealCard } from '../components/MealCard';
import { isNotificationSupported, getNotificationPermission } from '../services/push';

function formatDate(dateStr: string): string {
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 (${days[date.getDay()]})`;
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;
}

export function renderHome(container: HTMLElement, onSettings: () => void): void {
  const school = getSchool();
  const userAllergens = getAllergens();

  container.innerHTML = `
    <div class="page">
      <div class="header">
        <h1>🍱 오늘 급식</h1>
        <button class="header-btn" id="settings-btn" title="설정">⚙️</button>
      </div>
      <div class="content">
        ${isIOS() && !isStandalone() ? `
          <div class="ios-install-banner">
            📲 알림을 받으려면 Safari 공유 버튼 → 홈 화면에 추가 후 앱을 열어주세요 (iOS 16.4+)
          </div>
        ` : ''}
        ${isNotificationSupported() && getNotificationPermission() === 'default' ? `
          <div class="alert-banner info" id="push-banner">
            <span class="alert-icon">🔔</span>
            <div class="alert-text">
              <div class="alert-title">알림을 설정하시겠어요?</div>
              <div class="alert-desc">설정 화면에서 알림을 켜면 매일 아침 급식 알림을 받을 수 있습니다.</div>
            </div>
          </div>
        ` : ''}
        <div id="meal-content">
          <div class="loading"><div class="spinner"></div> 급식 정보 불러오는 중...</div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#settings-btn')?.addEventListener('click', onSettings);

  const mealContent = container.querySelector('#meal-content')!;

  loadMeal();

  async function loadMeal() {
    if (!school) return;

    try {
      const today = getTodayDateString();
      const meals = await getMeal(school.regionCode, school.schoolCode, today);
      renderMeals(meals, today);
    } catch (err: any) {
      if (err.code === 'API_KEY_PERMISSION') {
        mealContent.innerHTML = `
          <div class="alert-banner danger">
            <span class="alert-icon">🔑</span>
            <div class="alert-text">
              <div class="alert-title">API 키 권한 필요</div>
              <div class="alert-desc">
                NEIS API 키에 <strong>급식식단정보</strong> 서비스 권한이 없습니다.<br><br>
                <strong>해결 방법:</strong><br>
                1. open.neis.go.kr 로그인<br>
                2. 마이페이지 → 인증키 관리<br>
                3. 급식식단정보 서비스 활성화
              </div>
            </div>
          </div>
        `;
      } else {
        mealContent.innerHTML = `
          <div class="empty-state">
            <div class="icon">⚠️</div>
            <p>급식 정보를 불러오지 못했습니다.<br>잠시 후 다시 시도해주세요.</p>
            <button class="btn btn-ghost" style="margin-top:1rem;width:auto;padding:0.5rem 1.5rem" onclick="location.reload()">다시 시도</button>
          </div>
        `;
      }
    }
  }

  function renderMeals(meals: MealInfo[], dateStr: string) {
    if (meals.length === 0) {
      mealContent.innerHTML = `
        <div class="empty-state">
          <div class="icon">🏫</div>
          <p>오늘 급식 정보가 없습니다.<br>(방학이거나 급식이 없는 날입니다)</p>
        </div>
      `;
      return;
    }

    const schoolName = school?.name || '';
    let activeMealIndex = meals.findIndex(m => m.mealTypeCode === '2'); // 중식 우선
    if (activeMealIndex < 0) activeMealIndex = 0;

    const el = document.createElement('div');

    // 날짜 + 학교명
    el.innerHTML = `
      <div class="date-header">${formatDate(dateStr)} · ${schoolName}</div>
    `;

    // 알레르기 없음 안내
    if (userAllergens.length === 0) {
      const banner = document.createElement('div');
      banner.className = 'alert-banner info';
      banner.innerHTML = `
        <span class="alert-icon">ℹ️</span>
        <div class="alert-text">
          <div class="alert-desc">설정에서 알레르기를 추가하면 위험 메뉴를 강조 표시해드립니다.</div>
        </div>
      `;
      el.appendChild(banner);
    }

    // 탭 (조식/중식/석식)
    if (meals.length > 1) {
      const tabs = document.createElement('div');
      tabs.className = 'meal-tabs';
      meals.forEach((meal, i) => {
        const tab = document.createElement('button');
        tab.className = 'meal-tab' + (i === activeMealIndex ? ' active' : '');
        tab.textContent = meal.mealType;
        tab.addEventListener('click', () => {
          activeMealIndex = i;
          tabs.querySelectorAll('.meal-tab').forEach((t, j) => {
            t.classList.toggle('active', j === i);
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
