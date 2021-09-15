import { CalendarPlan } from "..";

export interface DragPlan extends CalendarPlan {
    planId: string,
    el: HTMLDivElement,
    dateStr: string,
    onDrag: () => void,
    plans: string[],
}
