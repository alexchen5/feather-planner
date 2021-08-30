import React from "react";
import { DragPlan } from "types/components/Calendar/PlanDragHandler";
import { SpringChanges } from "types/components/Calendar/PlanDragHandler/PlanSpring";

export const DraggingPlansContext = React.createContext({} as {
    dragPlans: DragPlan[],
    isDragging: boolean,
    startDrag: (planId: string, el: HTMLDivElement, dateStr: string, nxt: string, prv: string) => void,
    registerWrapper: (planId: string, el: HTMLDivElement, onUpdate: (spring: SpringChanges) => void) => void,
    updateWrapperPosition: (planId: string, top: number) => void,
});
