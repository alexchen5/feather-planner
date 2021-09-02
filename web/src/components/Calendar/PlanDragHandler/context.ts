import React from "react";
import { CalendarPlan } from "types/components/Calendar";
import { DragPlan } from "types/components/Calendar/PlanDragHandler";
import { SpringChanges } from "types/components/Calendar/PlanDragHandler/PlanSpring";

export const DraggingPlansContext = React.createContext({} as {
    dragPlans: DragPlan[],
    isDragging: boolean,
    startDrag: (plan: CalendarPlan, dateStr: string, el: HTMLDivElement, clientX: number, clientY: number) => void,
    declarePlanSpawn: (planId: string, staticEl: HTMLDivElement, onUpdate: (spring: SpringChanges) => void) => void,
});
