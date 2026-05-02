## trace2逻辑
### 总体逻辑

所有计算来自鼠标的动量，动量经过pushCursor调整后加到data.x/data.y上

BoundingBox用于记录当前格子的四个顶点，中心点的数据

PathSegment中的redraw函数使用data.x/data.y的位置修改cursor的位置并且根据来时方向和BoundingBox绘制走过的道路

#### onMove（核心函数）：

1.鼠标移动的时候产生动量，使用pushCursor把动量加到data.x, data.y上

2.使用while循环处理动量特别大的时候

3.使用

4.使用move函数判断要移动的方向，若有碰撞还会截断（直接修改data.x, data.y）

5.如果是倒退方向则要销毁PathSegment

6.如果是别的方向则要添加PathSegment

如何使用：

要使用他首先要把trace函数挂载到start图形上

点击start图形后触发requestPointerLock，mousedown / mouseup / click / wheel事件将会派发给start图形

进入requestPointerLock后只要点击左键就能退出lock模式，因为点击事件派发给了start图形，他再次触发trace函数，进入trace函数的结束分支


### trace函数是实现游戏功能的顶层函数

#### 这个函数由点击start图形触发: 

首次调用分支:

1.清理残留的道路svg

2.播放音效

3.插入样式表(起点高亮，道路高亮/失败，等状态)

4.为鼠标hook上事件(hookMovementEvents函数)

第二次调用分支（结束分支）:

1.若pos(由动量改变)位于end上，则验证是否可行

2.若不在并且是桌面端，则保留划线的位置

### hookMovementEvents函数为鼠标/触屏点击添加事件：

requestPointerLock, 把实际的鼠标指针留在这里

onmousemove: 获取event的动量，调用onMove函数

ontouchstart: 记录点击位置

ontouchmove: 获取触点坐标，用当前坐标减去上一次坐标计算出动量然后调用onMove函数

ontouchend: 清理

### pushCursor把动量应用到data.x和data.y上：

保证在水平道路只能水平移动，垂直道路只能垂直移动（使用push函数修改动量）

交叉点根据dx和dy判断那个大来判断用户是否想要转向