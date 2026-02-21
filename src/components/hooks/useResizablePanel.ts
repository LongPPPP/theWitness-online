import { useState, useRef, useCallback, useEffect } from 'react';

// 自定义 Hook：处理可调整宽度的面板逻辑
export function useResizablePanel(initialWidth = 330, minRatio = 0.2, maxRatio = 0.5) {
	// 左侧面板宽度状态
	const [leftWidth, setLeftWidth] = useState(initialWidth);
	// 拖动状态标记
	const isDraggingRef = useRef(false);
	// 拖动起始信息
	const dragRef = useRef({ startX: 0, startWidth: 0 });

	// 鼠标移动事件：计算新宽度并更新
	const handleDragMove = useCallback((e: MouseEvent) => {
		if (!isDraggingRef.current) return;
		const deltaX = e.clientX - dragRef.current.startX;
		// 限制宽度范围（基于窗口宽度的比例）
		const newWidth = Math.max(
			window.innerWidth * minRatio,
			Math.min(dragRef.current.startWidth + deltaX, window.innerWidth * maxRatio)
		);
		setLeftWidth(newWidth);
	}, []);

	// 拖动结束：解绑事件，重置状态
	const handleDragEnd = useCallback(() => {
		isDraggingRef.current = false;
		document.removeEventListener('mousemove', handleDragMove);
		document.removeEventListener('mouseup', handleDragEnd);
	}, [handleDragMove]);

	// 拖动开始：绑定事件，记录起始信息
	const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		isDraggingRef.current = true;
		dragRef.current = {
			startX: e.clientX,
			startWidth: leftWidth,
		};
		// 绑定全局鼠标事件
		document.addEventListener('mousemove', handleDragMove);
		document.addEventListener('mouseup', handleDragEnd);
	}, [handleDragEnd, handleDragMove, leftWidth]);

	// 组件卸载时清理事件监听
	useEffect(() => {
		return () => {
			document.removeEventListener('mousemove', handleDragMove);
			document.removeEventListener('mouseup', handleDragEnd);
		};
	}, [handleDragEnd, handleDragMove]);

	// 返回对外暴露的状态和方法
	return {
		leftWidth,
		handleDragStart,
	};
}