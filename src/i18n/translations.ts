export type AppLang = "pt" | "en";

type Vars = Record<string, string | number | boolean | null | undefined>;
type DictValue = string | ((vars?: Vars) => string);
type Dict = Record<string, DictValue>;

export const translations: Record<AppLang, Dict> = {
  pt: {
    appTitle: "Ferramenta Profissional de Avaliação de Humidade e Infiltrações",
    appSubtitle: "Ferramenta Profissional de Avaliação de Humidade e Infiltrações",

    loadingPortuguese: (v) =>
      typeof v?.done === "number" && typeof v?.total === "number" && v.total > 0
        ? `A carregar Português… (${v.done}/${v.total})`
        : "A carregar Português…",
    portugueseTranslationFailed: "Falha ao carregar Português. Tente novamente.",

    surveyComplete: "Inquérito concluído",
    surveyCompletePct: "100% concluído",
    sectionOfTotal: (v) => `Secção ${v?.current} de ${v?.total}`,
    pctComplete: (v) => `${v?.pct}% concluído`,
    progressAriaLabel: "Progresso",

    goToSection: (v) => `Ir para a secção ${v?.n}`,
    sectionPlain: (v) => `Secção ${v?.n}`,
    sectionPill: (v) => `Secção ${String(v?.n ?? "").padStart(2, "0")}`,

    back: "← Voltar",
    next: "Seguinte →",
    completeSurvey: "Concluir inquérito ✓",

    reviewTitle: "Inquérito concluído — Revisão por IA",
    reviewIntro:
      "A gerar uma análise abrangente com base nos dados do seu inquérito de 13 secções...",
    analysingSurveyData: "A analisar os dados do inquérito...",
    readyHeading: "Pronto",
    readyBody:
      "Clique em **Gerar revisão completa por IA** para executar a análise.",
    generateFullAiReview: "Gerar revisão completa por IA",
    startNewSurvey: "Iniciar novo inquérito",
    errorHeading: "Erro",

    sectionPhotoAndAiCheck: "Fotografia da Secção & Verificação por IA",
    sectionPhotoAndAiCheckSub:
      "Anexe uma fotografia desta secção para obter uma revisão por IA focada em humidade e legendas prontas para o relatório.",
    attachPhoto: "Anexar fotografia",
    reanalyse: "Reanalisar",
    clearPhoto: "Limpar fotografia",
    sectionPhotoAlt: (v) => `Fotografia da ${v?.section}`,
    analysingPhoto: "A analisar a fotografia desta secção...",
    errorLabel: "ERRO",
    parsingNote: "NOTA DE PROCESSAMENTO",
    descriptionLabel: "DESCRIÇÃO",
    diagnosisLabel: "DIAGNOSTICO",
    relevanceLabel: "RELEVÂNCIA",
    severityIndicatorLabel: "SEVERIDADE",
    issuesLabel: "PROBLEMAS / INCONSISTÊNCIAS",
    improvementsLabel: "MELHORIAS",
    captionsLabel: "LEGENDAS",
    rawResponseLabel: "RESPOSTA BRUTA",
    statusLabel: "ESTADO",
    attachToBegin: "Anexe uma fotografia para iniciar a análise desta secção.",

    rejectionTitle: "⚠️ Esta imagem nao esta relacionada com esta secao do inquerito",
    rejectionHelp: (v) =>
      `Esta imagem nao esta relacionada com ${String(v?.subject ?? "")}. Consulte o guia "O que fotografar" acima para tipos de fotografia aceites.`,

    // Photo guidance panel
    photoGuideTitle: "O que fotografar",
    photoGuideShow: "Mostrar guia",
    photoGuideHide: "Ocultar guia",
    photoGuideAcceptedHeading: "FOTOGRAFIAS ACEITES",
    photoGuideNotAcceptedHeading: "NÃO ACEITES",
    photoGuideTipHeading: "DICA DO FOTOGRAFISTA",

    rateLimitReachedRetryIn: (v) => `Limite de taxa atingido. Tente novamente em ${v?.secs}s.`,
    rateLimitRetrying: (v) =>
      `Limite de taxa atingido. A tentar novamente automaticamente em ${v?.secs}s...`,
    unexpectedImageError: "Erro inesperado ao analisar a imagem.",
    failedToGenerateReview: "Falha ao gerar a revisão.",
    unableToGenerateReviewTryAgain: "Não foi possível gerar a revisão. Tente novamente.",
    unknownError: "Erro desconhecido",

    noAnswersProvidedYet: "Ainda não foram fornecidas respostas.",
  },

  en: {
    appTitle: "Professional Moisture & Damp Assessment Tool",
    appSubtitle: "Professional Moisture & Damp Assessment Tool",

    loadingPortuguese: (v) =>
      typeof v?.done === "number" && typeof v?.total === "number" && v.total > 0
        ? `Loading Portuguese… (${v.done}/${v.total})`
        : "Loading Portuguese…",
    portugueseTranslationFailed: "Portuguese translation failed. Please try again.",

    surveyComplete: "Survey Complete",
    surveyCompletePct: "100% complete",
    sectionOfTotal: (v) => `Section ${v?.current} of ${v?.total}`,
    pctComplete: (v) => `${v?.pct}% complete`,
    progressAriaLabel: "Progress",

    goToSection: (v) => `Go to section ${v?.n}`,
    sectionPlain: (v) => `Section ${v?.n}`,
    sectionPill: (v) => `Section ${String(v?.n ?? "").padStart(2, "0")}`,

    back: "← Back",
    next: "Next →",
    completeSurvey: "Complete Survey ✓",

    reviewTitle: "Survey Complete — AI Review",
    reviewIntro:
      "Generating a comprehensive analysis based on your 13-section survey data...",
    analysingSurveyData: "Analysing survey data...",
    readyHeading: "Ready",
    readyBody: "Click **Generate Full AI Review** to run the analysis.",
    generateFullAiReview: "Generate Full AI Review",
    startNewSurvey: "Start New Survey",
    errorHeading: "Error",

    sectionPhotoAndAiCheck: "Section Photo & AI Check",
    sectionPhotoAndAiCheckSub:
      "Attach a photo for this section to get a damp-focused AI review and report-ready captions.",
    attachPhoto: "Attach Photo",
    reanalyse: "Re-analyse",
    clearPhoto: "Clear photo",
    sectionPhotoAlt: (v) => `${v?.section} photo`,
    analysingPhoto: "Analysing photo for this section...",
    errorLabel: "ERROR",
    parsingNote: "PARSING NOTE",
    descriptionLabel: "DESCRIPTION",
    diagnosisLabel: "DIAGNOSIS",
    relevanceLabel: "RELEVANCE",
    severityIndicatorLabel: "SEVERITY",
    issuesLabel: "ISSUES / MISMATCHES",
    improvementsLabel: "IMPROVEMENTS",
    captionsLabel: "CAPTIONS",
    rawResponseLabel: "RAW RESPONSE",
    statusLabel: "STATUS",
    attachToBegin: "Attach a photo to begin analysis for this section.",

    rejectionTitle: "⚠️ This image is not related to this survey section",
    rejectionHelp: (v) =>
      `This image is not related to ${String(v?.subject ?? "")}. See the 'What to photograph' guide above for accepted photo types.`,

    // Photo guidance panel
    photoGuideTitle: "What to photograph",
    photoGuideShow: "Show guide",
    photoGuideHide: "Hide guide",
    photoGuideAcceptedHeading: "ACCEPTED PHOTOS",
    photoGuideNotAcceptedHeading: "NOT ACCEPTED",
    photoGuideTipHeading: "PHOTOGRAPHER TIP",

    rateLimitReachedRetryIn: (v) => `Rate limit reached. Please retry in ${v?.secs}s.`,
    rateLimitRetrying: (v) =>
      `Rate limit reached. Retrying automatically in ${v?.secs}s...`,
    unexpectedImageError: "Unexpected error analysing image.",
    failedToGenerateReview: "Failed to generate review.",
    unableToGenerateReviewTryAgain: "Unable to generate review. Please try again.",
    unknownError: "Unknown error",

    noAnswersProvidedYet: "No answers provided yet.",
  },
};

export const DEFAULT_LANG: AppLang = "pt";
export const STORAGE_LANG_KEY = "ds_lang";
