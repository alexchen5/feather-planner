import { SpringValue } from "react-spring";

/**
 * Props which the PlanSpring component should accept
 */
export interface PlanSpringProps {
    prvBox: DOMRect,
    aimBox: DOMRect,
    onUpdate: (spring: SpringChanges) => void,
}

export type SpringChanges = {
    dx: number, 
    dy: number, 
    top: SpringValue<number>;
    left: SpringValue<number>;
}
  