#!/bin/bash
# Notion自動転記スクリプト — タレントプールサービス調査
# 使い方: bash scripts/notion-sync.sh

NOTION_TOKEN="${NOTION_INTERNAL_INTEGRATION_TOKEN:?環境変数 NOTION_INTERNAL_INTEGRATION_TOKEN を設定してください}"
NOTION_VERSION="2022-06-28"
PAGE_ID="300b2ff88d6b80e09ac9e9d0e97d9125"

# 1. データベース作成
echo ">>> Notionにデータベースを作成中..."
DB_RESPONSE=$(curl -s -X POST "https://api.notion.com/v1/databases" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: $NOTION_VERSION" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": { "type": "page_id", "page_id": "'"$PAGE_ID"'" },
    "title": [{ "type": "text", "text": { "content": "最新業界ニュースDB" } }],
    "properties": {
      "タイトル": { "title": {} },
      "日付": { "date": {} },
      "URL": { "url": {} },
      "要約": { "rich_text": {} },
      "BizDev分析": { "rich_text": {} },
      "カテゴリ": {
        "select": {
          "options": [
            { "name": "市場規模", "color": "blue" },
            { "name": "競合分析", "color": "green" },
            { "name": "Indeed/リクルート", "color": "orange" },
            { "name": "国内市場", "color": "purple" },
            { "name": "AI動向", "color": "red" }
          ]
        }
      }
    }
  }')

DB_ID=$(echo "$DB_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$DB_ID" ]; then
  echo "ERROR: データベース作成に失敗しました"
  echo "$DB_RESPONSE"
  exit 1
fi

echo ">>> データベース作成成功: $DB_ID"

# 2. レコード追加関数
add_record() {
  local title="$1"
  local date="$2"
  local url="$3"
  local summary="$4"
  local bizdev="$5"
  local category="$6"

  local url_prop="null"
  if [ -n "$url" ]; then
    url_prop="\"$url\""
  fi

  curl -s -X POST "https://api.notion.com/v1/pages" \
    -H "Authorization: Bearer $NOTION_TOKEN" \
    -H "Notion-Version: $NOTION_VERSION" \
    -H "Content-Type: application/json" \
    -d '{
      "parent": { "database_id": "'"$DB_ID"'" },
      "properties": {
        "タイトル": { "title": [{ "text": { "content": "'"$title"'" } }] },
        "日付": { "date": { "start": "'"$date"'" } },
        "URL": { "url": '"$url_prop"' },
        "要約": { "rich_text": [{ "text": { "content": "'"$summary"'" } }] },
        "BizDev分析": { "rich_text": [{ "text": { "content": "'"$bizdev"'" } }] },
        "カテゴリ": { "select": { "name": "'"$category"'" } }
      }
    }' > /dev/null

  echo "  + $title"
}

# 3. データ投入
echo ">>> レコードを追加中..."

add_record \
  "タレントマネジメントソフトウェア市場: グローバル$103〜123億 (2025)" \
  "2026-02-10" \
  "https://www.fortunebusinessinsights.com/industry-reports/talent-management-software-market-100374" \
  "グローバル市場規模$103〜123億。2031-2034年に$250〜385億へ成長予測(CAGR 12.0〜12.5%)。クラウド型が71%シェア。北米34%、アジア太平洋が最速成長。" \
  "チャンス: AI搭載タレント管理の需要急拡大。年12%成長の市場に参入余地あり" \
  "市場規模"

add_record \
  "日本タレントマネジメントシステム市場: SaaS型3,086億円 (2025)" \
  "2026-02-10" \
  "https://boxil.jp/mag/a8623/" \
  "日本SaaS型TMS市場は2023年1,925億円→2025年3,086億円。カオナビがシェア1位(8.86%)、ミイダス2位(8.29%)、SmartHR 3位(7.59%)。TOP7で50%占有。" \
  "チャンス: 国内市場は分散しており、AI差別化で上位シェア獲得の可能性" \
  "国内市場"

add_record \
  "Nucleus Research 2025: Eightfold・iCIMSがLeader評価" \
  "2025-10-01" \
  "https://www.prnewswire.com/news-releases/nucleus-research-releases-2025-standalone-talent-acquisition-technology-value-matrix-302583221.html" \
  "Nucleus Research 2025 Value MatrixでEightfold・iCIMSがLeader。PhenomはExpert評価。AI精度とエンタープライズ信頼性が評価軸。LinkedIn(Microsoft)がTA市場シェア27.3%で圧倒的。" \
  "リスク: AI特化ベンダー(Eightfold等)の台頭で、既存サービスの差別化が困難に" \
  "競合分析"

add_record \
  "Indeed FutureWorks 2025: AI採用ツール群を大規模発表" \
  "2025-10-30" \
  "https://recruit-holdings.com/ja/blog/post_20251030_0001/" \
  "Career Scout・Talent Scout・ガクチカAIアシスタントを発表。3.4億件プロフィールからAI人材発掘。応募書類作成が2時間→6分に短縮。日本ローンチは未定。" \
  "チャンス: Indeed AI未上陸の空白期間に国内独自ソリューションを展開する余地あり" \
  "Indeed/リクルート"

add_record \
  "リクルートHD出木場社長: AI面接自動化を推進" \
  "2025-12-16" \
  "https://www.bloomberg.com/jp/news/articles/2025-12-16/T73E73KGCTFY00" \
  "AIエージェントで採用プロセス全体を自動化する方針を表明。Indeed Talent Scoutで一次面接まで代行。採用の量→質への転換が加速。" \
  "リスク: 従来の人材紹介・求人メディアのビジネスモデルが根本から変革される可能性" \
  "Indeed/リクルート"

add_record \
  "国内タレントプール専用サービス: MyTalent・TalentCloud等が成長" \
  "2026-02-10" \
  "https://www.aspicjapan.org/asu/article/70660" \
  "MyTalent(TalentX)はTOYOTA・amazon・LINE等が利用。TalentCloudは候補者10倍増の実績。HRMOS採用はビズリーチ連携で自動蓄積。aloop(パソナ×rakumo)はアルムナイ一元管理。" \
  "チャンス: 国産サービスのAI高度化が急務。スキルベース採用への対応が差別化の鍵" \
  "国内市場"

add_record \
  "AI採用市場: HR部門のAI導入率が72%に到達 (2025)" \
  "2025-12-01" \
  "https://www.gminsights.com/industry-analysis/talent-acquisition-software-market" \
  "HR部門のAI導入率が2024年Q1の58%→2025年72%に急増。スキルベース採用が主流化。エージェント型AIが反復業務を自動化し、採用担当者は関係構築に集中。" \
  "チャンス: AIエージェント×タレントプールの組み合わせが次の成長領域" \
  "AI動向"

echo ""
echo "=== 完了! ==="
echo "Notionページを確認してください: https://www.notion.so/Claud-Code-Skills-300b2ff88d6b80e09ac9e9d0e97d9125"
