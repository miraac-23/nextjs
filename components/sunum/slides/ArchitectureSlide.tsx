import type { ArchLayer, ArchitectureSlide as Model } from '@/lib/sunum/types'
import {
  BOX_BORDER,
  CONTENT_W,
  SlideHead,
  bodyHeight,
  compactClass,
  textHeight,
  textWidth,
} from './parts'
import type { SlideProps } from './types'

/**
 * Mimari şeması. Kutular CSS ile çizilir — görsel üretimi ya da diyagram
 * kütüphanesi gerekmez (§7) ve PPTX tarafında aynı düzen şekillerle kurulur.
 *
 *  architecture-01 → katman blokları (solda ad, sağda düğümler).
 *  architecture-02 → yukarıdan aşağı kutu-çizgi akışı, katmanlar okla bağlanır.
 *  architecture-03 → yan yana katman sütunları (servis haritası görünümü).
 *
 * Düğümler satır sarıyor; kaç satır sardığı yükseklik kestirimine giriyor.
 * Eskiden bu hesaplanmadığı için 5 katman × 6 düğüm slayttan 120px taşıyordu.
 */

/** Katman bloğu kademeleri — CSS `.sn-layers` değerleriyle aynı olmalı. */
const LAYER_TIERS = [
  { padY: 16, padX: 20, name: 17, node: 15, nodePadY: 9, nodePadX: 14, nodeGap: 10, gap: 12, nameW: 210 },
  { padY: 12, padX: 16, name: 15, node: 13, nodePadY: 7, nodePadX: 11, nodeGap: 8, gap: 9, nameW: 180 },
  { padY: 9, padX: 13, name: 14, node: 12, nodePadY: 5, nodePadX: 9, nodeGap: 6, gap: 7, nameW: 160 },
  { padY: 7, padX: 11, name: 13, node: 11, nodePadY: 4, nodePadX: 8, nodeGap: 5, gap: 5, nameW: 140 },
]

type LayerTier = (typeof LAYER_TIERS)[number]

/** Düğüm rozetlerinin verilen genişlikte kaç satır sardığını sayar. */
function nodeRows(nodes: string[], width: number, tier: LayerTier): number {
  let rows = 1
  let used = 0
  for (let i = 0; i < nodes.length; i++) {
    const w = textWidth(nodes[i], tier.node) + tier.nodePadX * 2 + 2
    if (used > 0 && used + tier.nodeGap + w > width) {
      rows += 1
      used = w
    } else {
      used += (used > 0 ? tier.nodeGap : 0) + w
    }
  }
  return rows
}

function nodeBandHeight(nodes: string[], width: number, tier: LayerTier): number {
  const rowH = tier.nodePadY * 2 + Math.round(tier.node * 1.25) + 2
  const rows = nodeRows(nodes, width, tier)
  return rows * rowH + (rows - 1) * tier.nodeGap
}

function layersHeight(layers: ArchLayer[], tier: LayerTier): number {
  const nodeW = CONTENT_W - tier.padX * 2 - tier.nameW - 18
  let total = tier.gap * Math.max(0, layers.length - 1)
  for (let i = 0; i < layers.length; i++) {
    const nameH = textHeight(layers[i].name, tier.nameW, tier.name, 1.3)
    total += BOX_BORDER + tier.padY * 2 + Math.max(nameH, nodeBandHeight(layers[i].nodes, nodeW, tier))
  }
  return total
}

/** Akış şeması (architecture-02): blok + aradaki bağlaç. */
const FLOW_W = 760

/**
 * Akış kutusu iki biçimde çizilir: normal kademelerde ad ÜSTTE, sıkı
 * kademelerde (index ≥ 2) ad SOLDA. Satır biçimi 5 katmanlı bir akışta ~100px
 * kazandırıyor ve CSS tarafındaki `.sn-flow.sn-compact-2` kuralıyla eşleşiyor.
 */
function flowHeight(layers: ArchLayer[], tier: LayerTier, index: number): number {
  const row = index >= 2
  const nodeW = FLOW_W - tier.padX * 2 - (row ? tier.nameW + 16 : 0)
  // Bağlaç ve kutu içi boşluk da kademeyle birlikte daralır; sabit 8px'lik
  // boşluklar 5 katmanlı bir akışta 50px fazladan yer kaplıyordu.
  const link = Math.max(12, tier.gap)
  let total = link * Math.max(0, layers.length - 1)
  for (let i = 0; i < layers.length; i++) {
    const nameH = textHeight(layers[i].name, row ? tier.nameW : nodeW, tier.name, 1.3)
    const band = nodeBandHeight(layers[i].nodes, nodeW, tier)
    total += BOX_BORDER + tier.padY * 2 + (row ? Math.max(nameH, band) : nameH + tier.nodeGap + band)
  }
  return total
}

/** Sütun düzeni (architecture-03): her katman bir sütun, düğümler alt alta. */
function columnsHeight(layers: ArchLayer[], tier: LayerTier): number {
  const cols = Math.max(layers.length, 1)
  const colW = (CONTENT_W - tier.gap * (cols - 1)) / cols
  const inner = colW - tier.padX * 2
  const rowH = tier.nodePadY * 2 + Math.round(tier.node * 1.25) + 2
  let tallest = 0
  for (let i = 0; i < layers.length; i++) {
    const nodes = layers[i].nodes.length
    const h =
      BOX_BORDER +
      tier.padY * 2 +
      textHeight(layers[i].name, inner, tier.name, 1.3) +
      10 +
      nodes * rowH +
      Math.max(0, nodes - 1) * tier.nodeGap
    if (h > tallest) tallest = h
  }
  return tallest
}

export default function ArchitectureSlide({ slide }: SlideProps<Model>) {
  const { layers, note } = slide.content
  const available = bodyHeight(slide)
  // Not satırı gövdenin içinde; bloklara kalan alandan düşülmezse üstüne biner.
  const noteH = note ? 14 + textHeight(note, CONTENT_W, 14, 1.4) : 0
  const stackAvail = Math.max(110, available - noteH)

  /* --------------------------- architecture-02: akış --------------------------- */
  if (slide.template === 'architecture-02') {
    const tier = compactClass(
      LAYER_TIERS.map((t, i) => flowHeight(layers, t, i)),
      stackAvail,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className={`sn-flow${tier}`}>
            {layers.map((layer, i) => (
              <div className="sn-flow-item" key={i}>
                <div className="sn-flow-box">
                  <div className="sn-layer-name">{layer.name}</div>
                  <div className="sn-nodes">
                    {layer.nodes.map((node, j) => (
                      <span className="sn-node" key={j}>
                        {node}
                      </span>
                    ))}
                  </div>
                </div>
                {i < layers.length - 1 ? <span className="sn-flow-link" aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
          {note ? <p className="sn-caption">{note}</p> : null}
        </div>
      </>
    )
  }

  /* ------------------------- architecture-03: sütunlar ------------------------- */
  if (slide.template === 'architecture-03') {
    const tier = compactClass(
      LAYER_TIERS.map((t) => columnsHeight(layers, t)),
      stackAvail,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div
            className={`sn-layer-cols${tier}`}
            style={{ gridTemplateColumns: `repeat(${Math.max(layers.length, 1)}, minmax(0, 1fr))` }}
          >
            {layers.map((layer, i) => (
              <div className="sn-layer-col" key={i}>
                <div className="sn-layer-name">{layer.name}</div>
                <div className="sn-nodes">
                  {layer.nodes.map((node, j) => (
                    <span className="sn-node" key={j}>
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {note ? <p className="sn-caption">{note}</p> : null}
        </div>
      </>
    )
  }

  const tier = compactClass(
    LAYER_TIERS.map((t) => layersHeight(layers, t)),
    stackAvail,
  )

  return (
    <>
      <SlideHead slide={slide} />
      <div className="sn-body">
        <div className={`sn-layers${tier}`}>
          {layers.map((layer, i) => (
            <div className="sn-layer" key={i}>
              <div className="sn-layer-name">{layer.name}</div>
              <div className="sn-nodes">
                {layer.nodes.map((node, j) => (
                  <span className="sn-node" key={j}>
                    {node}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {note ? <p className="sn-caption">{note}</p> : null}
      </div>
    </>
  )
}
