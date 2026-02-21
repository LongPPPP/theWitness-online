import React, { useState } from 'react';
import {
  Box,
  IconButton,
  InputBase,
  Paper,
  Divider,
  type SxProps,
  type Theme,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface NumberFieldProps {
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  sx?: SxProps<Theme>;
}

const NumberField: React.FC<NumberFieldProps> = ({
                                                   defaultValue = 0,
                                                   min = -Infinity,
                                                   max = Infinity,
                                                   onChange,
                                                   sx,
                                                 }) => {
  const [value, setValue] = useState<number>(defaultValue);

  const updateValue = (newValue: number) => {
    const clampedValue = Math.min(Math.max(newValue, min), max);
    setValue(clampedValue);
    onChange?.(clampedValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === '' ? 0 : Number(e.target.value);
    updateValue(newValue);
  };

  const increment = () => updateValue(value + 1);
  const decrement = () => updateValue(value - 1);

  return (
    <Paper
      variant="outlined"
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'stretch',
          borderRadius: 1,
          overflow: 'hidden',
          // 关键：撑满父元素高度，不超出
          height: '100%',
          boxSizing: 'border-box',
          '&:hover': {
            borderColor: 'primary.main',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <InputBase
        value={value}
        onChange={handleChange}
        inputProps={{
          min,
          max,
          type: 'number',
          style: { textAlign: 'center', fontWeight: 'bold' },
        }}
        sx={{
          width: 64,
          px: 1.5,
          fontSize: '0.875rem',
          '& input[type=number]': {
            MozAppearance: 'textfield',
          },
          '& input[type=number]::-webkit-outer-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
          '& input[type=number]::-webkit-inner-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
        }}
      />

      <Divider orientation="vertical" flexItem />

      {/* alignSelf: 'stretch' 让 Box 撑满 Paper 高度 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
        <IconButton
          size="small"
          onClick={increment}
          disabled={value >= max}
          sx={{
            borderRadius: 0,
            flex: 1,
            minHeight: 0,  // 覆盖 MUI 默认最小高度限制
            px: 0.5,
            py: 0,
            '&:not(:disabled):hover': {
              backgroundColor: 'action.hover',
            },
          }}
          aria-label="增加"
        >
          <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
        </IconButton>

        <Divider />

        <IconButton
          size="small"
          onClick={decrement}
          disabled={value <= min}
          sx={{
            borderRadius: 0,
            flex: 1,
            minHeight: 0,  // 覆盖 MUI 默认最小高度限制
            px: 0.5,
            py: 0,
            '&:not(:disabled):hover': {
              backgroundColor: 'action.hover',
            },
          }}
          aria-label="减少"
        >
          <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default NumberField;