// (?<!=|!)==(?!=)

// import {SortedSet} from "./engine/generator/utils/SortedSet.ts";
// import {Point} from "./engine/generator/Panel.ts";
//
// const set1 = new SortedSet<Point>();
// const set2 = new SortedSet<Point>();
//
// set1.Add(new Point(1,3))
// set1.Add(new Point(1,2));
// set2.Add(new Point(1,2));
// set2.Add(new Point(1,3));
//
// console.info(set1.SetEquals(set2))

let poly = 0x322;
let newPoly = 0; // 存储最终变换结果
const array: number[][] = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];

// 遍历4x4网格的所有16个bit（位置0~15）
for (let pos = 0; pos < 16; pos++) {
    array[pos % 4][3 - Math.trunc(pos / 4)] = (poly & 1);
    poly = poly >> 1;
}
// console.info("==============对角线反转前==============")
// const beforeCopy = array.map(row => [...row]);
// console.info(beforeCopy,(decoration >> 16).toString(16));

// 对角线反转
for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
        // 交换 array[i][j] 和 array[j][i]
        [array[i][j], array[j][i]] = [array[j][i], array[i][j]];
    }
}
// console.info("==============对角线反转后==============")
// console.info(array,(decoration >> 16).toString(16))

// 转换为puzzle的格式
for (let j=3;j>=0;j--) {
    const col = array[0][j] | (array[1][j] << 1) | (array[2][j] << 2) | (array[3][j] << 3);
    newPoly = (newPoly << 4) | col;
}

console.info(newPoly.toString(16));