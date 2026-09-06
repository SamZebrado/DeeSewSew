# DeeSewSew

浏览器里的小小刺绣工作室：移动穿着线的针，慢慢绣出自己的作品。
A tiny embroidery studio in your browser: move a threaded needle and make something at your own pace.

## 当前功能 / Features

- 正反面真实针线拓扑，无需每针翻面。
  True front/back needle and thread topology, without mandatory flipping.
- 松线随针下垂与摆动；针尖先穿布，针眼携线跟随，再从新针孔向旧针孔逐段收紧。
  Loose thread follows with sag and inertia; the tip enters first, the eye carries thread through, and tension travels from the new hole toward the old hole.
- 可停在任意角度的绣盘旋转、可关闭的行针动画和自定义颜色。
  Rotation that stops at any angle, optional stitch animation, and custom colors.
- 简体中文／英文、本机保存、撤销／重做、JSON 导入导出和可选单色叶子引导。
  Simplified Chinese/English, local saving, undo/redo, JSON import/export, and an optional monochrome leaf guide.

作品不上传到服务器。本机存储不可用时仍可导出当前内存中的作品。
Artwork is not uploaded. If local storage is unavailable, the current in-memory artwork can still be exported.

## 操作 / Interaction

- 移动鼠标定位，点击落针；针尖对应针孔，线连在针眼上。可见面的针移出绣盘仍可见，但不能在布外落针。
  Move to position the needle and click to puncture. The tip marks the hole; thread attaches to the eye. A directly visible needle follows outside the hoop without making outside punctures.
- 针藏在另一面时，选择出针点即可继续，不会伪造可见针或背面线段。
  When the needle is hidden, choose its emergence point to continue; no visible needle or reverse thread is fabricated.
- Shift 拖动、边框拖动或双指拖动可旋转；自动旋转可随时停止，也可回正面／背面。
  Shift-drag, rim drag, or two-finger drag rotates the hoop. Stop automatic rotation anywhere or return to either face.
- 触屏按下、拖动定位、松手落针。方向键旋转，Home／End 回正面／背面；Cmd/Ctrl+Z 撤销，加 Shift 重做。
  On touch, press, drag, and release to puncture. Arrow keys rotate; Home/End select front/back. Cmd/Ctrl+Z undoes; add Shift to redo.
- 过于倾斜的角度仅供查看。关闭动画或启用系统减少动态效果会立即落定，保留实时松线跟随。
  Shallow angles are inspect-only. Motion off or system Reduce Motion settles immediately while retaining live thread following.

## 导入导出 / Import & export

导出下载包含规范拓扑的版本化 JSON。导入先校验整个文件，再确认替换非空作品；错误文件不会清空当前作品。浏览器存储不是永久备份，请保留导出副本。
Export downloads versioned JSON with canonical topology. Import validates the whole file before confirming replacement of nonempty work; invalid files do not clear the current piece. Browser storage is not a permanent archive: keep exported backups.

## 叶子引导 / Leaf guide

默认自由刺绣。点击“试试绣一片叶子”，按下一个高亮点落针。引导使用真实针线逻辑，不凭空添加首段线；使用一种选定颜色。撤销回退进度，退出后线段保留为普通作品。
Free stitching is the default. Choose “Try a leaf” and follow the next highlighted point. It uses the real needle/thread model, never invents a first segment, and keeps one selected color. Undo rewinds progress; exiting keeps ordinary editable stitches.

## 本地开发 / Development

安装 Node.js 和 npm 后运行：
With Node.js and npm installed:

```sh
npm install
npm run dev
npm test
npm run test:e2e
npm run test:offline
npm run typecheck
npm run build
npm run preview
```

开发地址通常为 `http://127.0.0.1:5173/DeeSewSew/`，生产输出位于 `dist/`。运行时仅使用浏览器 API，无第三方运行时依赖。
The development URL is usually `http://127.0.0.1:5173/DeeSewSew/`; production output is in `dist/`. Runtime code uses browser APIs without third-party runtime dependencies.

## GitHub Pages

静态 PWA 的资源及离线缓存范围为 `/DeeSewSew/`。本地候选不代表公开发布；发布须经过指定审查、真人体验和独立的精确提交授权。
The static PWA uses `/DeeSewSew/` for assets and offline scope. A local candidate is not a public release: publication requires designated review, human testing, and separate approval of the exact commit.

## 当前限制与证据边界 / Limitations & evidence

- 当前是表面拓扑与轻量松线近似，不是体积线材或材料物理模拟。任意深度穿线、劈线、结、压力笔、陀螺仪、自由三轴相机仍延期。
  This is surface topology with a lightweight loose-thread approximation, not volumetric thread or material physics. Arbitrary depth routing, splitting, knots, stylus pressure, gyroscope, and free three-axis cameras remain deferred.
- 平针／回针是简化路径外观，不自动执行完整传统针法。旧版作品仅恢复历史正面外观，不虚构背面。
  Running/Back are simplified routing styles, not automated traditional sequences. Legacy pieces preserve their historical front appearance without inventing reverse topology.
- 画布落针尚无完整键盘替代操作。无账号、云同步、图库或分析追踪。
  Canvas puncturing lacks full keyboard parity. There are no accounts, cloud sync, galleries, or analytics.
- 浏览器鼠标／触摸事件及手机／平板尺寸测试不等于真实设备手感验证。生产录屏与数学测试分别记录，不能互相替代。
  Browser mouse/touch and phone/tablet viewport tests are not physical-device feel evidence. Production recordings and mathematical tests are reported separately and do not replace one another.

## 许可 / License

采用 Apache License 2.0，详见 [LICENSE](LICENSE)。布料、木环与图标为项目自有程序绘制，不加载远程纹理、网页字体或第三方图标包。
Apache License 2.0; see [LICENSE](LICENSE). Fabric, hoop, and icons are project-owned procedural graphics, without remote textures, web fonts, or third-party icon packs.
