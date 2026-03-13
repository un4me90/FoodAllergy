import { searchSchools } from '../services/api';
import { SchoolInfo } from '../services/storage';

export function createSchoolSearch(
  initialSchool: SchoolInfo | null,
  onSelect: (school: SchoolInfo) => void
): HTMLElement {
  let debounceTimer: ReturnType<typeof setTimeout>;
  let selectedSchool = initialSchool;

  const wrapper = document.createElement('div');
  wrapper.className = 'school-search-wrap';

  const input = document.createElement('input');
  input.className = 'form-input';
  input.type = 'text';
  input.placeholder = '학교명을 입력하세요 (예: 서울중학교)';
  input.value = selectedSchool?.name || '';

  const dropdown = document.createElement('div');
  dropdown.className = 'school-results';
  dropdown.style.display = 'none';

  if (selectedSchool) {
    const badge = document.createElement('div');
    badge.className = 'selected-school';
    badge.innerHTML = `✅ ${selectedSchool.name} <span style="font-weight:400;color:#64748b">(${selectedSchool.type} · ${selectedSchool.district})</span>`;
    wrapper.appendChild(badge);
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 2) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }
    debounceTimer = setTimeout(async () => {
      dropdown.innerHTML = '<div style="padding:0.75rem 1rem;color:#64748b">검색 중...</div>';
      dropdown.style.display = 'block';
      try {
        const results = await searchSchools(q);
        dropdown.innerHTML = '';
        if (results.length === 0) {
          dropdown.innerHTML = '<div style="padding:0.75rem 1rem;color:#64748b">검색 결과가 없습니다.</div>';
          return;
        }
        results.forEach(school => {
          const item = document.createElement('div');
          item.className = 'school-result-item';
          item.innerHTML = `
            <div class="name">${school.name}</div>
            <div class="meta">${school.type} · ${school.district}</div>
          `;
          item.addEventListener('click', () => {
            selectedSchool = school;
            input.value = school.name;
            dropdown.style.display = 'none';
            onSelect(school);

            // 선택된 학교 표시 갱신
            const existingBadge = wrapper.querySelector('.selected-school');
            if (existingBadge) existingBadge.remove();
            const badge = document.createElement('div');
            badge.className = 'selected-school';
            badge.innerHTML = `✅ ${school.name} <span style="font-weight:400;color:#64748b">(${school.type} · ${school.district})</span>`;
            wrapper.appendChild(badge);
          });
          dropdown.appendChild(item);
        });
      } catch {
        dropdown.innerHTML = '<div style="padding:0.75rem 1rem;color:#dc2626">검색 오류가 발생했습니다.</div>';
      }
    }, 350);
  });

  // 외부 클릭 시 드롭다운 닫기
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target as Node)) {
      dropdown.style.display = 'none';
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(dropdown);
  return wrapper;
}
