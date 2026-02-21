import {createContext, useContext} from "react";
import type {createTheme} from "@mui/material";

export const ThemeContext = createContext<ThemeContextValue | null>(null);
// 1. 保留原始类型（用于内部存储用户选择）
export type UserSelectedThemeMode = 'light' | 'system' | 'dark';
// 2. 对外暴露的类型（仅light/dark）
export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
	// 对外只暴露解析后的最终模式（无system）
	mode: ThemeMode;
	// 切换方法依然支持传入system（方便用户选择），但内部会解析
	setMode: (mode: UserSelectedThemeMode) => void;
	theme: ReturnType<typeof createTheme>;
	// 可选：暴露原始选择值（如果需要展示用户选择的是"跟随系统"）
	userSelectedMode: UserSelectedThemeMode;
}

export function useThemeMode() {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
	return ctx;
}