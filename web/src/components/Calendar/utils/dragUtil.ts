function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

export function getTargetDatenode(clientX: number, clientY: number) {
  return [...document.querySelectorAll('[datenode]')].find(node => {
    const r = node.getBoundingClientRect();
    return (
      r.x <= clientX && clientX <= r.right 
      && 
      r.y <= clientY && clientY <= r.bottom 
    )
  })
}

export function getDragAfterElement(container: Element, y: number) {
  const draggableElements = [...container.querySelectorAll('[plan]:not([state="dragging"])')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY, element: null as Element | null }).element;
}

export function smoothMove(container: Element, placeholder: Element, afterElement: Element) {
  if (placeholder.nextSibling === afterElement) return;

  const moveTargets = [...new Set([
    ...placeholder.closest('.datenode-item')!.children,
    ...container.children,
  ])].filter(plan => plan.getAttribute('state') !== 'dragging').reduce(
    (acc, cur) => [
      ...acc,
      {
        e: cur,
        posX: cur.getBoundingClientRect().x,
        posY: cur.getBoundingClientRect().y,
      }
    ], 
    [] as any[]
  );
  const heights: any[] = [container.closest('li')?.firstElementChild, placeholder.closest('li')?.firstElementChild].map(e => [e, e && parseInt(getComputedStyle(e).height)]);
  container.insertBefore(placeholder, afterElement); 

  moveTargets.forEach(m => {
    if (m.e.offsetTop !== m.pos) {
      let start: any;
      const animate = `${parseInt(m.e.getAttribute('animate')) + 1 || 0}`;
      m.e.setAttribute('animate', animate);
      const leftPos = parseInt(m.posX) - parseInt(m.e.getBoundingClientRect().x) + (parseInt(m.e.style.left) || 0);
      const topPos = parseInt(m.posY) - parseInt(m.e.getBoundingClientRect().y) + (parseInt(m.e.style.top) || 0);
      function step(timestamp: any) {
        if (start === undefined) start = timestamp;
        const ratio = (timestamp - start) / 200;
        const func = animate === '0' ? easeInOutCubic : easeOutCubic;
        m.e.style.left = leftPos ? (1 - func(Math.min(ratio, 1))) * leftPos + 'px' : '';
        m.e.style.top = topPos ? (1 - func(Math.min(ratio, 1))) * topPos + 'px' : '';

        if (ratio < 1 && animate === m.e.getAttribute('animate')) {
          window.requestAnimationFrame(step);
        } else if (animate === m.e.getAttribute('animate')) {
          m.e.style.left = '';
          m.e.style.top = '';
          m.e.removeAttribute('animate');
        }
      }
      window.requestAnimationFrame(step);
    }
  });
  heights.map(([e, h]) => {
    const curHeight = parseInt(getComputedStyle(e).height);
    if (h !== curHeight) {
      let start: any;
      const animate = `${parseInt(e.getAttribute('animate')) + 1 || 0}`;
      e.setAttribute('animate', animate);
      const marginPos = - curHeight + parseInt(h) + (parseInt(e.style.marginBottom) || 0);
      function step(timestamp: any) {
        if (start === undefined) start = timestamp;
        const ratio = (timestamp - start) / 200;
        e.style.marginBottom = (1 - easeInOutCubic(Math.min(ratio, 1))) * marginPos + 'px';

        if (ratio < 1 && animate === e.getAttribute('animate')) {
          window.requestAnimationFrame(step);
        } else if (animate === e.getAttribute('animate')) {
          e.style.marginBottom = '';
          e.removeAttribute('animate');
        }
      }
      return step;
      // window.requestAnimationFrame(step);
    }
    return null;
  }).forEach(step => step && window.requestAnimationFrame(step));
}