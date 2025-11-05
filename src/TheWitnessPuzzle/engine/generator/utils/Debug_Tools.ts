
export function logHexMatrix(matrix: number[][]) {
    if (!Array.isArray(matrix)) {
        console.info('输入不是数组');
        return;
    }

    matrix.forEach((row) => {
        const hexRow = row.map((num) => {
            // 处理无效值（如 null, undefined）
            if (typeof num !== 'number' || isNaN(num)) {
                return '0x??';
            }
            return '0x' + num.toString(16).toUpperCase();
        }).join(' ');
        console.info(`[${hexRow}]`);
    });
}