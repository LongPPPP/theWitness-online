// src/pages/Homepage.tsx
import { Box, Typography, Button, Stack, Card, CardContent, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import React from 'react';

// 主页组件
const Homepage: React.FC = () => {
	const navigate = useNavigate();

	// 页面跳转方法
	const goToEditor = () => navigate('/editor');
	const goToRandomizer = () => navigate('/randomizer');

	return (
		<Container maxWidth="md" sx={{ py: 8 }}>
			{/* 页面标题区域 */}
			<Box textAlign="center" mb={8}>
				<Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
					The Witness Puzzle Tool
				</Typography>
				<Typography variant="h6" color="text.secondary" mb={4}>
					V1.0 - 一款便捷的解谜工具编辑器与随机生成器
				</Typography>
			</Box>

			{/* 功能卡片区域 */}
			<Stack spacing={4} direction={{ xs: 'column', md: 'row' }}>
				{/* Editor 功能卡片 */}
				<Card sx={{ flex: 1, boxShadow: 3, '&:hover': { boxShadow: 6 } }}>
					<CardContent sx={{ py: 6, textAlign: 'center' }}>
						<Typography variant="h4" gutterBottom color="primary">
							编辑器
						</Typography>
						<Typography variant="body1" color="text.secondary" mb={4}>
							自定义创建和解谜布局，调整参数满足个性化需求，支持实时预览效果
						</Typography>
						<Button
							variant="contained"
							size="large"
							onClick={goToEditor}
							sx={{ px: 4 }}
						>
							进入编辑器
						</Button>
					</CardContent>
				</Card>

				{/* Randomizer 功能卡片 */}
				<Card sx={{ flex: 1, boxShadow: 3, '&:hover': { boxShadow: 6 } }}>
					<CardContent sx={{ py: 6, textAlign: 'center' }}>
						<Typography variant="h4" gutterBottom color="secondary">
							随机生成器
						</Typography>
						<Typography variant="body1" color="text.secondary" mb={4}>
							一键生成随机解谜布局，支持自定义随机规则，快速获取多样化谜题
						</Typography>
						<Button
							variant="contained"
							size="large"
							onClick={goToRandomizer}
							sx={{ px: 4 }}
						>
							生成随机谜题
						</Button>
					</CardContent>
				</Card>
			</Stack>

			{/* 底部说明区域 */}
			<Box mt={8} textAlign="center">
				<Typography variant="body2" color="text.secondary">
					© 2026 The Witness Puzzle Tool - 所有功能免费使用
				</Typography>
			</Box>
		</Container>
	);
};

export default Homepage;