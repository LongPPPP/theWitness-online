// context/ThemeContext.tsx
import {type ReactNode, useMemo, useState} from 'react';
import {createTheme, useMediaQuery} from '@mui/material';
import {ThemeProvider} from '@mui/material/styles';
import {ThemeContext, type ThemeMode, type UserSelectedThemeMode} from "@/components/hooks/useThemeMode.ts";


export function ThemeModeProvider({children}: { children: ReactNode }) {
	// 内部存储用户选择的模式（可能是system）
	const [userSelectedMode, setUserSelectedMode] = useState<UserSelectedThemeMode>(
		() => (localStorage.getItem('theme') as UserSelectedThemeMode) ?? 'system'
	);

	// 检测系统主题偏好
	const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
	// 解析最终的主题模式（仅light/dark）
	const resolvedMode: ThemeMode = useMemo(() => {
		if (userSelectedMode === 'system') {
			return prefersDark ? 'dark' : 'light';
		}
		// 非system时直接返回（类型收窄为light/dark）
		return userSelectedMode;
	}, [userSelectedMode, prefersDark]);

	// 创建主题（使用解析后的模式）
	const theme = useMemo(
		() => createTheme({
			palette: {
				mode: resolvedMode,
				background: {
					paper: resolvedMode === 'light' ? '#FFFFFF' : '#0F1214',
				},
			},
			typography: {
				fontFamily: 'Nunito ,Varela Round, sans-serif',
			},
			components: {
				MuiCssBaseline: {
					styleOverrides: {
						':root': {
							'--foreground': resolvedMode === 'light' ? '#344' : '#751',
						},
					},
				},
			},
		}),
		[resolvedMode]
	);

	// 封装切换方法：存储用户选择，同时更新解析后的模式
	const setMode = (newMode: UserSelectedThemeMode) => {
		setUserSelectedMode(newMode);
		localStorage.setItem('theme', newMode);
	};

	return (
		<ThemeContext.Provider
			value={{
				mode: resolvedMode, // 对外暴露解析后的模式（仅light/dark）
				setMode,
				theme,
				userSelectedMode, // 可选：暴露原始选择值
			}}
		>
			<ThemeProvider theme={theme}>
				{children}
			</ThemeProvider>
		</ThemeContext.Provider>
	);
}