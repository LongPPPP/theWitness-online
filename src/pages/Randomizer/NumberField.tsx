import React, { useState, type CSSProperties } from 'react';

interface NumberFieldProps {
    defaultValue?: number;
    min?: number;
    max?: number;
    onChange?: (value: number) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({
                                                     defaultValue = 0,
                                                     min = -Infinity,
                                                     max = Infinity,
                                                     onChange
                                                 }) => {
    const [value, setValue] = useState<number>(defaultValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value === '' ? 0 : Number(e.target.value);
        updateValue(newValue);
    };

    const updateValue = (newValue: number) => {
        const clampedValue = Math.min(Math.max(newValue, min), max);
        setValue(clampedValue);
        onChange?.(clampedValue);
    };

    const increment = () => {
        updateValue(value + 1);
    };

    const decrement = () => {
        updateValue(value - 1);
    };

    const containerStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'stretch',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        overflow: 'hidden'
    };

    // 核心修改：添加隐藏原生箭头的样式
    const inputStyle: CSSProperties = {
        width: '12px',
        padding: '8px 12px',
        borderRight: '1px solid #d1d5db',
        border: 'none',
        outline: 'none',
        textAlign: 'center',
        fontSize: '14px',
        fontFamily: 'inherit',
        // 隐藏 Firefox 原生箭头
        MozAppearance: 'textfield',
        // 隐藏 Chrome/Safari 原生箭头（基础）
        WebkitAppearance: 'none',
        appearance: 'textfield'
    };

    const buttonsContainerStyle: CSSProperties = {
        display: 'flex',
        flexDirection: 'column'
    };

    const buttonBaseStyle: CSSProperties = {
        width: '24px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    };

    const upButtonStyle: CSSProperties = {
        ...buttonBaseStyle,
        borderBottom: '1px solid #d1d5db'
    };

    const downButtonStyle: CSSProperties = {
        ...buttonBaseStyle
    };

    const disabledButtonStyle: CSSProperties = {
        backgroundColor: '#f9fafb',
        cursor: 'not-allowed',
        opacity: 0.5
    };

    // 补充：通过 style 标签覆盖 Webkit 伪元素样式（隐藏 Chrome/Safari 箭头）
    React.useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            input[type="number"]::-webkit-outer-spin-button,
            input[type="number"]::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div style={containerStyle}>
            <input
                type="number"
                value={value}
                onChange={handleChange}
                min={min}
                max={max}
                style={inputStyle}
            />

            <div style={buttonsContainerStyle}>
                <button
                    onClick={increment}
                    disabled={value >= max}
                    style={{
                        ...upButtonStyle,
                        ...(value >= max ? disabledButtonStyle : {})
                    }}
                    onMouseEnter={(e) => {
                        if (value < max) {
                            (e.target as HTMLButtonElement).style.backgroundColor = '#e5e7eb';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (value < max) {
                            (e.target as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
                        }
                    }}
                    aria-label="增加"
                >
                    <svg style={{ width: '12px', height: '12px', color: '#4b5563' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </button>

                <button
                    onClick={decrement}
                    disabled={value <= min}
                    style={{
                        ...downButtonStyle,
                        ...(value <= min ? disabledButtonStyle : {})
                    }}
                    onMouseEnter={(e) => {
                        if (value > min) {
                            (e.target as HTMLButtonElement).style.backgroundColor = '#e5e7eb';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (value > min) {
                            (e.target as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
                        }
                    }}
                    aria-label="减少"
                >
                    <svg style={{ width: '12px', height: '12px', color: '#4b5563' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NumberField;