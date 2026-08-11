export type AppLocale = "ja" | "en";

const LOCALE_STORAGE_KEY = "launch-check-locale";

export function getStoredLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === "ja" ? "ja" : "en";
}

export function setStoredLocale(locale: AppLocale): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    window.document.documentElement.lang = locale;
  }
}

const japaneseIssueCopy: Record<
  string,
  { title: string; recommendation: string }
> = {
  "Page title is missing": {
    title: "ページタイトルがありません",
    recommendation: "ページ内容が伝わるタイトルを設定してください。",
  },
  "Page title length needs review": {
    title: "ページタイトルの長さを見直してください",
    recommendation: "検索結果で読みやすい長さに調整してください。",
  },
  "Meta description is missing": {
    title: "メタディスクリプションがありません",
    recommendation: "ページ内容を簡潔に説明する文章を設定してください。",
  },
  "Meta description length needs review": {
    title: "メタディスクリプションの長さを見直してください",
    recommendation: "検索結果で内容が伝わる長さに調整してください。",
  },
  "Canonical URL is missing": {
    title: "正規URLが設定されていません",
    recommendation: "canonicalタグで正規URLを指定してください。",
  },
  "Page is excluded from search results": {
    title: "検索結果から除外されています",
    recommendation:
      "意図した設定か確認し、必要であればnoindexを外してください。",
  },
  "Document language is not declared": {
    title: "ページの言語が指定されていません",
    recommendation: "html要素のlang属性を設定してください。",
  },
  "Main heading is missing": {
    title: "メイン見出しがありません",
    recommendation: "ページの主題を表すh1見出しを1つ設定してください。",
  },
  "Multiple main headings detected": {
    title: "メイン見出しが複数あります",
    recommendation: "ページの主題となるh1を1つに整理してください。",
  },
  "Images are missing alternative text": {
    title: "代替テキストのない画像があります",
    recommendation: "内容を持つ画像に分かりやすいalt属性を設定してください。",
  },
  "Form controls are not labeled": {
    title: "説明のない入力項目があります",
    recommendation: "入力欄やボタンにラベルを設定してください。",
  },
  "Links do not have accessible names": {
    title: "内容が分からないリンクがあります",
    recommendation: "リンクの目的が伝わるテキストかラベルを設定してください。",
  },
  "Mobile viewport configuration is missing": {
    title: "スマートフォン表示の設定がありません",
    recommendation: "viewportメタタグを設定してください。",
  },
  "Mixed content detected": {
    title: "安全でない通信が混在しています",
    recommendation: "HTTPで読み込んでいる素材をHTTPSへ変更してください。",
  },
  "Internal page is unavailable": {
    title: "開けない内部ページがあります",
    recommendation: "リンク先URLとページの公開状態を確認してください。",
  },
  "HTTP status error": {
    title: "ページがエラーを返しています",
    recommendation: "HTTPステータスとサーバー設定を確認してください。",
  },
  "Page runtime error": {
    title: "ページ内で実行エラーが発生しています",
    recommendation:
      "ブラウザのエラー内容を確認し、該当コードを修正してください。",
  },
  "Console error": {
    title: "ブラウザのコンソールにエラーがあります",
    recommendation:
      "コンソールの内容を確認し、原因となる処理を修正してください。",
  },
  "Failed request": {
    title: "読み込みに失敗したデータがあります",
    recommendation:
      "失敗したURL、サーバー応答、アクセス設定を確認してください。",
  },
};

export function localizeIssue(
  locale: AppLocale,
  issue: { title: string; detail: string; recommendation?: string },
): { title: string; detail: string; recommendation?: string } {
  if (locale !== "ja") {
    return issue;
  }

  const translated = japaneseIssueCopy[issue.title];
  return translated
    ? {
        ...issue,
        title: translated.title,
        recommendation: translated.recommendation,
      }
    : issue;
}
