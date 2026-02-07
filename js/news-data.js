/**
 * ニュースデータ
 *
 * 新しいニュースを追加するには、配列の先頭にオブジェクトを追加してください。
 *
 * フォーマット:
 * {
 *   id: <ユニークなID>,
 *   date: "YYYY-MM-DD",
 *   category: "release" | "tips" | "update" | "event",
 *   title: "タイトル",
 *   body: "本文",
 *   link: "https://..." (任意)
 * }
 */
const NEWS_DATA = [
  {
    id: 7,
    date: "2026-02-07",
    category: "release",
    title: "Claud Code Skills ニュースページ公開",
    body: "Claud Code Skillsのニュース蓄積ページを公開しました。リリース情報、Tips、アップデート、イベントなどのカテゴリ別にニュースを閲覧できます。",
    link: ""
  },
  {
    id: 6,
    date: "2026-02-05",
    category: "tips",
    title: "Claude Code でのマルチファイル編集のコツ",
    body: "複数ファイルを同時に編集する際のベストプラクティスを紹介します。並列ツール呼び出しを活用することで、効率的にコードベース全体を変更できます。",
    link: ""
  },
  {
    id: 5,
    date: "2026-02-03",
    category: "update",
    title: "Opus 4.6 モデル対応",
    body: "最新のClaude Opus 4.6モデルに対応しました。より高精度なコード生成と理解が可能になっています。",
    link: ""
  },
  {
    id: 4,
    date: "2026-01-28",
    category: "tips",
    title: "効果的なプロンプトの書き方",
    body: "Claude Codeに対して明確で具体的な指示を出すことで、より正確な結果が得られます。コンテキストの提供と期待する出力形式の指定が鍵です。",
    link: ""
  },
  {
    id: 3,
    date: "2026-01-20",
    category: "event",
    title: "Claude Code ハンズオンセミナー開催",
    body: "Claude Codeの実践的な活用方法を学ぶハンズオンセミナーを開催します。初心者から上級者まで参加可能です。",
    link: ""
  },
  {
    id: 2,
    date: "2026-01-15",
    category: "update",
    title: "MCPサーバー連携機能の改善",
    body: "MCPサーバーとの連携がよりスムーズになりました。外部ツールとのインテグレーションが容易に行えます。",
    link: ""
  },
  {
    id: 1,
    date: "2026-01-10",
    category: "release",
    title: "Claude Code CLI v2.0 リリース",
    body: "Claude Code CLIの新バージョンがリリースされました。パフォーマンスの大幅な改善と新しいスキル機能が追加されています。",
    link: ""
  }
];
