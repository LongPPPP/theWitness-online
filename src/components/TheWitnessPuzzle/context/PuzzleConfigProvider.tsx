import {useState} from "react";
import {PuzzleConfigContext} from "./puzzleConfigContext.ts";
import type {PuzzleConfig} from "../engine/puzzle/puzzle.ts";

export default function PuzzleConfigProvider({children}) {
	const [config, setConfig] = useState<PuzzleConfig>({
		volume: 0.5,
		sensitivity: 0.7,
		enableEndHints: true,
		scale: 1,
		onSuccess: () => {
		},
		wittleTracing: true,
	});

	return (
		<PuzzleConfigContext.Provider value={{config, setConfig}}>
			{children}
		</PuzzleConfigContext.Provider>
	);
}
