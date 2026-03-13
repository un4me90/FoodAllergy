import { MealInfo } from '../services/api';
import { getAllergenName } from '../utils/allergens';

export function createMealCard(meal: MealInfo, userAllergens: number[]): HTMLElement {
  const userSet = new Set(userAllergens);
  const card = document.createElement('div');

  // 위험 음식 개수
  const dangerCount = meal.dishes.filter(d =>
    d.allergens.some(a => userSet.has(a))
  ).length;

  if (dangerCount > 0) {
    const badge = document.createElement('div');
    badge.className = 'danger-count';
    badge.innerHTML = `⚠️ ${dangerCount}개 메뉴에 알레르기 주의`;
    card.appendChild(badge);
  }

  const list = document.createElement('ul');
  list.className = 'dish-list';

  meal.dishes.forEach(dish => {
    const matchedAllergens = dish.allergens.filter(a => userSet.has(a));
    const isDanger = matchedAllergens.length > 0;

    const li = document.createElement('li');
    li.className = 'dish-item' + (isDanger ? ' danger' : '');

    const icon = document.createElement('span');
    icon.className = 'dish-icon';
    icon.textContent = isDanger ? '⚠️' : '🍽️';

    const info = document.createElement('div');
    info.className = 'dish-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'dish-name';
    nameEl.textContent = dish.name;
    info.appendChild(nameEl);

    if (isDanger) {
      const badges = document.createElement('div');
      badges.className = 'allergen-badges';
      matchedAllergens.forEach(code => {
        const badge = document.createElement('span');
        badge.className = 'allergen-badge';
        badge.textContent = getAllergenName(code);
        badges.appendChild(badge);
      });
      info.appendChild(badges);
    } else if (dish.allergens.length > 0) {
      // 비위험 알레르기는 작게 표시
      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:0.75rem;color:#94a3b8;margin-top:0.125rem';
      meta.textContent = dish.allergens.map(getAllergenName).join(', ');
      info.appendChild(meta);
    }

    li.appendChild(icon);
    li.appendChild(info);
    list.appendChild(li);
  });

  card.appendChild(list);

  if (meal.calInfo) {
    const cal = document.createElement('div');
    cal.className = 'cal-info';
    cal.textContent = `열량: ${meal.calInfo}`;
    card.appendChild(cal);
  }

  return card;
}
