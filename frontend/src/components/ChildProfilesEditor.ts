import { createAllergenCheckboxes } from './AllergenCheckboxes';
import { ChildProfile, createEmptyChildProfile } from '../services/storage';

function getDefaultChildName(index: number): string {
  const labels = ['첫째', '둘째', '셋째', '넷째', '다섯째'];
  return labels[index] || `자녀 ${index + 1}`;
}

function cloneChildren(children: ChildProfile[]): ChildProfile[] {
  return children.map(child => ({
    ...child,
    allergens: [...child.allergens],
  }));
}

export function createChildProfilesEditor(
  initialChildren: ChildProfile[],
  onChange: (children: ChildProfile[]) => void
): HTMLElement {
  let children = cloneChildren(initialChildren.length > 0 ? initialChildren : [createEmptyChildProfile()]);

  const root = document.createElement('div');

  function emitChange(): void {
    onChange(cloneChildren(children));
  }

  function render(): void {
    root.innerHTML = '';
    root.className = 'child-profiles-editor';

    const header = document.createElement('div');
    header.className = 'child-profiles-header';
    header.innerHTML = `
      <div>
        <div class="child-profiles-title">자녀 정보를 입력해 주세요</div>
        <div class="child-profiles-subtitle">자녀가 여러 명이면 각자 다른 알레르기를 따로 저장할 수 있습니다.</div>
      </div>
    `;
    root.appendChild(header);

    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'child-profile-grid';

    children.forEach((child, index) => {
      const card = document.createElement('div');
      card.className = 'child-profile-card';

      const topRow = document.createElement('div');
      topRow.className = 'child-profile-top';

      const titleWrap = document.createElement('div');
      titleWrap.innerHTML = `
        <div class="child-profile-title">자녀 ${index + 1}</div>
        <div class="child-profile-hint">이름과 알레르기 정보를 저장합니다.</div>
      `;
      topRow.appendChild(titleWrap);

      if (children.length > 1) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'child-profile-remove';
        removeButton.textContent = '삭제';
        removeButton.addEventListener('click', () => {
          children = children.filter(item => item.id !== child.id);
          render();
          emitChange();
        });
        topRow.appendChild(removeButton);
      }

      card.appendChild(topRow);

      const nameGroup = document.createElement('div');
      nameGroup.className = 'form-group';

      const nameLabel = document.createElement('label');
      nameLabel.className = 'form-label';
      nameLabel.textContent = '이름 또는 구분';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'form-input';
      nameInput.placeholder = '예: 첫째, 민서';
      nameInput.value = child.name;
      nameInput.addEventListener('input', () => {
        child.name = nameInput.value;
        emitChange();
      });

      nameGroup.appendChild(nameLabel);
      nameGroup.appendChild(nameInput);
      card.appendChild(nameGroup);

      const allergenLabel = document.createElement('div');
      allergenLabel.className = 'form-label';
      allergenLabel.textContent = '알레르기';
      card.appendChild(allergenLabel);

      const allergenEditor = createAllergenCheckboxes(child.allergens, allergens => {
        child.allergens = allergens;
        emitChange();
      });
      card.appendChild(allergenEditor);

      cardsWrap.appendChild(card);
    });

    root.appendChild(cardsWrap);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn btn-outline child-profile-add';
    addButton.textContent = '자녀 추가';
    addButton.addEventListener('click', () => {
      children = [
        ...children,
        {
          ...createEmptyChildProfile(),
          name: getDefaultChildName(children.length),
        },
      ];
      render();
      emitChange();
    });
    root.appendChild(addButton);
  }

  render();
  emitChange();
  return root;
}
