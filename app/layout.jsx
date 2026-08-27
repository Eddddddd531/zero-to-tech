// app/layout.jsx 是 Next.js 的"全站外壳"——所有页面都套在它里面。
// 它取代了 4.4 的 index.html + main.jsx + App.jsx 最外面那层壳：
//   - <html>/<body> 由它提供；
//   - app-shell / page-shell / page-content 这层包裹，和 4.4 App.jsx 里一模一样；
//   - 4.4 main.jsx 里那 8 行 import CSS，原样搬到这里（顺序不变）。
// 注意：导航条 Nav 不在这儿，它在每一页的 hero 里（HomeView / TextLabView 各放一份），
// 这样整页布局和 4.4 完全一致。

import "../css/reset.css";
import "../css/variables.css";
import "../css/layout.css";
import "../css/hero.css";
import "../css/nav.css";
import "../css/cards.css";
import "../css/lab.css";
import "../css/responsive.css";

export const metadata = {
  title: "zero to tech",
  description: "个人主页 + 文字实验室",
};

// 开灯脚本。它必须在页面画出第一帧之前跑完，所以是一段"塞进 HTML 里的字符串"，
// 而不是一个正经的 React 组件——组件要等 React 挂载，那会儿白底早就闪过去了。
//
// 干的事：先问 localStorage 上次选了啥；没存过就问系统（macOS 的深色模式），
// 然后把结果写到 <html data-theme> 上。CSS 一看见这个属性就换色。
// 两条路都明确写上 light / dark，别留空——ThemeToggle 取反时要读它。
const themeBootstrap = `
(function () {
  try {
    var saved = localStorage.getItem("theme");
    var dark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning：上面那段脚本会在 React 接手之前偷偷改 <html>
    // 的属性，React 一对比"服务端产出的 HTML"和"现在浏览器里的样子"就会报不一致。
    // 这一处不一致是我们故意的，跟 React 打个招呼让它别喊。
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <div className="app-shell">
          <div className="page-shell">
            <main className="page-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
