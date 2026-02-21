import { createContext, useContext } from "react";

export const PuzzleConfigContext = createContext(null);

export function usePuzzleConfig() {
    const context = useContext(PuzzleConfigContext);
    if (!context) throw new Error('usePuzzleConfig must be used within a PuzzleConfigProvider');
    return context;
}