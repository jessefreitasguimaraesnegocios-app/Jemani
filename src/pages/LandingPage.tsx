import { useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown, ArrowRight, ArrowUpRight, BriefcaseBusiness, ChevronDown,
  ChevronLeft, ChevronRight, Plane, Smartphone, Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { operadorasTransporteExecutivo } from '@/data/operadorasTransporteExecutivo'
import { usarIdioma } from '@/i18n/usarIdioma'
import './LandingPage.css'

const fleet = [
  ['Executive', '/frota/classe-s.jpg'],
  ['Black', '/frota/lucid.jpg'],
  ['SUV', '/frota/escalade.jpg'],
  ['Luxe', '/frota/volvo.jpg'],
  ['Van', '/frota/sprinter.jpg'],
  ['Charter', '/frota/charter.jpg'],
] as const

const serviceIcons = [Plane, BriefcaseBusiness, Users]
const operatorGroups = Object.entries(operadorasTransporteExecutivo)
const operatorCount = operatorGroups.reduce((total, [, operators]) => total + operators.length, 0)

const copy = {
  'pt-BR': {
    navigation: 'Navegação principal',
    nav: ['Serviços', 'Frota', 'Aplicativo'],
    signIn: 'Entrar',
    service: 'Transporte executivo',
    title: <>Motorista particular<br /><em>com hora marcada.</em></>,
    intro: 'Reserve traslados para aeroportos, compromissos de trabalho e eventos. Escolha o veículo e acompanhe a confirmação pelo celular.',
    book: 'Reservar viagem',
    appLink: 'Baixar o app',
    photo: 'Sedãs, SUVs e vans da frota Jemani',
    services: [
      ['Traslados de aeroporto', 'Embarque e desembarque agendados.'],
      ['Viagens corporativas', 'Transporte para reuniões e compromissos.'],
      ['Grupos e eventos', 'Vans e veículos para grupos maiores.'],
    ],
    fleetTitle: 'Escolha seu veículo',
    fleetIntro: 'Seis categorias, do sedã executivo ao transporte de grupos.',
    fleetDescriptions: ['Sedã executivo', 'Sedã premium', 'SUV executivo', 'Conforto premium', 'Van executiva', 'Transporte para grupos'],
    previous: 'Veículos anteriores',
    next: 'Próximos veículos',
    appTitle: 'Jemani no celular',
    appText: 'Reserve e acompanhe suas viagens pelo aplicativo.',
    android: 'Baixar para Android',
    androidDetail: 'Versão de teste em APK',
    iphone: 'Instalar no iPhone',
    iphoneDetail: 'Adicione pelo Safari',
    iphoneSteps: ['Abra este site no Safari.', 'Toque em Compartilhar.', 'Selecione Adicionar à Tela de Início.'],
    operatorsTitle: 'Operadoras de referência',
    operatorsToggle: 'Ver lista',
    operatorsDescription: 'Seleção independente de serviços de luxo com motorista, com foco em traslados, viagens corporativas e atendimento internacional.',
    regions: { internacional: 'Internacional', americas: 'Américas', europa: 'Europa', asiaPacifico: 'Ásia-Pacífico' },
    rights: '© Jemani. Todos os direitos reservados.',
  },
  en: {
    navigation: 'Main navigation',
    nav: ['Services', 'Fleet', 'App'],
    signIn: 'Sign in',
    service: 'Executive transportation',
    title: <>A private driver,<br /><em>booked ahead.</em></>,
    intro: 'Book airport transfers and rides for meetings or events. Choose your vehicle and track your booking on your phone.',
    book: 'Book a ride',
    appLink: 'Get the app',
    photo: 'Sedans, SUVs and vans from the Jemani fleet',
    services: [
      ['Airport transfers', 'Scheduled airport pickups and drop-offs.'],
      ['Corporate travel', 'Rides for meetings and business appointments.'],
      ['Groups and events', 'Vans and vehicles for larger groups.'],
    ],
    fleetTitle: 'Choose your vehicle',
    fleetIntro: 'Six categories, from executive sedans to group transportation.',
    fleetDescriptions: ['Executive sedan', 'Premium sedan', 'Executive SUV', 'Premium comfort', 'Executive van', 'Group transportation'],
    previous: 'Previous vehicles',
    next: 'Next vehicles',
    appTitle: 'Jemani on your phone',
    appText: 'Book and track your rides in the app.',
    android: 'Download for Android',
    androidDetail: 'Test version in APK format',
    iphone: 'Install on iPhone',
    iphoneDetail: 'Add it from Safari',
    iphoneSteps: ['Open this site in Safari.', 'Tap Share.', 'Select Add to Home Screen.'],
    operatorsTitle: 'Chauffeur companies',
    operatorsToggle: 'View list',
    operatorsDescription: 'An independent selection of luxury chauffeur services, with a focus on transfers, business travel and international coverage.',
    regions: { internacional: 'International', americas: 'Americas', europa: 'Europe', asiaPacifico: 'Asia-Pacific' },
    rights: '© Jemani. All rights reserved.',
  },
  es: {
    navigation: 'Navegación principal',
    nav: ['Servicios', 'Flota', 'Aplicación'],
    signIn: 'Iniciar sesión',
    service: 'Transporte ejecutivo',
    title: <>Conductor privado<br /><em>a la hora acordada.</em></>,
    intro: 'Reserva traslados al aeropuerto y viajes para reuniones o eventos. Elige tu vehículo y sigue la confirmación desde el móvil.',
    book: 'Reservar viaje',
    appLink: 'Descargar la app',
    photo: 'Sedanes, SUV y vans de la flota Jemani',
    services: [
      ['Traslados al aeropuerto', 'Recogidas y llegadas programadas.'],
      ['Viajes corporativos', 'Transporte para reuniones y citas de trabajo.'],
      ['Grupos y eventos', 'Vans y vehículos para grupos grandes.'],
    ],
    fleetTitle: 'Elige tu vehículo',
    fleetIntro: 'Seis categorías, desde sedanes ejecutivos hasta transporte para grupos.',
    fleetDescriptions: ['Sedán ejecutivo', 'Sedán prémium', 'SUV ejecutivo', 'Confort prémium', 'Van ejecutiva', 'Transporte para grupos'],
    previous: 'Vehículos anteriores',
    next: 'Siguientes vehículos',
    appTitle: 'Jemani en tu móvil',
    appText: 'Reserva y sigue tus viajes desde la aplicación.',
    android: 'Descargar para Android',
    androidDetail: 'Versión de prueba en formato APK',
    iphone: 'Instalar en iPhone',
    iphoneDetail: 'Añádela desde Safari',
    iphoneSteps: ['Abre este sitio en Safari.', 'Toca Compartir.', 'Elige Agregar a pantalla de inicio.'],
    operatorsTitle: 'Operadores de referencia',
    operatorsToggle: 'Ver lista',
    operatorsDescription: 'Selección independiente de servicios de lujo con conductor, centrada en traslados, viajes corporativos y cobertura internacional.',
    regions: { internacional: 'Internacional', americas: 'Américas', europa: 'Europa', asiaPacifico: 'Asia-Pacífico' },
    rights: '© Jemani. Todos los derechos reservados.',
  },
} as const

export function LandingPage() {
  const { idioma } = usarIdioma()
  const { usuario } = useAuth()
  const content = copy[idioma]
  const bookingPath = usuario?.tipo === 'cliente' ? '/app/reservar' : '/cadastrar'
  const fleetTrack = useRef<HTMLUListElement>(null)

  function scrollFleet(direction: -1 | 1) {
    const track = fleetTrack.current
    const first = track?.children[0] as HTMLElement | undefined
    const second = track?.children[1] as HTMLElement | undefined
    if (!track || !first || !second) return
    track.scrollBy({ left: direction * (second.offsetLeft - first.offsetLeft) })
  }

  return (
    <div className="jemani-landing" id="inicio">
      <header className="jemani-shell jemani-header">
        <a className="jemani-brand" href="#inicio">
          <span className="jemani-brand-mark" aria-hidden="true">J</span>
          <span>Jemani<small>Executive Mobility</small></span>
        </a>
        <nav className="jemani-nav" aria-label={content.navigation}>
          <a href="#experiencia">{content.nav[0]}</a>
          <a href="#frota">{content.nav[1]}</a>
          <a href="#app">{content.nav[2]}</a>
        </nav>
        <Link className="jemani-sign-in" to="/entrar">{content.signIn}<ArrowUpRight size={15} aria-hidden="true" /></Link>
      </header>

      <main className="jemani-shell jemani-main">
        <section className="jemani-hero" aria-labelledby="jemani-title">
          <div className="jemani-hero-copy">
            <p className="jemani-service-label">{content.service}</p>
            <h1 id="jemani-title">{content.title}</h1>
            <p className="jemani-intro">{content.intro}</p>
            <div className="jemani-hero-actions">
              <Link className="jemani-button jemani-button-primary" to={bookingPath}>
                {content.book}<ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a className="jemani-button jemani-button-secondary" href="#app">
                {content.appLink}<ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="jemani-hero-image">
            <img src="/images/jemani-fleet-hero.jpg" alt={content.photo} fetchPriority="high" />
          </div>
        </section>

        <ul className="jemani-services" id="experiencia" aria-label={content.nav[0]}>
          {content.services.map(([title, description], i) => {
            const Icon = serviceIcons[i]
            return (
              <li key={title}>
                <Icon size={21} aria-hidden="true" />
                <div><strong>{title}</strong><p>{description}</p></div>
              </li>
            )
          })}
        </ul>

        <section className="jemani-fleet" id="frota" aria-labelledby="jemani-fleet-title">
          <div className="jemani-section-head">
            <div>
              <h2 id="jemani-fleet-title">{content.fleetTitle}</h2>
              <p>{content.fleetIntro}</p>
            </div>
            <div className="jemani-fleet-controls">
              <button type="button" aria-label={content.previous} aria-controls="jemani-fleet-track" onClick={() => scrollFleet(-1)}>
                <ChevronLeft size={19} aria-hidden="true" />
              </button>
              <button type="button" aria-label={content.next} aria-controls="jemani-fleet-track" onClick={() => scrollFleet(1)}>
                <ChevronRight size={19} aria-hidden="true" />
              </button>
            </div>
          </div>
          <ul className="jemani-fleet-track" id="jemani-fleet-track" ref={fleetTrack}>
            {fleet.map(([name, image], i) => (
              <li key={name}>
                <Link className="jemani-vehicle" to={bookingPath} aria-label={content.book + ' · Jemani ' + name}>
                  <img src={image} alt="" loading="lazy" />
                  <div className="jemani-vehicle-caption">
                    <div><h3>Jemani {name}</h3><p>{content.fleetDescriptions[i]}</p></div>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="jemani-app" id="app" aria-labelledby="jemani-app-title">
          <div className="jemani-app-heading">
            <span className="jemani-app-icon"><Smartphone size={24} aria-hidden="true" /></span>
            <div><h2 id="jemani-app-title">{content.appTitle}</h2><p>{content.appText}</p></div>
          </div>
          <div className="jemani-platforms">
            <a className="jemani-platform jemani-platform-android" href="/downloads/jemani-android.apk" download="Jemani-Android.apk">
              <span><strong>{content.android}</strong><small>{content.androidDetail}</small></span>
              <ArrowDown size={18} aria-hidden="true" />
            </a>
            <details className="jemani-iphone">
              <summary className="jemani-platform">
                <span><strong>{content.iphone}</strong><small>{content.iphoneDetail}</small></span>
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <ol>{content.iphoneSteps.map((step) => <li key={step}>{step}</li>)}</ol>
            </details>
          </div>
        </section>

        <details className="jemani-operators">
          <summary>
            <h2>{content.operatorsTitle} <span>{operatorCount}</span></h2>
            <span className="jemani-operators-toggle">{content.operatorsToggle}<ChevronDown size={19} aria-hidden="true" /></span>
          </summary>
          <p>{content.operatorsDescription}</p>
          <div className="jemani-operator-groups">
            {operatorGroups.map(([region, operators]) => (
              <div key={region}>
                <h3>{content.regions[region as keyof typeof content.regions]}</h3>
                <ul>
                  {operators.map(([name, url]) => (
                    <li key={name}><a href={url}>{name}<ArrowUpRight size={14} aria-hidden="true" /></a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </main>

      <footer className="jemani-shell jemani-footer">
        <p>{content.rights}</p>
        <Link to={bookingPath}>{content.book}<ArrowRight size={15} aria-hidden="true" /></Link>
      </footer>
    </div>
  )
}
