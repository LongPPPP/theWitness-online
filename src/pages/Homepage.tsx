// src/pages/Homepage.tsx
import { Box, Typography, Button, Stack, Card, CardContent, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';

// 主页组件
const Homepage: React.FC = () => {
	const navigate = useNavigate();
	const [bgImage, setBgImage] = useState('');

	// 背景图片随机加载逻辑
	useEffect(() => {
		const images = [
			'/bg_witness_1.jpg', // 请确保这些图片存在于 public 文件夹中
			'/bg_witness_2.jpg',
			'/bg_witness_3.jpg',
			'/bg_witness_4.jpg'
		];
		const randomIdx = Math.floor(Math.random() * images.length);
		setBgImage(images[randomIdx]);
	}, []);

	// 页面跳转方法
	const goToEditor = () => navigate('/editor');
	const goToRandomizer = () => navigate('/randomizer');

	// 公共磨砂样式定义
	const glassStyle = {
		background: 'rgba(255, 255, 255, 0.2)', // 半透明白
		backdropFilter: 'blur(12px) saturate(160%)', // 核心：模糊与饱和度提升
		WebkitBackdropFilter: 'blur(12px) saturate(160%)',
		border: '1px solid rgba(255, 255, 255, 0.3)',
		boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
		transition: 'transform 0.3s ease-in-out, background 0.3s ease',
		'&:hover': {
			background: 'rgba(255, 255, 255, 0.3)',
			transform: 'translateY(-5px)',
		}
	};

	return (
		<Box
			sx={{
				minHeight: '100vh',
				width: '100%',
				backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), url(${bgImage})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundAttachment: 'fixed',
				display: 'flex',
				alignItems: 'center',
			}}
		>
			<Container maxWidth="md" sx={{ py: 8 }}>
				{/* 页面标题区域 - 增加文字阴影提高可读性 */}
				<Box textAlign="center" mb={8}>
					<Typography
						variant="h3"
						component="h1"
						gutterBottom
						fontWeight="bold"
						sx={{ color: '#fff', textShadow: '2px 2px 8px rgba(0,0,0,0.5)' }}
					>
						The Witness Puzzle Tool
					</Typography>
					<Typography
						variant="h6"
						mb={4}
						sx={{ color: 'rgba(255,255,255,0.9)', textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}
					>
						V1.0 - 一款便捷的解谜工具编辑器与随机生成器
					</Typography>
				</Box>

				{/* 功能卡片区域 */}
				<Stack spacing={4} direction={{ xs: 'column', md: 'row' }}>
					{/* Editor 功能卡片 */}
					<Card sx={{ flex: 1, ...glassStyle }}>
						<CardContent sx={{ py: 6, textAlign: 'center' }}>
							<Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: '#fff' }}>
								编辑器
							</Typography>
							<Typography variant="body1" mb={4} sx={{ color: 'rgba(255,255,255,0.8)' }}>
								自定义创建和解谜布局，调整参数满足个性化需求，支持实时预览效果
							</Typography>
							<Button
								variant="contained"
								size="large"
								onClick={goToEditor}
								sx={{
									px: 4,
									backgroundColor: '#ff9800',
									'&:hover': { backgroundColor: '#f57c00' }
								}}
							>
								进入编辑器
							</Button>
						</CardContent>
					</Card>

					{/* Randomizer 功能卡片 */}
					<Card sx={{ flex: 1, ...glassStyle }}>
						<CardContent sx={{ py: 6, textAlign: 'center' }}>
							<Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: '#fff' }}>
								随机生成器
							</Typography>
							<Typography variant="body1" mb={4} sx={{ color: 'rgba(255,255,255,0.8)' }}>
								一键生成随机解谜布局，支持自定义随机规则，快速获取多样化谜题
							</Typography>
							<Button
								variant="contained"
								size="large"
								onClick={goToRandomizer}
								sx={{
									px: 4,
									backgroundColor: '#2196f3',
									'&:hover': { backgroundColor: '#1976d2' }
								}}
							>
								生成随机谜题
							</Button>
						</CardContent>
					</Card>
				</Stack>

				{/* 底部说明区域 */}
				<Box mt={8} textAlign="center">
					<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
						© 2026 The Witness Puzzle Tool - 所有功能免费使用
					</Typography>
				</Box>
			</Container>
		</Box>
	);
};

export default Homepage;