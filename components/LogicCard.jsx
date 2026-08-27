"use client";

// 判分逻辑卡片。这一节把结果再往前扒一层——ResultCard 只把 0.87 和「偏积极」
// 两个数字摆出来，中间发生了什么一点都看不见。这张卡拿的是同一份 result
//（还是 TextLabView 那份提上去的 state，没有再新开一个），把这次判定一步步拆开。
//
// 有一步前端看不见，得说在前头：SnowNLP 的分词、去停用词、朴素贝叶斯连乘，
// 全在后端 /api/analyze 内部跑完了，接口只把最后那个数字交出来。
// 分词结果、没四舍五入的原始概率，我们这儿拿不到——那就照实写"拿不到"，
// 不编一份假的糊在上面。看不到就是看不到，这也是"接口契约"的一课。
//
// 用了 useEffect / useRef 给阈值尺的指针做滑动，所以顶上写了 "use client"。
import { useEffect, useRef } from "react";
import { animate } from "animejs";

// 跟 backend/main.py 的 score_label() 一一对应，连比较的顺序都不能换：
// 先判 >= 0.6，再判 <= 0.4，剩下的才轮到中性。
// 两个等号是有讲究的——恰好 0.6 算积极，恰好 0.4 算消极。
const BRANCHES = [
  { code: "if score >= 0.6:", label: "偏积极", test: (s) => s >= 0.6 },
  { code: "elif score <= 0.4:", label: "偏消极", test: (s) => s <= 0.4 },
  { code: "else:", label: "中性", test: () => true },
];

// 阈值尺上从左到右的三段，branch 指回上面 BRANCHES 的下标
const ZONES = [
  { key: "neg", width: "40%", branch: 1, caption: "偏消极" },
  { key: "mid", width: "20%", branch: 2, caption: "中性" },
  { key: "pos", width: "40%", branch: 0, caption: "偏积极" },
];

const TICKS = [
  { value: "0.00", style: { left: 0 } },
  { value: "0.40", style: { left: "40%", transform: "translateX(-50%)" } },
  { value: "0.60", style: { left: "60%", transform: "translateX(-50%)" } },
  { value: "1.00", style: { right: 0 } },
];

export default function LogicCard({ result }) {
  const pinRef = useRef(null);

  const score = result ? result.score : null;
  const hit = score === null ? -1 : BRANCHES.findIndex((b) => b.test(score));

  useEffect(() => {
    // 指针滑到这次分数所在的位置；没有结果时压根没渲染指针，直接跳过
    if (score === null || !pinRef.current) return;
    animate(pinRef.current, {
      left: `${score * 100}%`,
      duration: 700,
      ease: "outBack",
    });
  }, [score]);

  return (
    <article className="panel panel-full lab-panel logic-panel card">
      <div className="panel-heading">
        <p className="section-kicker">判分逻辑</p>
        <h3>这次是怎么判的</h3>
      </div>

      {!result && (
        <p className="logic-empty">
          左边点一下「开始分析」，这里就会把这次的判定过程一步步拆开。
          下面的规则是写死的，不用等结果也能先看。
        </p>
      )}

      <div className="logic-steps">
        <div className="logic-step">
          <p className="logic-step-head">
            <span className="logic-step-index">1</span>收到文字
          </p>
          {result ? (
            <>
              <p className="logic-step-body">{result.text}</p>
              <p className="logic-step-meta">
                共 {result.text.length} 个字符，原样 POST 给 /api/analyze
              </p>
            </>
          ) : (
            <p className="logic-step-meta">等一段文字</p>
          )}
        </div>

        <div className="logic-step" data-remote>
          <p className="logic-step-head">
            <span className="logic-step-index">2</span>SnowNLP 算出一个概率
            <span className="logic-tag">跑在后端</span>
          </p>
          <p className="logic-step-body">
            分词（TnT 模型）→ 扔掉停用词 → 加一平滑的朴素贝叶斯 → 得到 P(积极)。
          </p>
          <p className="logic-step-meta">
            这一摊全在 /api/analyze 内部跑完，接口只把最后那个数字交出来。
            分词切成了哪几个词、没四舍五入前的原始概率是多少，前端一概拿不到，
            所以这里不编给你看——想看的话，得回后端给返回值多加两个字段。
          </p>
        </div>

        <div className="logic-step">
          <p className="logic-step-head">
            <span className="logic-step-index">3</span>四舍五入到两位
          </p>
          <p className="logic-code-inline">round(SnowNLP(text).sentiments, 2)</p>
          {result ? (
            <p className="logic-step-body">
              → 这次拿到 <strong>{score.toFixed(2)}</strong>
            </p>
          ) : (
            <p className="logic-step-meta">→ 等一个分数</p>
          )}
        </div>

        <div className="logic-step">
          <p className="logic-step-head">
            <span className="logic-step-index">4</span>拿分数去撞阈值
          </p>

          <div className="logic-ruler">
            <div className="logic-ruler-track">
              <div className="logic-ruler-zones">
                {ZONES.map((zone) => (
                  <span
                    key={zone.key}
                    className="logic-ruler-zone"
                    style={{ width: zone.width }}
                    data-hit={hit === zone.branch ? "" : undefined}
                  >
                    {zone.caption}
                  </span>
                ))}
              </div>
              {score !== null && (
                <span ref={pinRef} className="logic-ruler-pin">
                  <em>{score.toFixed(2)}</em>
                </span>
              )}
            </div>
            <div className="logic-ruler-scale">
              {TICKS.map((tick) => (
                <span key={tick.value} style={tick.style}>
                  {tick.value}
                </span>
              ))}
            </div>
          </div>

          <div className="logic-code">
            {BRANCHES.map((branch, i) => (
              <p key={branch.code} data-hit={hit === i ? "" : undefined}>
                <code>{branch.code}</code>
                <span>→ {branch.label}</span>
              </p>
            ))}
          </div>

          <p className="logic-step-meta">
            顺序是从上往下撞，撞上哪条就是哪条。注意那两个等号：
            恰好 0.60 算积极，恰好 0.40 算消极，中性只占 0.40 到 0.60 中间那一小段。
          </p>
        </div>

      </div>

      <div className="logic-notes">
        <p>
          <span>1</span>
          这个模型是拿三万多行电商商品评论训练出来的。你写「这个快递太慢了」它很准，
          写诗、写代码注释就开始乱给分——不是它坏了，是问错了领域。
        </p>
        <p>
          <span>2</span>
          朴素贝叶斯把每个词的概率连乘起来，文本越长越容易滑到 0 或者 1。
          看到 1.00 别当成「百分之百积极」，真实值可能是 0.99936，只是被 round 到两位了。
          这个分数看方向就好，别当成程度。
        </p>
      </div>
    </article>
  );
}
