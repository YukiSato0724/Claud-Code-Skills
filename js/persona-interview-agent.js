/**
 * ペルソナインタビューエージェント
 * キーワードを元に自動調査→仮説立案→ペルソナ生成→インタビュー→インサイト抽出
 */
(function () {
  "use strict";

  // --- 設定 ---
  var CONFIG = {
    apiUrl: "https://api.anthropic.com/v1/messages",
    apiVersion: "2023-06-01",
    maxTokens: {
      research: 4096,
      hypotheses: 4096,
      personas: 4096,
      interview: 8192,
      insights: 4096,
    },
  };

  // --- フェーズ定義 ---
  var PHASES = [
    { id: "research", name: "リサーチ", badge: "phase1" },
    { id: "hypotheses", name: "仮説立案", badge: "phase2" },
    { id: "personas", name: "ペルソナ生成", badge: "phase3" },
    { id: "interviews", name: "デプスインタビュー", badge: "phase4" },
    { id: "insights", name: "インサイト抽出", badge: "phase5" },
  ];

  // --- 状態管理 ---
  var state = {
    apiKey: "",
    model: "claude-sonnet-4-20250514",
    keyword: "",
    currentPhase: -1,
    isRunning: false,
    abortController: null,
    results: {
      research: "",
      hypotheses: "",
      personas: "",
      interviews: ["", "", ""],
      insights: "",
    },
  };

  // --- DOM要素 ---
  var dom = {};

  // --- 初期化 ---
  function init() {
    dom.apiKeyInput = document.getElementById("api-key");
    dom.modelSelect = document.getElementById("model-select");
    dom.keywordInput = document.getElementById("keyword");
    dom.startBtn = document.getElementById("start-btn");
    dom.stopBtn = document.getElementById("stop-btn");
    dom.stepper = document.getElementById("stepper");
    dom.results = document.getElementById("results");

    // LocalStorageからAPIキーを復元
    var savedKey = localStorage.getItem("persona-agent-api-key");
    if (savedKey) {
      dom.apiKeyInput.value = savedKey;
    }

    dom.startBtn.addEventListener("click", handleStart);
    dom.stopBtn.addEventListener("click", handleStop);

    // Enterキーで開始
    dom.keywordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !state.isRunning) {
        handleStart();
      }
    });
  }

  // --- イベントハンドラ ---
  function handleStart() {
    var apiKey = dom.apiKeyInput.value.trim();
    var keyword = dom.keywordInput.value.trim();
    var model = dom.modelSelect.value;

    if (!apiKey) {
      showError("APIキーを入力してください。");
      return;
    }
    if (!keyword) {
      showError("調査キーワードを入力してください。");
      return;
    }

    // APIキーをLocalStorageに保存
    localStorage.setItem("persona-agent-api-key", apiKey);

    state.apiKey = apiKey;
    state.model = model;
    state.keyword = keyword;
    state.isRunning = true;
    state.currentPhase = -1;
    state.results = {
      research: "",
      hypotheses: "",
      personas: "",
      interviews: ["", "", ""],
      insights: "",
    };

    dom.startBtn.disabled = true;
    dom.stopBtn.style.display = "inline-block";
    dom.stepper.style.display = "flex";
    dom.results.innerHTML = "";

    runAgent();
  }

  function handleStop() {
    if (state.abortController) {
      state.abortController.abort();
    }
    state.isRunning = false;
    dom.startBtn.disabled = false;
    dom.stopBtn.style.display = "none";
  }

  // --- エラー表示 ---
  function showError(message) {
    var existing = document.querySelector(".error-message");
    if (existing) existing.remove();

    var el = document.createElement("div");
    el.className = "error-message";
    el.textContent = message;
    dom.results.prepend(el);

    setTimeout(function () {
      if (el.parentNode) el.remove();
    }, 8000);
  }

  // --- Stepper更新 ---
  function updateStepper(activePhase) {
    var steps = dom.stepper.querySelectorAll(".stepper__step");
    steps.forEach(function (step, i) {
      step.classList.remove("active", "completed");
      if (i < activePhase) {
        step.classList.add("completed");
      } else if (i === activePhase) {
        step.classList.add("active");
      }
    });
  }

  // --- フェーズカード作成 ---
  function createPhaseCard(phaseIndex, expanded) {
    var phase = PHASES[phaseIndex];
    var card = document.createElement("div");
    card.className = "phase-card" + (expanded ? " expanded" : "");
    card.id = "phase-card-" + phase.id;

    card.innerHTML =
      '<div class="phase-card__header">' +
      '  <div class="phase-card__header-left">' +
      '    <span class="phase-card__badge phase-card__badge--' +
      phase.badge +
      '">' +
      "Phase " +
      (phaseIndex + 1) +
      "</span>" +
      '    <span class="phase-card__title">' +
      phase.name +
      "</span>" +
      "  </div>" +
      '  <span class="phase-card__toggle">&#9660;</span>' +
      "</div>" +
      '<div class="phase-card__body">' +
      '  <div class="phase-card__loading">' +
      '    <div class="spinner"></div>' +
      "    <span>生成中...</span>" +
      "  </div>" +
      "</div>";

    card.querySelector(".phase-card__header").addEventListener(
      "click",
      function () {
        card.classList.toggle("expanded");
      }
    );

    dom.results.appendChild(card);
    return card;
  }

  // --- フェーズカードにコンテンツを設定 ---
  function setPhaseContent(phaseId, html) {
    var card = document.getElementById("phase-card-" + phaseId);
    if (!card) return;
    var body = card.querySelector(".phase-card__body");
    body.innerHTML = '<div class="md-content">' + html + "</div>";
  }

  // --- フェーズカードにストリーミングコンテンツを更新 ---
  function updatePhaseStreaming(phaseId, markdownText) {
    var card = document.getElementById("phase-card-" + phaseId);
    if (!card) return;
    var body = card.querySelector(".phase-card__body");
    var html = renderMarkdown(markdownText);
    body.innerHTML = '<div class="md-content">' + html + "</div>";
  }

  // --- インタビュータブ作成 ---
  function createInterviewTabs(card) {
    var body = card.querySelector(".phase-card__body");
    body.innerHTML =
      '<div class="interview-tabs" id="interview-tabs">' +
      '  <button class="interview-tab active" data-tab="0">ペルソナ 1</button>' +
      '  <button class="interview-tab" data-tab="1">ペルソナ 2</button>' +
      '  <button class="interview-tab" data-tab="2">ペルソナ 3</button>' +
      "</div>" +
      '<div class="interview-panels">' +
      '  <div class="interview-panel active" id="interview-panel-0">' +
      '    <div class="phase-card__loading"><div class="spinner"></div><span>待機中...</span></div>' +
      "  </div>" +
      '  <div class="interview-panel" id="interview-panel-1">' +
      '    <div class="phase-card__loading"><div class="spinner"></div><span>待機中...</span></div>' +
      "  </div>" +
      '  <div class="interview-panel" id="interview-panel-2">' +
      '    <div class="phase-card__loading"><div class="spinner"></div><span>待機中...</span></div>' +
      "  </div>" +
      "</div>";

    var tabs = body.querySelectorAll(".interview-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.remove("active");
        });
        body.querySelectorAll(".interview-panel").forEach(function (p) {
          p.classList.remove("active");
        });
        tab.classList.add("active");
        document
          .getElementById("interview-panel-" + tab.dataset.tab)
          .classList.add("active");
      });
    });
  }

  // --- インタビューパネル更新 ---
  function updateInterviewPanel(index, markdownText, isStreaming) {
    var panel = document.getElementById("interview-panel-" + index);
    if (!panel) return;
    if (isStreaming) {
      panel.innerHTML =
        '<div class="md-content">' + renderMarkdown(markdownText) + "</div>";
    } else {
      panel.innerHTML =
        '<div class="md-content">' + renderMarkdown(markdownText) + "</div>";
    }
  }

  function setInterviewLoading(index) {
    var panel = document.getElementById("interview-panel-" + index);
    if (!panel) return;
    panel.innerHTML =
      '<div class="phase-card__loading"><div class="spinner"></div><span>インタビュー実施中...</span></div>';

    // タブをアクティブにする
    var tabs = document.querySelectorAll(".interview-tab");
    var panels = document.querySelectorAll(".interview-panel");
    tabs.forEach(function (t) {
      t.classList.remove("active");
    });
    panels.forEach(function (p) {
      p.classList.remove("active");
    });
    tabs[index].classList.add("active");
    document
      .getElementById("interview-panel-" + index)
      .classList.add("active");
  }

  // --- 完了時に前のカードを畳む ---
  function collapseCard(phaseId) {
    var card = document.getElementById("phase-card-" + phaseId);
    if (card) {
      card.classList.remove("expanded");
    }
  }

  // --- Markdown レンダリング ---
  function renderMarkdown(text) {
    if (!text) return "";
    if (typeof marked !== "undefined" && marked.parse) {
      return marked.parse(text);
    }
    // フォールバック: 基本的なHTMLエスケープとpre-wrap
    return (
      '<pre style="white-space:pre-wrap;font-family:inherit;font-size:0.92rem;line-height:1.75">' +
      escapeHtml(text) +
      "</pre>"
    );
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // --- Claude API呼び出し (ストリーミング) ---
  async function callClaude(systemPrompt, userMessage, maxTokens, onChunk) {
    state.abortController = new AbortController();

    var response = await fetch(CONFIG.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": state.apiKey,
        "anthropic-version": CONFIG.apiVersion,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: state.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        stream: true,
      }),
      signal: state.abortController.signal,
    });

    if (!response.ok) {
      var errorBody = await response.text();
      throw new Error("API Error (" + response.status + "): " + errorBody);
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var fullText = "";
    var buffer = "";

    while (true) {
      var result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });

      while (buffer.indexOf("\n") !== -1) {
        var newlineIdx = buffer.indexOf("\n");
        var line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            var data = JSON.parse(line.slice(6));
            if (
              data.type === "content_block_delta" &&
              data.delta &&
              data.delta.type === "text_delta"
            ) {
              fullText += data.delta.text;
              if (onChunk) onChunk(fullText);
            }
          } catch (e) {
            // パース不可能な行はスキップ
          }
        }
      }
    }

    return fullText;
  }

  // --- プロンプト定義 ---
  function getResearchPrompt(keyword) {
    return {
      system:
        "あなたは経験豊富なマーケットリサーチャーです。与えられたキーワードについて、包括的で深い調査レポートを作成してください。具体的なデータや事例を交えて分析してください。",
      user:
        '以下のキーワードについて、包括的な調査レポートを作成してください。\n\nキーワード: 「' +
        keyword +
        '」\n\n以下の構成で分析してください:\n\n## 1. 概要\nキーワードの定義と現在の市場における位置づけ\n\n## 2. 市場動向\n- 市場規模と成長性\n- 主要プレイヤーと競合状況\n- 最新トレンド\n\n## 3. ターゲットユーザー像\n- 主な利用者層（年齢、性別、職業、ライフスタイル）\n- 利用シーン・きっかけ\n- 購買・利用行動パターン\n\n## 4. ユーザーの課題・ペインポイント\n- 顕在的な課題\n- 潜在的な不満やフラストレーション\n- 未充足のニーズ\n\n## 5. 社会的・文化的背景\n- 関連する社会トレンド\n- 価値観の変化\n- テクノロジーの影響',
    };
  }

  function getHypothesesPrompt(keyword, research) {
    return {
      system:
        "あなたは経験豊富なUXリサーチャーです。リサーチ結果を深く分析し、ユーザーインタビューで検証すべき鋭い仮説を立案してください。",
      user:
        '以下のリサーチ結果を元に、「' +
        keyword +
        '」に関するユーザーインタビューで検証すべき仮説を5つ立案してください。\n\n## リサーチ結果\n' +
        research +
        "\n\n---\n\n各仮説は以下の形式で記述してください:\n\n### 仮説N: [仮説タイトル]\n- **仮説文**: 「〜は〜だろう」という形式の検証可能な仮説\n- **背景・根拠**: なぜこの仮説を立てるに至ったか\n- **検証ポイント**: インタビューで確認すべき具体的な質問や観点\n- **想定されるインパクト**: この仮説が正しかった場合のビジネスへの示唆\n\n多様な観点（行動面、感情面、価値観、社会的要因、未充足ニーズ）から仮説を立ててください。表面的ではなく、深層心理や隠れたニーズに迫る仮説を含めてください。",
    };
  }

  function getPersonasPrompt(keyword, research, hypotheses) {
    return {
      system:
        "あなたは経験豊富なUXリサーチャーです。リサーチ結果と仮説に基づき、リアリティのある詳細なペルソナを作成してください。各ペルソナは実在しそうな具体的な人物像として描写してください。",
      user:
        '以下の情報に基づいて、「' +
        keyword +
        '」に関する3人の詳細なペルソナを作成してください。\n\n## リサーチ結果（要約）\n' +
        research +
        "\n\n## 仮説\n" +
        hypotheses +
        "\n\n---\n\n各ペルソナは以下の情報を含めてください:\n\n## ペルソナN: [名前]\n- **基本情報**: 年齢、性別、職業、居住地、家族構成、年収帯\n- **パーソナリティ**: 性格特性（ビッグファイブ的観点）、価値観\n- **ライフスタイル**: 典型的な一日の過ごし方、趣味、関心事\n- **「" +
        keyword +
        '」との関わり**: 現在の利用状況・関心度、きっかけ、頻度、関連する行動\n- **課題・ペインポイント**: 具体的な不満、困りごと、フラストレーション\n- **ニーズ・願望**: 顕在的ニーズと潜在的ニーズ\n- **情報源**: 普段利用するメディア、SNS、情報収集方法\n- **代表的な発言**: この人物が日常で言いそうなセリフを3つ（「」で記載）\n\n3人のペルソナは、異なるセグメント・利用状況・ニーズを代表するように多様性を持たせてください。ステレオタイプを避け、矛盾や複雑さを含むリアルな人物像にしてください。',
    };
  }

  function getInterviewPrompt(keyword, personas, personaIndex) {
    return {
      system:
        "あなたは熟練したデプスインタビュアーです。対象者の深層心理を引き出す技術に長けています。以下の技法を駆使してインタビューを実施してください:\n\n- **ラダリング法**: 「なぜ？」を繰り返し、表層的な回答から深層の価値観へと掘り下げる\n- **クリティカルインシデント法**: 具体的なエピソードや体験を詳しく語ってもらう\n- **投影法**: 「あなたの友人だったら…」「もし理想の世界があったら…」と第三者視点で語らせる\n- **感情マッピング**: 体験における感情の起伏を丁寧に追跡する\n\nインタビュイーの回答にはためらい、言い直し、感嘆、沈黙（「...」）など、リアルな人間らしさを含めてください。インタビュアーは相槌や共感を適切に挟み、自然な会話の流れを作ってください。",
      user:
        '以下のペルソナ情報をもとに、ペルソナ' +
        (personaIndex + 1) +
        "の人物に対して「" +
        keyword +
        '」をテーマとしたデプスインタビューをシミュレーションしてください。\n\n## ペルソナ一覧\n' +
        personas +
        "\n\n---\n\n**対象**: ペルソナ" +
        (personaIndex + 1) +
        "（上記の" +
        (personaIndex + 1) +
        "人目）\n\n## インタビューの流れ\n1. **導入**（2-3往復）: ラポール構築、日常的な話題からスタート\n2. **行動の把握**（3-4往復）: 具体的な行動パターン、利用状況の把握\n3. **深掘り**（4-5往復）: 行動の背景にある動機・感情の探索、具体的エピソードの引き出し\n4. **価値観の探索**（3-4往復）: より深い価値観やニーズへのアプローチ\n5. **まとめ**（1-2往復）: 全体の振り返りと追加コメント\n\n## 出力形式\n\n**インタビュアー**: [質問・発言]\n\n**[ペルソナの名前]**: [回答]\n\nという形式で、最低15往復の自然な対話を再現してください。",
    };
  }

  function getInsightsPrompt(keyword, research, hypotheses, interviews) {
    return {
      system:
        "あなたは経験豊富なUXリサーチャー兼ストラテジストです。複数のデプスインタビュー結果を横断的に分析し、実用的なインサイトを抽出してください。",
      user:
        '以下の3件のデプスインタビュー結果を分析し、「' +
        keyword +
        '」に関する重要なインサイトを抽出してください。\n\n## 当初の仮説\n' +
        hypotheses +
        "\n\n## インタビュー結果\n\n### ペルソナ1のインタビュー\n" +
        interviews[0] +
        "\n\n### ペルソナ2のインタビュー\n" +
        interviews[1] +
        "\n\n### ペルソナ3のインタビュー\n" +
        interviews[2] +
        "\n\n---\n\n以下の構成でインサイトをまとめてください:\n\n## 1. 主要インサイト\n3人のインタビューから得られた最も重要なインサイトを5つ、優先度順に記述。各インサイトには具体的な発言や行動の根拠を付記。\n\n## 2. 共通パターン\n3人に共通して見られた行動パターン、ニーズ、課題\n\n## 3. 意外な発見\n事前の仮説では想定していなかった意外な発見やユニークな視点\n\n## 4. 仮説の検証結果\n当初の5つの仮説それぞれについて、インタビューでどの程度支持されたかを評価（支持/部分的支持/不支持）\n\n## 5. ユーザーニーズの構造化\n- **機能的ニーズ**: 実用的・機能的な要望\n- **感情的ニーズ**: 気持ち・感情に関する要望\n- **社会的ニーズ**: 他者との関係における要望\n\n## 6. アクション提案\nリサーチ結果に基づく具体的なアクション提案（5つ）\n\n## 7. 今後のリサーチ課題\nさらに調査が必要な領域や追加で検証すべき仮説",
    };
  }

  // --- エージェント実行 ---
  async function runAgent() {
    try {
      // Phase 1: リサーチ
      await runPhase(0, async function () {
        var prompt = getResearchPrompt(state.keyword);
        state.results.research = await callClaude(
          prompt.system,
          prompt.user,
          CONFIG.maxTokens.research,
          function (text) {
            updatePhaseStreaming("research", text);
          }
        );
      });
      if (!state.isRunning) return;

      // Phase 2: 仮説立案
      await runPhase(1, async function () {
        var prompt = getHypothesesPrompt(
          state.keyword,
          state.results.research
        );
        state.results.hypotheses = await callClaude(
          prompt.system,
          prompt.user,
          CONFIG.maxTokens.hypotheses,
          function (text) {
            updatePhaseStreaming("hypotheses", text);
          }
        );
      });
      if (!state.isRunning) return;

      // Phase 3: ペルソナ生成
      await runPhase(2, async function () {
        var prompt = getPersonasPrompt(
          state.keyword,
          state.results.research,
          state.results.hypotheses
        );
        state.results.personas = await callClaude(
          prompt.system,
          prompt.user,
          CONFIG.maxTokens.personas,
          function (text) {
            updatePhaseStreaming("personas", text);
          }
        );
      });
      if (!state.isRunning) return;

      // Phase 4: インタビュー（3人分）
      await runPhase(3, async function () {
        var card = document.getElementById("phase-card-interviews");
        createInterviewTabs(card);

        for (var i = 0; i < 3; i++) {
          if (!state.isRunning) return;
          setInterviewLoading(i);
          var idx = i;
          var prompt = getInterviewPrompt(
            state.keyword,
            state.results.personas,
            idx
          );
          state.results.interviews[idx] = await callClaude(
            prompt.system,
            prompt.user,
            CONFIG.maxTokens.interview,
            (function (capturedIdx) {
              return function (text) {
                updateInterviewPanel(capturedIdx, text, true);
              };
            })(idx)
          );
        }
      });
      if (!state.isRunning) return;

      // Phase 5: インサイト抽出
      await runPhase(4, async function () {
        var prompt = getInsightsPrompt(
          state.keyword,
          state.results.research,
          state.results.hypotheses,
          state.results.interviews
        );
        state.results.insights = await callClaude(
          prompt.system,
          prompt.user,
          CONFIG.maxTokens.insights,
          function (text) {
            updatePhaseStreaming("insights", text);
          }
        );
      });

      // 完了
      state.isRunning = false;
      dom.startBtn.disabled = false;
      dom.stopBtn.style.display = "none";
      updateStepper(5);
    } catch (err) {
      if (err.name === "AbortError") {
        showError("処理が中止されました。");
      } else {
        showError("エラーが発生しました: " + err.message);
      }
      state.isRunning = false;
      dom.startBtn.disabled = false;
      dom.stopBtn.style.display = "none";
    }
  }

  async function runPhase(phaseIndex, executor) {
    state.currentPhase = phaseIndex;
    updateStepper(phaseIndex);

    // 前のフェーズのカードを畳む
    if (phaseIndex > 0) {
      collapseCard(PHASES[phaseIndex - 1].id);
    }

    var card = createPhaseCard(phaseIndex, true);
    card.scrollIntoView({ behavior: "smooth", block: "start" });

    await executor();
  }

  // --- DOMContentLoaded ---
  document.addEventListener("DOMContentLoaded", init);
})();
