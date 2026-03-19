import { createAllergenCheckboxes } from '../components/AllergenCheckboxes';
import { FIXED_SCHOOL } from '../config/school';
import { getAllergens, setAllergens, setSchool } from '../services/storage';

export function renderSetup(container: HTMLElement, onComplete: () => void): void {
  let selectedAllergens: number[] = getAllergens();

  setSchool(FIXED_SCHOOL);

  container.innerHTML = `
    <div class="page">
      <div class="setup-header">
        <div class="logo">🍱</div>
        <h1>급식 알레르기 알림</h1>
        <p>알레르기 정보를 설정하면<br>매일 급식 알림을 받을 수 있어요.</p>
      </div>
      <div class="setup-steps">
        <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:0.75rem;padding:0.875rem 1rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.5rem">
          <span style="font-size:1.25rem">🏫</span>
          <div>
            <div style="font-weight:700;color:#1d4ed8">${FIXED_SCHOOL.name}</div>
            <div style="font-size:0.8125rem;color:#3b82f6">${FIXED_SCHOOL.type} · ${FIXED_SCHOOL.district}</div>
          </div>
        </div>
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-title">해당하는 알레르기를 모두 선택해 주세요.</div>
          <p style="font-size:0.875rem;color:#64748b;margin-bottom:0.75rem">없으면 선택하지 않고 완료를 눌러도 됩니다.</p>
          <div id="allergen-mount"></div>
        </div>
        <button class="btn btn-primary" id="setup-complete" style="margin-top:1rem">
          설정 완료
        </button>
      </div>
    </div>
  `;

  const allergenMount = container.querySelector('#allergen-mount')!;
  const completeBtn = container.querySelector('#setup-complete') as HTMLButtonElement;

  allergenMount.appendChild(
    createAllergenCheckboxes(selectedAllergens, allergens => {
      selectedAllergens = allergens;
    })
  );

  completeBtn.addEventListener('click', () => {
    setAllergens(selectedAllergens);
    onComplete();
  });
}
