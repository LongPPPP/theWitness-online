import {alpha, Button, type ButtonProps, styled, type Theme} from '@mui/material';

// 自定义带动态 hover 边框的 Button
const TextButton = styled(Button)<ButtonProps>(({theme, color = 'primary', variant = "outlined"}) => {
	// 1. 映射 color prop 到对应的主题色（覆盖 MUI 内置的 color 类型）
	const getColorFromProp = (theme: Theme, colorProp: string) => {
		// 处理 MUI 内置的 color 类型（primary/secondary/error/warning/info/success）
		if (['primary', 'secondary', 'error', 'warning', 'info', 'success'].includes(colorProp)) {
			return theme.palette[colorProp as keyof typeof theme.palette].main;
		}

		if (colorProp === 'inherit') {
			return theme.palette.text.primary;
		}
		// 处理自定义 color（如 hex/rgb 字符串）
		return colorProp;
	};

	const baseColor = getColorFromProp(theme, color);

	if(variant === "outlined") {
		return {
			borderRadius: '12px',
			border: '1px solid',
			padding: theme.spacing(0.25,1),
			borderColor: theme.palette.divider,
			textTransform: 'none',
			// 3. hover 状态：边框色跟随 color prop 变化
			'&:hover': {
				borderColor: alpha(baseColor, 0.7),
				backgroundColor: alpha(baseColor, 0.1) || theme.palette.action.hover,
			},

			'&:active': {
				borderColor: alpha(baseColor, 0.8) || color,
			},
		};
	} else {
		return{
			borderRadius: '12px',
			border: '1px solid',
			padding: theme.spacing(0.25,1),
			textTransform: 'none',
			borderColor: theme.palette.divider,
		}
	}
});

// 用法示例
export default TextButton;