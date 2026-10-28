(() => {
  'use strict';

  const section = document.querySelector('#routine');
  if (!section) return;

  const tablist = section.querySelector('.routine-tabs');
  const tabs = Array.from(section.querySelectorAll('.routine-tab'));
  const panels = Array.from(section.querySelectorAll('.routine-panel'));
  if (!tablist || tabs.length !== panels.length || !tabs.length) return;

  function activate(index, moveFocus = false) {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    section.dataset.routineDay = String(index + 1);
    if (moveFocus) tabs[index].focus();
  }

  tablist.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    const panel = panels[index];
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(next, true);
    });
  });

  activate(0);
  tablist.hidden = false;
  section.classList.add('routine-ready');
})();
