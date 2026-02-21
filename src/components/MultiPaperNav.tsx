import {
	AppBar,
	Divider,
	Drawer,
	IconButton,
	Slider,
	Stack,
	styled,
	ToggleButton,
	ToggleButtonGroup,
	Toolbar,
	Tooltip,
	tooltipClasses,
	type TooltipProps
} from "@mui/material";
import Typography from '@mui/material/Typography';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import CloseIcon from '@mui/icons-material/Close';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import VolumeDownOutlinedIcon from '@mui/icons-material/VolumeDownOutlined';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import MouseOutlinedIcon from '@mui/icons-material/MouseOutlined';
import React, {useEffect, useState} from "react";
import {usePuzzleConfig} from "./TheWitnessPuzzle/context/puzzleConfigContext.ts";
import type {PuzzleConfig} from "./TheWitnessPuzzle/engine/puzzle/puzzle.ts";
import {type ThemeMode, useThemeMode} from "./hooks/useThemeMode.ts";
import { PrimaryButton } from '@/components/buttons';

const BootstrapTooltip = styled(({className, ...props}: TooltipProps) => (
	<Tooltip {...props} arrow classes={{popper: className}}/>
))(({theme}) => ({
	[`& .${tooltipClasses.arrow}`]: {
		color: theme.palette.common.black,
	},
	[`& .${tooltipClasses.tooltip}`]: {
		backgroundColor: theme.palette.common.black,
	},
}));

const CustomDrawer = styled(Drawer)(({theme}) => ({
	'& .MuiDrawer-paper': {
		width: '330px',
		borderRadius: `12px 0 0 12px`,
		boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',

		'& > .MuiStack-root': {
			padding: '8px 16px',
		},
	},
	'& .MuiTypography-root': {
		color: theme.palette.text.secondary,
	},
}));

const CustomToggleButton = styled(ToggleButton)(({theme}) => ({
	borderRadius: '8px',
	border: '1px solid',
	borderColor: theme.palette.divider,
	boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
	backgroundColor: theme.palette.background.paper,
	color: theme.palette.text.primary,
	textTransform: 'none',
	'&.Mui-selected': {
		backgroundColor: theme.palette.primary.main,
		color: theme.palette.common.white,
		boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
	},
	'&.Mui-selected:hover': {
		backgroundColor: theme.palette.primary.dark,
		boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
	},
}));

const CustomAppBar = styled(AppBar)(({theme}) => ({
	backgroundColor: 'transparent',
	boxShadow: 'none',
	borderBottom: `1px solid ${theme.palette.divider}`,
	zIndex: theme.zIndex.drawer - 1,

	'& .MuiToolbar-root': {
		minHeight: '44px',
		paddingRight: theme.spacing(2),
	},
}));

const VolumeControl = ({value, onVolumeChange}: {
	value: number, // 移除 defaultValue，改为必传的 value
	onVolumeChange?: (v: number) => void
}) => {
	// 处理滑块变化
	const handleSliderChange = (_event, newValue: number) => {
		onVolumeChange?.(newValue);
	};

	// 图标逻辑保持不变
	const getVolumeIcon = () => {
		if (value === 0) {
			return <VolumeOffOutlinedIcon fontSize="small"/>;
		} else if (value < 0.5) {
			return <VolumeDownOutlinedIcon fontSize="small"/>;
		} else {
			return <VolumeUpOutlinedIcon fontSize="small"/>;
		}
	};

	return (
		<Stack
			direction="row"
			alignItems="center"
			spacing={1}
			sx={{paddingRight: '8px', gap: '8px'}}
		>
			<Stack>
				{getVolumeIcon()}
			</Stack>
			<Slider
				step={0.1}
				min={0}
				max={1}
				valueLabelDisplay="auto"
				marks
				value={value}
				onChange={handleSliderChange}
			/>
		</Stack>
	);
};

export default function MultiPaperNav() {
	const [open, setOpen] = useState<boolean>(false);
	const [endHint, setEndHint] = useState<boolean>(true);
	const [volume, setVolume] = useState(1);
	const [sensitivity, setSensitivity] = useState(0.7);
	const {setConfig} = usePuzzleConfig();
	const { userSelectedMode,setMode } = useThemeMode();

	const handleClose = () => {
		setOpen(false);
	};
	const handleOpen = () => {
		setOpen(true);
	};

	const handleThemeChange = (
		_event: React.MouseEvent<HTMLElement>,
		newTheme: ThemeMode
	) => {
		if (newTheme !== null) {
			setMode(newTheme)
		}
	}

	const handleEndHit = (
		_event: React.MouseEvent<HTMLElement>,
		enable: boolean
	) => {
		if (enable !== null) {
			setEndHint(enable);
		}
	}

	useEffect(() => {
		setConfig((prevConfig: PuzzleConfig) => ({
			...prevConfig, // 基于最新配置扩展，而非外部的 config
			volume,
			sensitivity: sensitivity,
			enableEndHints: endHint,
		}));
	}, [endHint, sensitivity, setConfig, volume])

	return (
		<CustomAppBar position="fixed">
			<Toolbar disableGutters>
				<Stack direction="row" spacing={2}>

				</Stack>
				<Typography
					variant="h6"
					component="div"
					sx={{
						flexGrow: 1, // 占满剩余空间，实现居中
						textAlign: 'center', // 文字水平居中
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						fontWeight: 'bold',
						color: (theme) => theme.palette.text.primary,
					}}
				>Randomizer - V1.0
				</Typography>

				<BootstrapTooltip title="GitHub repository" arrow>
					<PrimaryButton
						disableRipple
						color="primary"
						size="medium"
						sx={{mr: (theme) => theme.spacing(2)}}
					>
						<GitHubIcon/>
					</PrimaryButton>
				</BootstrapTooltip>
				<BootstrapTooltip title="Toggle settings drawer" arrow>
					<PrimaryButton
						disableRipple
						color="primary"
						size="medium"
						onClick={handleOpen}
					>
						<SettingsOutlinedIcon/>
					</PrimaryButton>
				</BootstrapTooltip>
			</Toolbar>

			<CustomDrawer anchor="right" elevation={0} open={open} onClose={handleClose}>
				<Stack direction="row" justifyContent="space-between" sx={{fontWeight: 'bold'}}>
					Settings
					<IconButton size="small" color="primary" onClick={handleClose}>
						<CloseIcon fontSize="small"/>
					</IconButton>
				</Stack>
				<Divider component="div"/>
				<Stack direction="column">

					<Typography variant="caption" sx={{width: '100%', margin: "16px 0 8px 0"}}>Mode</Typography>
					<ToggleButtonGroup color="primary" value={userSelectedMode} onChange={handleThemeChange} exclusive fullWidth>
						<CustomToggleButton value='light' aria-label='light' onClick={()=> setMode('light')}>
							<LightModeOutlinedIcon fontSize="small" sx={{paddingRight: '4px'}}/>
							Light</CustomToggleButton>
						<CustomToggleButton value='system' aria-label='system' onClick={()=> setMode('system')}>
							System</CustomToggleButton>
						<CustomToggleButton value='dark' aria-label='dark' onClick={()=> setMode('dark')}>
							<BedtimeIcon fontSize="small" sx={{paddingRight: '4px'}}/>
							Dark</CustomToggleButton>
					</ToggleButtonGroup>

					<Typography variant="caption" sx={{width: '100%', margin: "16px 0 8px 0"}}>EndHint</Typography>
					<ToggleButtonGroup color="primary" value={endHint} onChange={handleEndHit} exclusive fullWidth>
						<CustomToggleButton value={true} aria-label='enable'>Enable</CustomToggleButton>
						<CustomToggleButton value={false} aria-label='disable'>Disable</CustomToggleButton>
					</ToggleButtonGroup>

					<Typography variant="caption" sx={{width: '100%', margin: "16px 0 8px 0"}}>Volume</Typography>
					<VolumeControl value={volume} onVolumeChange={(v: number) => {
						setVolume(v)
					}}/>

					<Typography variant="caption" sx={{width: '100%', margin: "16px 0 8px 0"}}>Sensitivity</Typography>
					<Stack direction="row" alignItems="center" spacing={1} sx={{paddingRight: '8px', gap: '8px'}}>
						<MouseOutlinedIcon fontSize="small"/>
						<Slider value={sensitivity} step={0.1} min={0} max={1} valueLabelDisplay="auto" marks
										onChange={(_event, newValue) => {
											setSensitivity(newValue)
										}}/>
					</Stack>

				</Stack>
			</CustomDrawer>
		</CustomAppBar>
	)
}