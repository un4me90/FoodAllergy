import { ALLERGENS } from '../utils/allergens';

export function createAllergenCheckboxes(
  initial: number[],
  onChange: (selected: number[]) => void
): HTMLElement {
  const selected = new Set<number>(initial);

  const grid = document.createElement('div');
  grid.className = 'allergen-grid';

  ALLERGENS.forEach(allergen => {
    const label = document.createElement('label');
    label.className = 'allergen-item' + (selected.has(allergen.code) ? ' checked' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selected.has(allergen.code);

    const emoji = document.createElement('span');
    emoji.className = 'emoji';
    emoji.textContent = allergen.emoji;

    const name = document.createElement('span');
    name.textContent = allergen.name;

    label.appendChild(checkbox);
    label.appendChild(emoji);
    label.appendChild(name);

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selected.add(allergen.code);
        label.classList.add('checked');
      } else {
        selected.delete(allergen.code);
        label.classList.remove('checked');
      }
      onChange([...selected]);
    });

    grid.appendChild(label);
  });

  return grid;
}
