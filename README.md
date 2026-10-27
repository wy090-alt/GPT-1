# GPT-1

## 小狗大冒险 · 奔向小白

一款浏览器横版闯关游戏：操控小鸡毛跳跃、收集金币、踩蘑菇，穿过阳光草地、落日晚霞和星光之约三个关卡，找到小白。

### 本地运行

无需安装依赖或构建。在仓库目录运行：

```sh
python -m http.server 4173 --directory dist
```

打开 http://localhost:4173 即可游玩。

### 操作

- 方向键 ← / → 或 A / D：移动。
- 空格、W 或 ↑：跳跃；空中再按一次可二段跳。
- P 或 Esc：暂停、继续。
- 手机使用画面下方的方向和跳跃按钮。

金币、问号砖、蘑菇小怪、中途存档旗、音效开关和本机最佳金币记录均已实现。右上角「小狗图鉴」可查看角色各角度及动作。

### 文件

- `dist/index.html`：游戏页面。
- `dist/style.css`：页面样式及移动端布局。
- `dist/game.js`：Canvas 绘图、角色动画、物理与关卡逻辑。
- `dist/icon.svg`：页面图标。

角色参考：[Moonlab 小金毛贴图](https://store.line.me/stickershop/product/24856095/en)、[Moonlab 小白贴图](https://store.line.me/stickershop/product/24856130/en)。
