/** Filtros SVG leves para refração óptica (CSS backdrop-filter / filter). Sem WebGL. */
export function FiltrosVidroSvg() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', overflow: 'hidden', clipPath: 'inset(50%)' }}
    >
      <defs>
        <filter
          id="jemani-lente"
          x="-8%"
          y="-8%"
          width="116%"
          height="116%"
          colorInterpolationFilters="sRGB"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.05"
            numOctaves="2"
            seed="7"
            result="ruido"
          />
          <feGaussianBlur in="ruido" stdDeviation="0.6" result="suave" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="suave"
            scale="7"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter
          id="jemani-lente-fina"
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
          colorInterpolationFilters="sRGB"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.03 0.08"
            numOctaves="2"
            seed="3"
            result="ruido"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="ruido"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
