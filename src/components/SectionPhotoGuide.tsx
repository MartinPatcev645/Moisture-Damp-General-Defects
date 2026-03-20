"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import type { PhotoGuideSceneCard } from "./SectionPhotoGuideScenes";
import { SECTION_SCENE_CARDS } from "./SectionPhotoGuideScenes";
import type { AppLang } from "@/i18n/translations";
import { ThumbBadge } from "@/components/ui/badge";

type SectionPhotoGuideEntry = {
  icon: string; // emoji
  accept: string[];
  reject: string[];
  tip: string;
};

// Index 0-12 map to Sections 1-13 (surveySteps uses 1-13 ids).
const SECTION_PHOTO_GUIDE_EN: SectionPhotoGuideEntry[] = [
  {
    icon: "🏠",
    accept: [
      "Exterior facade showing building type and height",
      "Street-level view with surrounding ground visible",
      "Site context — slope, drainage, proximity to water",
    ],
    reject: [
      "Interior rooms with no building structure",
      "Documents or drawings",
      "People or vehicles only",
    ],
    tip: "Stand back to fit at least 2 floors in frame. Include ground level.",
  },
  {
    icon: "🧱",
    accept: [
      "Wall surface close-up — brick, stone, render, block",
      "Window or door frame showing reveal depth and glazing",
      "Air brick or subfloor vent — blocked or clear",
      "Wall base showing DPC line or ground bridging",
    ],
    reject: [
      "Open rooms with no wall material visible",
      "Furniture or appliances only",
      "Distant exterior without material detail",
    ],
    tip: "Fill the frame with the surface. Oblique lighting reveals texture and defects.",
  },
  {
    icon: "💧",
    accept: [
      "Roof — tiles, slates, ridge, flashings, chimney",
      "Gutters and downpipes — joints, blockages, overflow marks",
      "External wall — cracked render, failed pointing, spalling",
      "Ground at wall base — soil raised above DPC, paving bridging",
    ],
    reject: [
      "Interior shots unconnected to external defect",
      "Objects or items with no building fabric",
      "People or vehicles",
    ],
    tip: "Photograph gutters during or just after rain for best evidence of overflow.",
  },
  {
    icon: "🦠",
    accept: [
      "Internal wall — lower section, upper section, or corner",
      "Ceiling — staining, mould, or plaster damage",
      "Floor and skirting junction",
      "Behind furniture — mould on wall surface",
    ],
    reject: [
      "Exterior shots in this interior section",
      "Objects or furniture with no wall/ceiling/floor visible",
      "Outdoor areas",
    ],
    tip: "Move furniture away from walls. Use a torch for dark corners.",
  },
  {
    icon: "📏",
    accept: [
      "Moisture meter on wall — show instrument display",
      "Thermal camera screen showing cold zones or anomalies",
      "Hygrometer or RH meter with visible reading",
      "Staining with scale reference — tape measure or card",
    ],
    reject: [
      "General room shots with no equipment or moisture visible",
      "Equipment in a bag or case, not in use",
      "Exterior shots without moisture evidence",
    ],
    tip: "Photograph the meter display and wall contact point in the same shot.",
  },
  {
    icon: "🌬️",
    accept: [
      "Extractor fan — kitchen, bathroom, trickle vent in frame",
      "Air brick — condition and clearance from ground",
      "Condensation on windows, cold pipes, or wall surfaces",
      "Humidity sources — drying laundry, steamy kitchen",
    ],
    reject: [
      "Outdoor landscape with no ventilation elements",
      "Documents or drawings",
      "People without ventilation context",
    ],
    tip: "Photograph bathroom fans up close to show if the grille is blocked.",
  },
  {
    icon: "🧩",
    accept: [
      "Tide marks on lower walls — horizontal banding",
      "Localised damp patch near window or roof junction",
      "Ceiling stain below bathroom or wet room",
      "Salt deposits at low level with tapered pattern",
    ],
    reject: [
      "Images with no visible moisture evidence",
      "Unrelated objects or outdoor areas",
      "Generic exterior shots without a defect",
    ],
    tip: "Photograph tide marks from floor level to capture full height and shape.",
  },
  {
    icon: "🪵",
    accept: [
      "Floorboards — surface, lifting, staining",
      "Skirting board — base condition, pulling from wall",
      "Lifted carpet or vinyl showing underlay or subfloor",
      "Exposed joist or structural timber — rot or fungal growth",
    ],
    reject: [
      "Walls only with no timber or floor material in frame",
      "Exterior shots without timber elements",
      "Equipment or objects only",
    ],
    tip: "Lift carpet corners at walls to show what is beneath. Include the wall junction.",
  },
  {
    icon: "🏗️",
    accept: [
      "Cracks in wall — show full vertical extent",
      "Diagonal cracking at window corners",
      "Stair-step cracking in brickwork",
      "Chimney stack — missing cap, staining, failed flashing",
    ],
    reject: [
      "Walls with no cracks or structural elements",
      "People or documents without building fabric",
      "Equipment only",
    ],
    tip: "Place a coin in frame to give crack width scale. Capture top to bottom.",
  },
  {
    icon: "🛠️",
    accept: [
      "Chemical DPC injection holes in mortar course",
      "Waterproof render or tanking — texture and condition",
      "Visible membrane edge at wall/floor junction",
      "Patched or re-pointed sections — colour contrast visible",
    ],
    reject: [
      "General room shots with no prior treatment visible",
      "Untouched new surfaces",
      "People, objects, or documents only",
    ],
    tip: "Look for colour or texture differences in pointing — these reveal past repairs.",
  },
  {
    icon: "⚠️",
    accept: [
      "Wide view of large mould coverage — capture full extent",
      "Extensive structural staining across multiple surfaces",
      "Ceiling collapse risk or floor pooling — full room view",
      "Any image showing total affected surface area",
    ],
    reject: [
      "Minor marks without clear defect",
      "People only or exterior with no defect",
      "Administrative documents",
    ],
    tip: "Step back and include a doorframe or furniture for scale.",
  },
  {
    icon: "🔎",
    accept: [
      "Moisture meter in contact with wall or floor surface",
      "Thermal camera operator photographing a surface",
      "Subfloor hatch opened for joist inspection",
      "Borescope in a drilled access hole",
    ],
    reject: [
      "Equipment packed away or in case — not in use",
      "Product shots with no building context",
      "People without equipment or building fabric",
    ],
    tip: "Capture the meter touching the surface and the display reading in one shot.",
  },
  {
    icon: "🛡️",
    accept: [
      "New DPC injection or membrane installation in progress",
      "Completed repointing — fresh mortar visible",
      "Installed extractor fan or ventilation unit",
      "Ground level lowered — cleared soil at wall base",
    ],
    reject: [
      "Guarantee documents or certificates",
      "Untouched surfaces with no remediation activity",
      "General exterior without remediation work",
    ],
    tip: "Photograph from the same angle as pre-work photos taken earlier in the survey.",
  },
];

const SECTION_PHOTO_GUIDE_PT: SectionPhotoGuideEntry[] = [
  {
    icon: "🏠",
    accept: [
      "Fachada exterior mostrando o tipo de edifício e a altura",
      "Vista ao nível da rua com o terreno envolvente visível",
      "Enquadramento do local — inclinação, drenagem, proximidade a água",
    ],
    reject: [
      "Interiores sem estrutura do edifício visível",
      "Documentos ou desenhos",
      "Pessoas ou veículos apenas",
    ],
    tip: "Recuar para enquadrar pelo menos 2 pisos. Incluir o nível do solo.",
  },
  {
    icon: "🧱",
    accept: [
      "Close-up da superfície da parede — tijolo, pedra, reboco, bloco",
      "Caixilho de janela ou porta mostrando a profundidade da ombreira e o vidro",
      "Tijolo de ventilação (air brick) ou respiro do subpavimento — com obstrução ou livre",
      "Base da parede mostrando a linha do DPC ou a ponte ao nível do solo",
    ],
    reject: [
      "Salas abertas sem material de parede visível",
      "Apenas mobiliário ou eletrodomésticos",
      "Exterior distante sem detalhe do material",
    ],
    tip: "Preencher o enquadramento com a superfície. A iluminação oblíqua revela textura e defeitos.",
  },
  {
    icon: "💧",
    accept: [
      "Cobertura — telhas, ardósias, cumeeira, rufos/flashings, chaminé",
      "Caleiras e tubos de queda — juntas, obstruções, marcas de transbordo",
      "Parede exterior — reboco fissurado, rejuntamento degradado, desagregação (spalling)",
      "Solo junto à base da parede — solo acima do DPC, pavimento a fazer ponte",
    ],
    reject: [
      "Imagens interiores sem ligação a defeito exterior",
      "Objetos/itens sem tecido construtivo visível",
      "Pessoas ou veículos",
    ],
    tip: "Fotografar as caleiras durante ou logo após a chuva, para melhor evidência de transbordo.",
  },
  {
    icon: "🦠",
    accept: [
      "Parede interior — zona inferior, superior ou canto",
      "Tecto — manchas, bolor ou danos no reboco",
      "Junta entre pavimento e rodapé",
      "Atrás do mobiliário — bolor na superfície da parede",
    ],
    reject: [
      "Imagens exteriores nesta secção interior",
      "Objetos ou mobiliário sem parede/teto/pavimento visíveis",
      "Áreas exteriores",
    ],
    tip: "Afaste o mobiliário das paredes. Use uma lanterna para cantos escuros.",
  },
  {
    icon: "📏",
    accept: [
      "Medidor de humidade na parede — mostrar o ecrã do equipamento",
      "Ecrã da câmara térmica mostrando zonas frias ou anomalias",
      "Higrómetro ou medidor de HR com leitura visível",
      "Manchas com referência de escala — fita métrica ou cartão",
    ],
    reject: [
      "Imagens gerais da divisão sem equipamento ou humidade visível",
      "Equipamento guardado em bolsa/estojo, sem uso",
      "Imagens exteriores sem evidência de humidade",
    ],
    tip: "Fotografar o ecrã do medidor e o ponto de contacto na parede no mesmo enquadramento.",
  },
  {
    icon: "🌬️",
    accept: [
      "Ventilador/exaustor — cozinha, casa de banho, ou respiro na caixilharia enquadrado",
      "Air brick — condição e afastamento em relação ao solo",
      "Condensação em janelas, tubos frios ou superfícies das paredes",
      "Fontes de humidade — secar roupa no interior, cozinha com vapor",
    ],
    reject: [
      "Paisagem exterior sem elementos de ventilação",
      "Documentos ou desenhos",
      "Pessoas sem contexto de ventilação",
    ],
    tip: "Fotografar as exaustões da casa de banho em plano próximo para mostrar se a grelha está obstruída.",
  },
  {
    icon: "🧩",
    accept: [
      "Marcas de maré nas paredes inferiores — bandas horizontais",
      "Mancha de humidade localizada junto a janela ou ligação à cobertura",
      "Mancha no tecto por baixo de casa de banho ou zona húmida",
      "Depósitos de sais em baixo nível com padrão em leque/taparedo",
    ],
    reject: [
      "Imagens sem evidência visível de humidade",
      "Objetos não relacionados ou áreas exteriores",
      "Imagens exteriores genéricas sem defeito",
    ],
    tip: "Fotografar as marcas de maré a partir do nível do chão para captar a altura e a forma completas.",
  },
  {
    icon: "🪵",
    accept: [
      "Soalho/tábuas — superfície, levantamento, manchas",
      "Rodapé — condição da base, destacamento da parede",
      "Alcatifa/vinil levantado mostrando a subcapa ou o pavimento por baixo",
      "Viga exposta ou madeira estrutural — apodrecimento ou crescimento fúngico",
    ],
    reject: [
      "Apenas paredes sem madeira ou material de pavimento em enquadramento",
      "Imagens exteriores sem elementos de madeira",
      "Apenas equipamento ou objetos",
    ],
    tip: "Levantar cantos da alcatifa junto às paredes para mostrar o que está por baixo. Incluir a junta com a parede.",
  },
  {
    icon: "🏗️",
    accept: [
      "Fissuras na parede — mostrar a extensão vertical completa",
      "Fissura diagonal nos cantos das janelas",
      "Fissuração em escada na alvenaria de tijolo",
      "Chaminé — falta de remate/tampa, manchas, falha do flashing",
    ],
    reject: [
      "Paredes sem fissuras ou elementos estruturais",
      "Pessoas ou documentos sem tecido construtivo",
      "Apenas equipamento",
    ],
    tip: "Colocar uma moeda no enquadramento para dar escala à largura da fissura. Captar de cima a baixo.",
  },
  {
    icon: "🛠️",
    accept: [
      "Furos de injeção de DPC químico no curso de argamassa",
      "Reboco impermeável ou tanking — textura e estado",
      "Borda de membrana visível na junta parede/pavimento",
      "Secções remendadas ou rejuntadas — contraste de cor visível",
    ],
    reject: [
      "Imagens gerais da divisão sem evidência de tratamento anterior",
      "Superfícies novas não intervencionadas",
      "Apenas pessoas, objetos ou documentos",
    ],
    tip: "Procurar diferenças de cor ou textura no rejuntamento — estas revelam reparações anteriores.",
  },
  {
    icon: "⚠️",
    accept: [
      "Vista ampla de grande cobertura de bolor — captar a extensão total",
      "Manchas estruturais extensas em várias superfícies",
      "Risco de queda de tecto ou acumulação de água no chão — vista completa da divisão",
      "Qualquer imagem que mostre a área total afetada",
    ],
    reject: [
      "Pequenas marcas sem defeito claro",
      "Apenas pessoas ou exterior sem defeito",
      "Documentos administrativos",
    ],
    tip: "Recuar e incluir uma ombreira de porta ou mobiliário para escala.",
  },
  {
    icon: "🔎",
    accept: [
      "Medidor de humidade em contacto com a parede ou pavimento",
      "Operador da câmara térmica a fotografar uma superfície",
      "Tampa de acesso ao subpavimento aberta para inspeção das vigas",
      "Borescópio num furo de acesso perfurado",
    ],
    reject: [
      "Equipamento guardado/na caixa — sem uso",
      "Fotos de produto sem contexto construtivo",
      "Pessoas sem equipamento ou tecido construtivo",
    ],
    tip: "Captar o medidor em contacto com a superfície e a leitura do ecrã no mesmo enquadramento.",
  },
  {
    icon: "🛡️",
    accept: [
      "Injeção de DPC nova ou instalação de membrana em curso",
      "Rejuntamento concluído — argamassa nova visível",
      "Ventilador exaustor ou unidade de ventilação instalada",
      "Nível do solo rebaixado — solo removido junto à base da parede",
    ],
    reject: [
      "Documentos de garantia ou certificados",
      "Superfícies não intervencionadas sem atividade de remediação",
      "Exterior genérico sem trabalho de remediação",
    ],
    tip: "Fotografar do mesmo ângulo das fotos tiradas antes dos trabalhos, na fase anterior do inquérito.",
  },
];

function clampSectionStep(stepIndex: number) {
  if (!Number.isFinite(stepIndex)) return 0;
  return Math.max(0, Math.min(12, Math.floor(stepIndex)));
}

export default function SectionPhotoGuide({ step }: { step: number }) {
  const locale = useLocale();
  const lang = locale as AppLang;
  const t = useTranslations();
  const safeStep = clampSectionStep(step);
  const entry = useMemo(() => {
    const list = lang === "pt" ? SECTION_PHOTO_GUIDE_PT : SECTION_PHOTO_GUIDE_EN;
    return list[safeStep] ?? list[0];
  }, [lang, safeStep]);

  // Collapsed state is remembered per section index.
  const [collapsedByStep, setCollapsedByStep] = useState<Record<number, boolean>>({});
  const isCollapsed = collapsedByStep[safeStep] ?? false;

  const baseScenes = useMemo(() => {
    return SECTION_SCENE_CARDS[safeStep] ?? SECTION_SCENE_CARDS[0];
  }, [safeStep]);

  // The scenes (thumbnail labels + lightbox explanations) are hard-coded in English in
  // `SectionPhotoGuideScenes.tsx`, so we translate them on demand when the user switches
  // header language to Portuguese.
  const translatedScenesCacheRef = useRef<Record<string, PhotoGuideSceneCard[]>>({});
  const [scenes, setScenes] = useState<PhotoGuideSceneCard[]>(baseScenes);
  useEffect(() => {
    setScenes(baseScenes);
  }, [baseScenes]);

  useEffect(() => {
    let cancelled = false;

    // Default language (EN) uses the base strings directly.
    if (lang === "en") {
      setScenes(baseScenes);
      return;
    }

    const targetLang = lang as AppLang;
    const cacheKey = `${safeStep}:${targetLang}`;
    const cached = translatedScenesCacheRef.current[cacheKey];
    if (cached) {
      setScenes(cached);
      return;
    }

    const translateScenes = async () => {
      const texts: string[] = [];
      baseScenes.forEach((s) => {
        texts.push(s.label, s.lightboxTitle, s.description);
      });

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLang, texts }),
      });

      const json = (await res.json()) as { translations?: string[]; error?: string };
      if (!res.ok || !Array.isArray(json.translations)) {
        throw new Error(json.error || "Translation failed.");
      }

      const out: PhotoGuideSceneCard[] = baseScenes.map((s, sceneIdx) => {
        const base = sceneIdx * 3;
        return {
          ...s,
          label: json.translations?.[base] ?? s.label,
          lightboxTitle: json.translations?.[base + 1] ?? s.lightboxTitle,
          description: json.translations?.[base + 2] ?? s.description,
        };
      });

      translatedScenesCacheRef.current[cacheKey] = out;
      if (!cancelled) setScenes(out);
    };

    void translateScenes().catch(() => {
      // Keep baseScenes if translation fails.
    });

    return () => {
      cancelled = true;
    };
  }, [lang, safeStep, baseScenes]);

  const [selectedSceneIdByStep, setSelectedSceneIdByStep] = useState<
    Record<number, string | null>
  >({});

  const selectedSceneId = selectedSceneIdByStep[safeStep] ?? null;

  const selectedScene = useMemo(() => {
    if (!selectedSceneId) return null;
    return scenes.find((s) => s.id === selectedSceneId) ?? null;
  }, [scenes, selectedSceneId]);

  const bodyMaxHeightPx = isCollapsed ? 0 : selectedScene ? 980 : 560;

  return (
    <div className="ds-photo-guide">
      <Accordion.Root
        type="single"
        collapsible
        value={isCollapsed ? "" : "guide"}
        onValueChange={(value) => {
          setCollapsedByStep((prev) => ({
            ...prev,
            [safeStep]: !(value === "guide"),
          }));
        }}
      >
        <Accordion.Item value="guide">
          <div className="ds-photo-guide-top">
            <div className="ds-photo-guide-title">
              <span className="ds-photo-guide-title-text">{t("photoGuideTitle")}</span>
            </div>

            <Accordion.Header>
              <Accordion.Trigger className="ds-photo-guide-toggle" aria-expanded={!isCollapsed}>
                <span className="ds-photo-guide-toggle-chevron" aria-hidden>
                  {isCollapsed ? "▸" : "▾"}
                </span>
                <span className="ds-photo-guide-toggle-label">
                  {isCollapsed ? t("photoGuideShow") : t("photoGuideHide")}
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
          </div>

          <Accordion.Content
            id={`ds-photo-guide-body-${safeStep}`}
            className="ds-photo-guide-body"
            style={{ maxHeight: bodyMaxHeightPx }}
            aria-hidden={isCollapsed}
            forceMount
          >
            <div className="ds-photo-guide-thumb-gallery">
              <div className="grid grid-cols-3 gap-3 max-[520px]:grid-cols-2">
                {scenes.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    className={[
                      "ds-photo-guide-thumb-card",
                      scene.accepted ? "" : "ds-photo-guide-thumb-card--rejected",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setSelectedSceneIdByStep((prev) => ({
                        ...prev,
                        [safeStep]: scene.id,
                      }))
                    }
                  >
                    <ThumbBadge accepted={scene.accepted} aria-hidden>
                      {scene.accepted ? "✓" : "✕"}
                    </ThumbBadge>
                    <div className="ds-photo-guide-thumb-svg">{scene.svg}</div>
                    <div className="ds-photo-guide-thumb-label">{scene.label}</div>
                  </button>
                ))}
              </div>
              <div className="ds-photo-guide-thumb-help">click any to expand ↓</div>
            </div>

            <Dialog.Root
              open={!!selectedScene}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedSceneIdByStep((prev) => ({
                    ...prev,
                    [safeStep]: null,
                  }));
                }
              }}
            >
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-0 outline-none bg-transparent">
                  {selectedScene ? (
                    <div className="ds-photo-guide-lightbox-inner">
                      <button
                        type="button"
                        className="ds-photo-guide-lightbox-close"
                        aria-label="Close"
                        onClick={() =>
                          setSelectedSceneIdByStep((prev) => ({
                            ...prev,
                            [safeStep]: null,
                          }))
                        }
                      >
                        ×
                      </button>
                      <div className="ds-photo-guide-lightbox-svg">{selectedScene.svg}</div>
                      <div className="ds-photo-guide-lightbox-title">{selectedScene.lightboxTitle}</div>
                      <div className="ds-photo-guide-lightbox-desc">{selectedScene.description}</div>
                    </div>
                  ) : null}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1 pt-3">
          <div className="ds-photo-guide-block">
            <div className="ds-photo-guide-heading ds-photo-guide-heading--ok">
              {t("photoGuideAcceptedHeading")}
            </div>
            <ul className="ds-photo-guide-list">
              {entry.accept.map((item, i) => (
                <li key={i}>
                  <span
                    className="ds-photo-guide-mark ds-photo-guide-mark--ok"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ds-photo-guide-block">
            <div className="ds-photo-guide-heading ds-photo-guide-heading--bad">
              {t("photoGuideNotAcceptedHeading")}
            </div>
            <ul className="ds-photo-guide-list">
              {entry.reject.map((item, i) => (
                <li key={i}>
                  <span
                    className="ds-photo-guide-mark ds-photo-guide-mark--bad"
                    aria-hidden
                  >
                    ✕
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ds-photo-guide-tip">
            <div className="ds-photo-guide-tip-heading">{t("photoGuideTipHeading")}</div>
            <div className="ds-photo-guide-tip-text">{entry.tip}</div>
          </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}

