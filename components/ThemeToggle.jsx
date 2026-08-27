"use client";

// 右上角那个白天/黑夜开关。
//
// 它其实只干一件事：把 <html> 的 data-theme 改成 "light" 或 "dark"。
// 换色是 CSS 的活儿——variables.css 里 [data-theme="dark"] 那一段会自动接管，
// 所以这里没有任何一行"把某个元素改成某个颜色"的代码。
//
// 两个容易踩的坑，代码里对应两处写法：
//
// 1）刷新后要记得上次的选择 → 存进 localStorage。但"读"不能放在这个组件里，
//    组件是 React 挂载后才跑的，那时页面已经画完一帧了，会先闪一下白再变黑。
//    真正的读取放在 app/layout.jsx 里那段内联脚本，它在页面画出来之前就跑完了。
//    这里只负责"写"。
//
// 2）静态导出的 HTML 里没有 data-theme（构建时哪知道你喜欢黑还是白），
//    所以首次渲染时组件并不知道当前主题，theme 先是 null，等 useEffect
//    挂载后再去 <html> 上问一次。这样服务端产出的 HTML 和浏览器第一次渲染
//    的结果一致，不会报 hydration 不匹配。
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);   // null = 还没挂载，不知道

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    // 无痕模式下 localStorage 会直接抛错，包一层免得连主题都切不动
    try {
      localStorage.setItem("theme", next);
    } catch (error) {
      console.warn("主题没能存下来，刷新后会恢复默认", error);
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      // 挂载前还不知道现在是哪个主题，给个中性的说法
      aria-label={
        theme === null
          ? "切换深色 / 浅色模式"
          : theme === "dark"
            ? "切换到浅色模式"
            : "切换到深色模式"
      }
      aria-pressed={theme === "dark"}
      title="白天 / 夜晚"
    >
      {/* 滑块。停在左边还是右边，全由 CSS 看 data-theme 决定 */}
      <span className="theme-toggle-knob" aria-hidden="true" />

      {/* 太阳 */}
      <svg
        className="theme-toggle-icon theme-toggle-sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 1.5v2M12 20.5v2M3.6 3.6l1.4 1.4M19 19l1.4 1.4M1.5 12h2M20.5 12h2M3.6 20.4L5 19M19 5l1.4-1.4" />
      </svg>

      {/* 月亮 */}
      <svg
        className="theme-toggle-icon theme-toggle-moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.5 13.3A8.5 8.5 0 1 1 10.7 3.5a6.6 6.6 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
