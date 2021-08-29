import React from "react";
import { DraggingPlan } from "types/components/Calendar/PlanDragHandler";
import { SpringChanges } from "types/components/Calendar/PlanDragHandler/PlanSpring";

export const DraggingPlansContext = React.createContext({} as {
    draggingPlans: DraggingPlan[], 
    addDraggingPlan: (plan: DraggingPlan, placeholder: HTMLElement) => void,
    registerWrapper: (planId: string, el: HTMLDivElement, onUpdate: (spring: SpringChanges) => void) => void,
});
