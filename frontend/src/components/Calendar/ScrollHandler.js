import React, { useEffect } from "react";

import {CalendarContext} from '.'
import {newDateRange, dateToStr } from './util';

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}
function smoothMove(container, placeholder, afterElement) {
  if (placeholder.nextSibling === afterElement) return;

  const moveTargets = [...new Set([
    ...placeholder.closest('.datenode-item').children,
    ...container.children,
  ])].reduce(
    (acc, cur) => [
      ...acc,
      {
        e: cur,
        posX: cur.getBoundingClientRect().x,
        posY: cur.getBoundingClientRect().y,
      }
    ], 
    []
  );
  const heights = [container.closest('li'), placeholder.closest('li')].map(e => [e, parseInt(getComputedStyle(e).height)]);
  container.insertBefore(placeholder, afterElement); 

  moveTargets.forEach(m => {
    if (m.e.offsetTop !== m.pos) {
      let start;
      const animate = `${parseInt(m.e.getAttribute('animate')) + 1 || 0}`;
      m.e.setAttribute('animate', animate);
      const leftPos = parseInt(m.posX) - parseInt(m.e.getBoundingClientRect().x) + (parseInt(m.e.style.left) || 0);
      const topPos = parseInt(m.posY) - parseInt(m.e.getBoundingClientRect().y) + (parseInt(m.e.style.top) || 0);
      function step(timestamp) {
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
  heights.forEach(([e, h]) => {
    const curHeight = parseInt(getComputedStyle(e).height);
    if (h !== curHeight) {
      let start;
      const animate = `${parseInt(e.getAttribute('animate')) + 1 || 0}`;
      e.setAttribute('animate', animate);
      const marginPos = - parseInt(curHeight) + parseInt(h) + (parseInt(e.style.marginBottom) || 0);
      function step(timestamp) {
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
      window.requestAnimationFrame(step);
    }
  });
}
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('[plan]:not([dragging])')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY}).element;
}

function ScrollHandler({children}) {
  const {dates, dispatchDates} = React.useContext(CalendarContext);
  const [loading, setLoading] = React.useState(false);
  const datenodeContainer = React.useRef(null);

  const loadDates = async (dateRange, dir, start, end) => {
    if (loading) return;
    setLoading(dir);
    await dispatchDates({type: 'load', dir, dateRange, start, end});
    if (dir === "INIT") {
      datenodeContainer.current.scrollTop = 80;
      document.querySelector(`[datenode="${dateToStr()}"]`).firstElementChild.focus();
    } 
    setLoading(false);
  }

  const handleNodePagination = event => {
    if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop === event.currentTarget.clientHeight) {
      const [dateRange, start, end] = newDateRange(dates, "END")
      loadDates(dateRange, "END", start, end);
    } else if (event.currentTarget.scrollTop === 0) {
      datenodeContainer.current.scrollTop = 1;
      const [dateRange, start, end] = newDateRange(dates, "FRONT")
      loadDates(dateRange, "FRONT", start, end);
    }
  }

  useEffect(() => {
    if (dates.length === 0) {
      const [dateRange, start, end] = newDateRange(dates, "INIT");
      loadDates(dateRange, "INIT", start, end);
    }
    // eslint-disable-next-line
  }, []);
  
  const handleDragStart = (event) => {
    const target = event.target;

    const date_str = target.closest('[datenode]').getAttribute('datenode');
    const placeholder = document.createElement('div');
    placeholder.style.height = window.getComputedStyle(target).height;
    placeholder.style.pointerEvents = 'none';
    placeholder.style.position = 'relative';
    placeholder.setAttribute('placeholder', date_str);

    setTimeout(() => {
      target.style.display = 'none';
      const container = document.querySelector('#datenode-container');
      const datenodeFrom = target.closest('.datenode-item');
      datenodeFrom.insertBefore(placeholder, target);
      container.setAttribute('drag-display', '');
      datenodeFrom.style.pointerEvents = 'none';
      container.onpointermove = () => {
        datenodeFrom.style.pointerEvents = '';
        container.onpointermove = null;
      }
    });
    target.setAttribute('dragging', '');
  }

  const handleDragOver = event => {
    event.preventDefault();
    if (!event.target.hasAttribute('datenode')) return;
    const datenode = event.target.firstElementChild;
    const afterElement = getDragAfterElement(datenode, event.clientY) || datenode.querySelector('.plan-add');
    const placeholder = document.querySelector('[placeholder]');
    
    smoothMove(datenode, placeholder, afterElement);
  }

  const handleDrop = (event) => {
    const plan = document.querySelector('[dragging]');
    const plan_id = plan.getAttribute('plan');
    const placeholder = document.querySelector('[placeholder]');
    const to_date = event.target.getAttribute('datenode');
    const from_date = placeholder.getAttribute('placeholder');
    
    const plansTo = [...event.target.querySelectorAll('[placeholder], [plan]:not([dragging])')];
    const to_index = plansTo.indexOf(placeholder);
    const to_prv_id = (plansTo[to_index - 1] || '') && plansTo[to_index - 1].getAttribute('plan');
    const to_nxt_id = (plansTo[to_index + 1] || '') && plansTo[to_index + 1].getAttribute('plan');

    const plansFrom = [...document.querySelector(`[datenode="${from_date}"]`).querySelectorAll('[plan]')];
    const from_index = plansFrom.indexOf(plan);
    const from_prv_id = (plansFrom[from_index - 1] || '') && plansFrom[from_index - 1].getAttribute('plan');
    const from_nxt_id = (plansFrom[from_index + 1] || '') && plansFrom[from_index + 1].getAttribute('plan');

    if (to_date === from_date && to_prv_id === from_prv_id && to_nxt_id === from_nxt_id) return;
    dispatchDates({type: 'move', plan_id, to_date, from_date, from_prv_id, from_nxt_id, to_prv_id, to_nxt_id })
    handleDragEnd(); // dragend event gets cancelled on re-render
  }

  const handleDragEnd = () => {
    const target = document.querySelector('[dragging]');
    const placeholder = document.querySelector('[placeholder]');
    if (target) {
      target.removeAttribute('dragging');
      target.style.display = '';
    }
    if (placeholder) placeholder.remove();
    document.querySelector('#datenode-container').removeAttribute('drag-display');
  }

  const handleDragLeave = event => {
    event.stopPropagation();
    if (event.relatedTarget && event.relatedTarget.closest('#datenode-container')) return;
    const placeholder = document.querySelector('[placeholder]');
    const container = document.querySelector(`[datenode="${placeholder.getAttribute('placeholder')}"]`).firstElementChild;
    const draggingPlan = document.querySelector('[dragging]');

    smoothMove(container, placeholder, draggingPlan);
  }

  return (
    <ul
      id={'datenode-container'} 
      ref={datenodeContainer}
      onScroll={handleNodePagination}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
    >
      {children}
      {(loading === "FRONT" || loading === "INIT") && <div style={{width: '100%', order: -1, position: 'absolute'}}>loading</div>}
      {(loading === "END") && <div style={{position: 'absolute'}}>loading</div>}
    </ul>
  )
}

export default ScrollHandler;