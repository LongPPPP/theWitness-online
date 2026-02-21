import {IconButton, styled} from "@mui/material";

const PrimaryButton = styled(IconButton)(({theme}) => ({
	borderRadius: '12px',
	border: '1px solid',
	borderColor: theme.palette.divider,
	boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', // 添加按钮阴影
	backgroundColor: theme.palette.background.paper,
	// 核心：hover 背景变灰 + 阴影强化
	'&:hover': {
		backgroundColor: theme.palette.action.hover,
		boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)', // 阴影加深
	},
	'& svg': { // MUI Icon最终渲染为svg标签
		fontSize: theme.typography.pxToRem(16),
		color: theme.palette.primary,
	},
}));

export default PrimaryButton;