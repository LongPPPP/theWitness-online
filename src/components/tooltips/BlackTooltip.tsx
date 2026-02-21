import {styled, Tooltip, tooltipClasses, type TooltipProps} from "@mui/material";

const BlackTooltip = styled(({className, ...props}: TooltipProps) => (
	<Tooltip {...props} arrow classes={{popper: className}}/>
))(({theme}) => ({
	[`& .${tooltipClasses.arrow}`]: {
		color: theme.palette.common.black,
	},
	[`& .${tooltipClasses.tooltip}`]: {
		backgroundColor: theme.palette.common.black,
	},
}));

export default BlackTooltip;