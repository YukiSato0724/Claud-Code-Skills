/**
 * ニュースページ アプリケーション
 */
(function () {
  const CATEGORY_LABELS = {
    release: "リリース",
    tips: "Tips",
    update: "アップデート",
    event: "イベント",
  };

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}年${m}月${day}日`;
  }

  function createNewsCard(item) {
    const linkHtml = item.link
      ? `<a class="news-card__link" href="${item.link}" target="_blank" rel="noopener noreferrer">詳しく見る &rarr;</a>`
      : "";

    const sourceHtml = item.sourceUrl
      ? `<div class="news-card__source">
          <span class="news-card__source-label">出典:</span>
          <a class="news-card__source-link" href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer">${item.sourceName || item.sourceUrl}</a>
        </div>`
      : "";

    return `
      <article class="news-card">
        <div class="news-card__meta">
          <time class="news-card__date" datetime="${item.date}">${formatDate(item.date)} 公開</time>
          <span class="news-card__category news-card__category--${item.category}">${CATEGORY_LABELS[item.category] || item.category}</span>
        </div>
        <h2 class="news-card__title">${item.title}</h2>
        <p class="news-card__body">${item.body}</p>
        ${sourceHtml}
        ${linkHtml}
      </article>
    `;
  }

  function renderNews(category) {
    const list = document.getElementById("news-list");
    const filtered =
      category === "all"
        ? NEWS_DATA
        : NEWS_DATA.filter((n) => n.category === category);

    if (filtered.length === 0) {
      list.innerHTML =
        '<p class="news-list__empty">該当するニュースはありません。</p>';
      return;
    }

    list.innerHTML = filtered.map(createNewsCard).join("");
  }

  function initFilters() {
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderNews(btn.dataset.category);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initFilters();
    renderNews("all");
  });
})();
