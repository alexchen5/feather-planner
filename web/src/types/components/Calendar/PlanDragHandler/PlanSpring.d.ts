import { SpringValue } from "react-spring";

/**
 * Props which the PlanSpring component should accept
 */
export interface PlanSpringProps {
    spawnBox: { top: number, left: number },
    updateBox: { top: number, left: number } | null,
    onUpdate: (spring: SpringChanges) => void,
}

export type SpringChanges = {
    dx: number, 
    dy: number, 
    top: SpringValue<number>;
    left: SpringValue<number>;
}
  